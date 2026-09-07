import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../src/lib/session";
import { db } from "../../../../../../src/prisma/db";

const ASSIGNMENT_STATUSES = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

function parsePositiveInt(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const resolvedParams = await params;

  const eventId = parsePositiveInt(resolvedParams.id);
  const assignmentId = parsePositiveInt(
    resolvedParams.assignmentId,
  );

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid ID." },
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

  const assignment =
    await db.orm.public.EquipmentAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Equipment assignment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ assignment });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const resolvedParams = await params;

  const eventId = parsePositiveInt(resolvedParams.id);
  const assignmentId = parsePositiveInt(
    resolvedParams.assignmentId,
  );

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid ID." },
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

  const assignment =
    await db.orm.public.EquipmentAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Equipment assignment not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    const data: {
      equipmentId?: number;
      departmentId?: number | null;
      quantity?: number;
      status?: "PLANNED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
      allocatedAt?: string | null;
      returnedAt?: string | null;
      notes?: string | null;
    } = {};

    if (body.equipmentId !== undefined) {
      const equipmentId = Number(body.equipmentId);

      if (
        !Number.isInteger(equipmentId) ||
        equipmentId <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid equipment." },
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

      const requestedQuantity =
        body.quantity !== undefined
          ? Number(body.quantity)
          : assignment.quantity;

      if (
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Quantity must be a positive integer.",
          },
          { status: 400 },
        );
      }

      if (requestedQuantity > equipment.quantity) {
        return NextResponse.json(
          {
            error: `Quantity cannot exceed available inventory (${equipment.quantity}).`,
          },
          { status: 400 },
        );
      }

      data.equipmentId = equipmentId;
    }

    if (body.departmentId !== undefined) {
      if (
        body.departmentId === null ||
        body.departmentId === ""
      ) {
        data.departmentId = null;
      } else {
        const departmentId = Number(body.departmentId);

        if (
          !Number.isInteger(departmentId) ||
          departmentId <= 0
        ) {
          return NextResponse.json(
            { error: "Invalid department." },
            { status: 400 },
          );
        }

        const department =
          await db.orm.public.Department
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

        data.departmentId = departmentId;
      }
    }

    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          {
            error:
              "Quantity must be a positive integer.",
          },
          { status: 400 },
        );
      }

      data.quantity = quantity;
    }

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !ASSIGNMENT_STATUSES.includes(body.status)
      ) {
        return NextResponse.json(
          { error: "Invalid assignment status." },
          { status: 400 },
        );
      }

      data.status = body.status as "PLANNED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    }

    if (body.allocatedAt !== undefined) {
      if (!body.allocatedAt) {
        data.allocatedAt = null;
      } else {
        const date = new Date(body.allocatedAt);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { error: "Invalid allocation date." },
            { status: 400 },
          );
        }

        data.allocatedAt = date.toISOString();
      }
    }

    if (body.returnedAt !== undefined) {
      if (!body.returnedAt) {
        data.returnedAt = null;
      } else {
        const date = new Date(body.returnedAt);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { error: "Invalid return date." },
            { status: 400 },
          );
        }

        data.returnedAt = date.toISOString();
      }
    }

    if (
      data.allocatedAt !== undefined &&
      data.returnedAt !== undefined &&
      data.allocatedAt &&
      data.returnedAt &&
      data.returnedAt < data.allocatedAt
    ) {
      return NextResponse.json(
        {
          error:
            "Return date cannot be earlier than allocation date.",
        },
        { status: 400 },
      );
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string"
          ? body.notes.trim() || null
          : null;
    }

    const updated =
      await db.orm.public.EquipmentAssignment
        .where({
          id: assignmentId,
          eventId,
        })
        .update(data);

    return NextResponse.json({
      assignment: updated,
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
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const resolvedParams = await params;

  const eventId = parsePositiveInt(resolvedParams.id);
  const assignmentId = parsePositiveInt(
    resolvedParams.assignmentId,
  );

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid ID." },
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

  const assignment =
    await db.orm.public.EquipmentAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Equipment assignment not found." },
      { status: 404 },
    );
  }

  await db.orm.public.EquipmentAssignment
    .where({
      id: assignmentId,
      eventId,
    })
    .delete();

  return NextResponse.json({
    success: true,
  });
}
