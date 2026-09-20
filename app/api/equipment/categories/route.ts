import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../src/lib/authorization";
import { db } from "../../../../src/prisma/db";

export async function GET() {
  try {
    const authContext = await requireCurrentContext();

    const categories = await db.orm.public.EquipmentCategory
      .where({
        organizationId: authContext.organization.id,
      })
      .orderBy((category) => category.name.asc())
      .all();

    return NextResponse.json({ categories });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Get equipment categories failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load equipment categories." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 },
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "Category code is required." },
        { status: 400 },
      );
    }

    const existing = await db.orm.public.EquipmentCategory
      .where({
        organizationId: authContext.organization.id,
        code,
      })
      .first();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A category with this code already exists.",
        },
        { status: 409 },
      );
    }

    const category =
      await db.orm.public.EquipmentCategory.create({
        name,
        code,
        description: description || null,
        organizationId: authContext.organization.id,
      });

    return NextResponse.json(
      { category },
      { status: 201 },
    );
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Create equipment category failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to create equipment category." },
      { status: 500 },
    );
  }
}
