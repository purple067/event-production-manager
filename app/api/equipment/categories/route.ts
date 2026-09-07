import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";

export async function GET() {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const categories = await db.orm.public.EquipmentCategory
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((category) => category.name.asc())
    .all();

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

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
        organizationId: context.organization.id,
        code,
      })
      .first();

    if (existing) {
      return NextResponse.json(
        { error: "A category with this code already exists." },
        { status: 409 },
      );
    }

    const category =
      await db.orm.public.EquipmentCategory.create({
        name,
        code,
        description: description || null,
        organizationId: context.organization.id,
      });

    return NextResponse.json(
      { category },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}

