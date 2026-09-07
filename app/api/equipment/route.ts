import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";

const EQUIPMENT_STATUSES = [
  "AVAILABLE",
  "IN_USE",
  "RESERVED",
  "MAINTENANCE",
  "DAMAGED",
  "LOST",
  "RETIRED",
] as const;

const EQUIPMENT_CONDITIONS = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "NON_FUNCTIONAL",
] as const;

const EQUIPMENT_OWNERSHIPS = [
  "OWNED",
  "RENTED",
  "LEASED",
  "CLIENT_PROVIDED",
  "VENDOR_PROVIDED",
] as const;

export async function GET() {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const equipment = await db.orm.public.Equipment
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((item) => item.name.asc())
    .all();

  return NextResponse.json({ equipment });
}

export async function POST(request: Request) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: {
    name?: string;
    description?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    serialNumber?: string | null;
    assetNumber?: string | null;
    quantity?: number;
    status?: string;
    condition?: string;
    ownership?: string;
    purchaseDate?: string | null;
    purchaseCost?: number | string | null;
    notes?: string | null;
    categoryId?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  const categoryId = body.categoryId;

  if (!name) {
    return NextResponse.json(
      { error: "Equipment name is required." },
      { status: 400 },
    );
  }

  if (
    categoryId === undefined ||
    !Number.isInteger(categoryId) ||
    categoryId <= 0
  ) {
    return NextResponse.json(
      { error: "A valid category is required." },
      { status: 400 },
    );
  }

  const quantity = body.quantity ?? 1;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json(
      { error: "Quantity must be a positive integer." },
      { status: 400 },
    );
  }

  const status = body.status ?? "AVAILABLE";
  const condition = body.condition ?? "GOOD";
  const ownership = body.ownership ?? "OWNED";

  if (
    !EQUIPMENT_STATUSES.includes(
      status as (typeof EQUIPMENT_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment status." },
      { status: 400 },
    );
  }

  if (
    !EQUIPMENT_CONDITIONS.includes(
      condition as (typeof EQUIPMENT_CONDITIONS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment condition." },
      { status: 400 },
    );
  }

  if (
    !EQUIPMENT_OWNERSHIPS.includes(
      ownership as (typeof EQUIPMENT_OWNERSHIPS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment ownership." },
      { status: 400 },
    );
  }

  const category = await db.orm.public.EquipmentCategory
    .where({
      id: categoryId,
      organizationId: context.organization.id,
    })
    .first();

  if (!category) {
    return NextResponse.json(
      { error: "Equipment category not found." },
      { status: 404 },
    );
  }

  const equipment = await db.orm.public.Equipment.create({
    name,
    description: body.description?.trim() || null,
    model: body.model?.trim() || null,
    manufacturer: body.manufacturer?.trim() || null,
    serialNumber: body.serialNumber?.trim() || null,
    assetNumber: body.assetNumber?.trim() || null,
    quantity,
    status:
      status as (typeof EQUIPMENT_STATUSES)[number],
    condition:
      condition as (typeof EQUIPMENT_CONDITIONS)[number],
    ownership:
      ownership as (typeof EQUIPMENT_OWNERSHIPS)[number],
    purchaseDate: body.purchaseDate
      ? new Date(body.purchaseDate).toISOString()
      : null,
    purchaseCost:
      body.purchaseCost !== undefined &&
      body.purchaseCost !== null
        ? String(body.purchaseCost)
        : null,
    notes: body.notes?.trim() || null,
    organizationId: context.organization.id,
    categoryId,
  });

  return NextResponse.json(
    { equipment },
    { status: 201 },
  );
}