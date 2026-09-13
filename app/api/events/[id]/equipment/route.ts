import { NextResponse } from "next/server";

import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

const ASSIGNMENT_STATUSES = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const RESERVING_STATUSES = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
];

function getEventId(params: { id: string }) {
  const eventId = Number(params.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return null;
  }

  return eventId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const eventId = getEventId(await params);

  if (!eventId) {
    return NextResponse.json(
      { error: "Invalid event ID." },
      { status: 400 },
    );
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found." },
      { status: 404 },
    );
  }

  const assignments = await db.orm.public.EquipmentAssignment
    .where({
      eventId,
    })
    .orderBy((assignment) => assignment.id.desc())
    .all();

  return NextResponse.json({ assignments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const eventId = getEventId(await params);

  if (!eventId) {
    return NextResponse.json(
      { error: "Invalid event ID." },
      { status: 400 },
    );
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    const equipmentId = Number(body.equipmentId);

    const departmentId =
      body.departmentId === null ||
      body.departmentId === undefined ||
      body.departmentId === ""
        ? null
        : Number(body.departmentId);

    const quantity = Number(body.quantity ?? 1);

    const status =
      typeof body.status === "string"
        ? body.status
        : "PLANNED";

    const allocatedAt =
      typeof body.allocatedAt === "string" &&
      body.allocatedAt.trim()
        ? body.allocatedAt
        : null;

    const returnedAt =
      typeof body.returnedAt === "string" &&
      body.returnedAt.trim()
        ? body.returnedAt
        : null;

    const allocatedDate = allocatedAt
      ? new Date(allocatedAt)
      : null;

    const returnedDate = returnedAt
      ? new Date(returnedAt)
      : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
      return NextResponse.json(
        { error: "Valid equipment is required." },
        { status: 400 },
      );
    }

    if (
      departmentId !== null &&
      (!Number.isInteger(departmentId) || departmentId <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid department." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive integer." },
        { status: 400 },
      );
    }

    if (!ASSIGNMENT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid assignment status." },
        { status: 400 },
      );
    }

    /*
     * New equipment allocations must enter through the
     * planning/confirmation lifecycle.
     *
     * CHECKED_IN is intentionally handled by the operational
     * endpoint so physical allocation cannot bypass the lifecycle.
     */
    if (status !== "PLANNED" && status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error:
            "New equipment assignments must start as PLANNED or CONFIRMED.",
        },
        { status: 400 },
      );
    }

    if (returnedAt) {
      return NextResponse.json(
        {
          error:
            "A new equipment assignment cannot have a return time.",
        },
        { status: 400 },
      );
    }

    if (allocatedDate && Number.isNaN(allocatedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid allocation date." },
        { status: 400 },
      );
    }

    if (returnedDate && Number.isNaN(returnedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid return date." },
        { status: 400 },
      );
    }

    if (
      allocatedAt &&
      returnedAt &&
      returnedDate &&
      allocatedDate &&
      returnedDate < allocatedDate
    ) {
      return NextResponse.json(
        {
          error:
            "Return date cannot be earlier than allocation date.",
        },
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

    if (departmentId !== null) {
      const department = await db.orm.public.Department
        .where({
          id: departmentId,
          eventId,
        })
        .first();

      if (!department) {
        return NextResponse.json(
          {
            error:
              "Department not found for this event.",
          },
          { status: 400 },
        );
      }
    }

    const assignment = await db.transaction(async (tx) => {
      /*
       * Build a raw SQL plan for the inventory row.
       *
       * db.raw builds the plan; tx.query executes that plan against
       * the current transaction connection.
       *
       * FOR UPDATE locks this equipment row until the transaction
       * commits or rolls back.
       */
      const equipmentPlan = db.raw.sql`
        SELECT
          "id",
          "quantity"
        FROM equipment
        WHERE "id" = ${equipmentId}
        FOR UPDATE
      `
        .returnsRow({
          id: "pg/int4@1",
          quantity: "pg/int4@1",
        })
        .build();

      let lockedEquipment:
        | {
            id: number;
            quantity: number;
          }
        | undefined;

      for await (const row of tx.query(equipmentPlan)) {
        lockedEquipment = row;
        break;
      }

      if (!lockedEquipment) {
        throw new Error("EQUIPMENT_NOT_FOUND");
      }

      /*
       * Calculate all quantities that still reserve inventory.
       *
       * COMPLETED, CANCELLED and NO_SHOW are released and therefore
       * excluded from the allocation total.
       *
       * This query runs inside the same transaction after the
       * equipment row has been locked.
       */
      const allocationPlan = db.raw.sql`
        SELECT
          COALESCE(SUM("quantity"), 0)::int4 AS "activeAllocatedQuantity"
        FROM "equipmentAssignment"
        WHERE "equipmentId" = ${equipmentId}
          AND "status" IN ('PLANNED', 'CONFIRMED', 'CHECKED_IN')
      `
        .returnsRow({
          activeAllocatedQuantity: "pg/int4@1",
        })
        .build();

      let allocation:
        | {
            activeAllocatedQuantity: number;
          }
        | undefined;

      for await (const row of tx.query(allocationPlan)) {
        allocation = row;
        break;
      }

      const activeAllocatedQuantity =
        allocation?.activeAllocatedQuantity ?? 0;

      const inventoryQuantity = lockedEquipment.quantity;

      if (
        activeAllocatedQuantity + quantity >
        inventoryQuantity
      ) {
        throw new Error(
          `EQUIPMENT_QUANTITY_EXCEEDED:${inventoryQuantity}:${activeAllocatedQuantity}:${quantity}`,
        );
      }

      return tx.orm.public.EquipmentAssignment.create({
        equipmentId,
        eventId,
        departmentId,
        quantity,
        status,
        allocatedAt,
        returnedAt: null,
        notes: notes || null,
      });
    });

    return NextResponse.json(
      { assignment },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EQUIPMENT_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Equipment not found." },
        { status: 404 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        "EQUIPMENT_QUANTITY_EXCEEDED:",
      )
    ) {
      const [
        ,
        inventoryQuantity,
        activeAllocatedQuantity,
        requestedQuantity,
      ] = error.message.split(":");

      return NextResponse.json(
        {
          error:
            `Insufficient equipment inventory. ` +
            `Inventory: ${inventoryQuantity}, ` +
            `Already allocated: ${activeAllocatedQuantity}, ` +
            `Requested: ${requestedQuantity}.`,
        },
        { status: 409 },
      );
    }

    console.error("Equipment assignment creation failed:", error);

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
