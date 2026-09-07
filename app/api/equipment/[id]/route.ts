import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getEquipmentId(id: string) {
  const equipmentId = Number(id);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return null;
  }

  return equipmentId;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const equipmentId = getEquipmentId(id);

  if (!equipmentId) {
    return NextResponse.json(
      { error: "Invalid equipment ID." },
      { status: 400 },
    );
  }

  const equipment = await db.orm.public.Equipment
    .where({
      id: equipmentId,
      organizationId: context.organization.id,
    })
    .first();

  if (!equipment) {
    return NextResponse.json(
      { error: "Equipment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ equipment });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const equipmentId = getEquipmentId(id);

  if (!equipmentId) {
    return NextResponse.json(
      { error: "Invalid equipment ID." },
      { status: 400 },
    );
  }

  const existingEquipment = await db.orm.public.Equipment
    .where({
      id: equipmentId,
      organizationId: context.organization.id,
    })
    .first();

  if (!existingEquipment) {
    return NextResponse.json(
      { error: "Equipment not found." },
      { status: 404 },
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

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json(
      { error: "Equipment name cannot be empty." },
      { status: 400 },
    );
  }

  if (
    body.quantity !== undefined &&
    (!Number.isInteger(body.quantity) || body.quantity < 1)
  ) {
    return NextResponse.json(
      { error: "Quantity must be a positive integer." },
      { status: 400 },
    );
  }

  if (
    body.status !== undefined &&
    !EQUIPMENT_STATUSES.includes(
      body.status as (typeof EQUIPMENT_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment status." },
      { status: 400 },
    );
  }

  if (
    body.condition !== undefined &&
    !EQUIPMENT_CONDITIONS.includes(
      body.condition as (typeof EQUIPMENT_CONDITIONS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment condition." },
      { status: 400 },
    );
  }

  if (
    body.ownership !== undefined &&
    !EQUIPMENT_OWNERSHIPS.includes(
      body.ownership as (typeof EQUIPMENT_OWNERSHIPS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Invalid equipment ownership." },
      { status: 400 },
    );
  }

  if (body.categoryId !== undefined) {
    if (
      !Number.isInteger(body.categoryId) ||
      body.categoryId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 },
      );
    }

    const category = await db.orm.public.EquipmentCategory
      .where({
        id: body.categoryId,
        organizationId: context.organization.id,
      })
      .first();

    if (!category) {
      return NextResponse.json(
        { error: "Equipment category not found." },
        { status: 404 },
      );
    }
  }

  const equipment = await db.orm.public.Equipment
    .where({
      id: equipmentId,
      organizationId: context.organization.id,
    })
    .update({
      name:
        body.name !== undefined
          ? body.name.trim()
          : undefined,
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : undefined,
      model:
        body.model !== undefined
          ? body.model?.trim() || null
          : undefined,
      manufacturer:
        body.manufacturer !== undefined
          ? body.manufacturer?.trim() || null
          : undefined,
      serialNumber:
        body.serialNumber !== undefined
          ? body.serialNumber?.trim() || null
          : undefined,
      assetNumber:
        body.assetNumber !== undefined
          ? body.assetNumber?.trim() || null
          : undefined,
      quantity:
        body.quantity !== undefined
          ? body.quantity
          : undefined,
      status:
        body.status !== undefined
          ? body.status as (typeof EQUIPMENT_STATUSES)[number]
          : undefined,
      condition:
        body.condition !== undefined
          ? body.condition as (typeof EQUIPMENT_CONDITIONS)[number]
          : undefined,
      ownership:
        body.ownership !== undefined
          ? body.ownership as (typeof EQUIPMENT_OWNERSHIPS)[number]
          : undefined,
      purchaseDate:
        body.purchaseDate !== undefined
          ? body.purchaseDate
            ? new Date(body.purchaseDate).toISOString()
            : null
          : undefined,
      purchaseCost:
        body.purchaseCost !== undefined
          ? body.purchaseCost !== null
            ? String(body.purchaseCost)
            : null
          : undefined,
      notes:
        body.notes !== undefined
          ? body.notes?.trim() || null
          : undefined,
      categoryId:
        body.categoryId !== undefined
          ? body.categoryId
          : undefined,
    });

  if (!equipment) {
    return NextResponse.json(
      { error: "Equipment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ equipment });
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const equipmentId = getEquipmentId(id);

  if (!equipmentId) {
    return NextResponse.json(
      { error: "Invalid equipment ID." },
      { status: 400 },
    );
  }

  const equipment = await db.orm.public.Equipment
    .where({
      id: equipmentId,
      organizationId: context.organization.id,
    })
    .first();

  if (!equipment) {
    return NextResponse.json(
      { error: "Equipment not found." },
      { status: 404 },
    );
  }

  const assignments = await db.orm.public.EquipmentAssignment
    .where({
      equipmentId,
    })
    .all();

  if (assignments.length > 0) {
    return NextResponse.json(
      {
        error:
          "Equipment cannot be deleted because it has event assignments.",
      },
      { status: 409 },
    );
  }

  const deleted = await db.orm.public.Equipment
    .where({
      id: equipmentId,
      organizationId: context.organization.id,
    })
    .delete();

  if (!deleted) {
    return NextResponse.json(
      { error: "Equipment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
  });
}