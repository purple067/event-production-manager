import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getCategory(id: number, organizationId: number) {
  return db.orm.public.EquipmentCategory
    .where({
      id,
      organizationId,
    })
    .first();
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const session = await getCurrentContext();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid category ID." },
      { status: 400 },
    );
  }

  const category = await getCategory(
    id,
    session.organization.id,
  );

  if (!category) {
    return NextResponse.json(
      { error: "Category not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ category });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const session = await getCurrentContext();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid category ID." },
      { status: 400 },
    );
  }

  const category = await getCategory(
    id,
    session.organization.id,
  );

  if (!category) {
    return NextResponse.json(
      { error: "Category not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

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
            organizationId: session.organization.id,
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
          organizationId: session.organization.id,
        })
        .update(data);

    return NextResponse.json({
      category: updated,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const session = await getCurrentContext();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid category ID." },
      { status: 400 },
    );
  }

  const category = await getCategory(
    id,
    session.organization.id,
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
        organizationId: session.organization.id,
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
      organizationId: session.organization.id,
    })
    .delete();

  return NextResponse.json({
    success: true,
  });
}
