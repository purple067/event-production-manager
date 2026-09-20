import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../src/lib/authorization";
import { db } from "../../../../../src/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getCategory(
  id: number,
  organizationId: number,
) {
  return db.orm.public.EquipmentCategory
    .where({
      id,
      organizationId,
    })
    .first();
}

function getCategoryId(id: string) {
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return categoryId;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const authContext = await requireCurrentContext();

    const { id: idParam } = await context.params;
    const id = getCategoryId(idParam);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid category ID." },
        { status: 400 },
      );
    }

    const category = await getCategory(
      id,
      authContext.organization.id,
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Get equipment category failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load equipment category." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

    const { id: idParam } = await context.params;
    const id = getCategoryId(idParam);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid category ID." },
        { status: 400 },
      );
    }

    const category = await getCategory(
      id,
      authContext.organization.id,
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    let body: {
      name?: unknown;
      code?: unknown;
      description?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const data: {
      name?: string;
      code?: string;
      description?: string | null;
    } = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim()
      ) {
        return NextResponse.json(
          { error: "Category name cannot be empty." },
          { status: 400 },
        );
      }

      data.name = body.name.trim();
    }

    if (body.code !== undefined) {
      if (
        typeof body.code !== "string" ||
        !body.code.trim()
      ) {
        return NextResponse.json(
          { error: "Category code cannot be empty." },
          { status: 400 },
        );
      }

      data.code = body.code.trim().toUpperCase();

      const duplicate =
        await db.orm.public.EquipmentCategory
          .where({
            organizationId: authContext.organization.id,
            code: data.code,
          })
          .first();

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          {
            error:
              "A category with this code already exists.",
          },
          { status: 409 },
        );
      }
    }

    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    const updated =
      await db.orm.public.EquipmentCategory
        .where({
          id,
          organizationId: authContext.organization.id,
        })
        .update(data);

    return NextResponse.json({
      category: updated,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Update equipment category failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to update equipment category." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
    );

    const { id: idParam } = await context.params;
    const id = getCategoryId(idParam);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid category ID." },
        { status: 400 },
      );
    }

    const category = await getCategory(
      id,
      authContext.organization.id,
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    const equipment =
      await db.orm.public.Equipment
        .where({
          categoryId: id,
          organizationId: authContext.organization.id,
        })
        .first();

    if (equipment) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this category because equipment is assigned to it.",
        },
        { status: 409 },
      );
    }

    await db.orm.public.EquipmentCategory
      .where({
        id,
        organizationId: authContext.organization.id,
      })
      .delete();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Delete equipment category failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to delete equipment category." },
      { status: 500 },
    );
  }
}
