import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../../src/lib/authorization";
import { db } from "../../../../../../src/prisma/db";

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
  try {
    const context = await requireCurrentContext();

    const resolvedParams = await params;
    const eventId = parsePositiveInt(resolvedParams.id);
    const assignmentId = parsePositiveInt(resolvedParams.assignmentId);

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
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Equipment assignment fetch failed:",
      error,
    );

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
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
  try {
    const context = await requireCurrentContext();

    requireRole(
      context,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

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

    const body = await request.json();

    /*
     * Lifecycle fields are intentionally excluded from this endpoint.
     *
     * status      -> operation endpoint
     * allocatedAt -> CHECK_IN operation
     * returnedAt  -> RETURN operation
     *
     * This prevents generic PATCH from bypassing lifecycle rules.
     */

    if (body.status !== undefined) {
      return NextResponse.json(
        {
          error:
            "Assignment status cannot be changed through this endpoint. Use the equipment operation endpoint.",
        },
        { status: 409 },
      );
    }

    if (body.allocatedAt !== undefined) {
      return NextResponse.json(
        {
          error:
            "Allocation time cannot be changed through this endpoint. Use the equipment operation endpoint.",
        },
        { status: 409 },
      );
    }

    if (body.returnedAt !== undefined) {
      return NextResponse.json(
        {
          error:
            "Return time cannot be changed through this endpoint. Use the equipment operation endpoint.",
        },
        { status: 409 },
      );
    }

    const data: {
      equipmentId?: number;
      departmentId?: number | null;
      quantity?: number;
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

      const equipment =
        await db.orm.public.Equipment
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

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
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

    if (body.notes !== undefined) {
      if (
        body.notes !== null &&
        typeof body.notes !== "string"
      ) {
        return NextResponse.json(
          { error: "Notes must be a string or null." },
          { status: 400 },
        );
      }

      data.notes = body.notes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          error:
            "No editable fields were provided.",
        },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const current =
        await tx.orm.public.EquipmentAssignment
          .where({
            id: assignmentId,
            eventId,
          })
          .first();

      if (!current) {
        return {
          kind: "not_found" as const,
        };
      }

      const targetEquipmentId =
        data.equipmentId ?? current.equipmentId;

      const targetQuantity =
        data.quantity ?? current.quantity;

      /*
       * Equipment quantity is inventory-sensitive only while
       * the assignment is in an active inventory state.
       */

      const activeStatuses = [
        "PLANNED",
        "CONFIRMED",
        "CHECKED_IN",
      ] as const;

      const isActive = activeStatuses.includes(
        current.status as (typeof activeStatuses)[number],
      );

      if (isActive) {
        const equipmentIds = [
          current.equipmentId,
          targetEquipmentId,
        ].sort((a, b) => a - b);

        for (const equipmentId of [
          ...new Set(equipmentIds),
        ]) {
          const lockPlan = db.raw.sql`
            SELECT "id"
            FROM "equipment"
            WHERE "id" = ${equipmentId}
            FOR UPDATE
          `
            .returnsRow({
              id: "pg/int4@1",
            })
            .build();

          for await (const row of tx.query(lockPlan)) {
            void row;
          }
        }

        const targetEquipment =
          await tx.orm.public.Equipment
            .where({
              id: targetEquipmentId,
            })
            .first();

        if (!targetEquipment) {
          return {
            kind: "equipment_not_found" as const,
          };
        }

        const allocationPlan = db.raw.sql`
          SELECT
            COALESCE(SUM("quantity"), 0)::int4
              AS "activeAllocatedQuantity"
          FROM "equipmentAssignment"
          WHERE "equipmentId" = ${targetEquipmentId}
            AND "status" IN (
              'PLANNED',
              'CONFIRMED',
              'CHECKED_IN'
            )
            AND "id" <> ${assignmentId}
        `
          .returnsRow({
            activeAllocatedQuantity: "pg/int4@1",
          })
          .build();

        let activeAllocatedQuantity = 0;

        for await (const row of tx.query(allocationPlan)) {
          activeAllocatedQuantity =
            Number(row.activeAllocatedQuantity);
        }

        if (
          activeAllocatedQuantity + targetQuantity >
          targetEquipment.quantity
        ) {
          return {
            kind: "insufficient_inventory" as const,
            inventory: targetEquipment.quantity,
            allocated: activeAllocatedQuantity,
            requested: targetQuantity,
          };
        }
      }

      const updated =
        await tx.orm.public.EquipmentAssignment
          .where((currentAssignment) =>
            currentAssignment.id.eq(assignmentId),
          )
          .where((currentAssignment) =>
            currentAssignment.eventId.eq(eventId),
          )
          .update(data);

      if (!updated) {
        return {
          kind: "concurrent_update" as const,
        };
      }

      return {
        kind: "success" as const,
        assignment: updated,
      };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Equipment assignment not found." },
        { status: 404 },
      );
    }

    if (result.kind === "equipment_not_found") {
      return NextResponse.json(
        { error: "Equipment not found." },
        { status: 404 },
      );
    }

    if (result.kind === "insufficient_inventory") {
      return NextResponse.json(
        {
          error:
            `Insufficient equipment inventory. Inventory: ${result.inventory}, Already allocated: ${result.allocated}, Requested: ${result.requested}.`,
        },
        { status: 409 },
      );
    }

    if (result.kind === "concurrent_update") {
      return NextResponse.json(
        {
          error:
            "Equipment assignment was changed by another operation. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      assignment: result.assignment,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Equipment assignment update failed:",
      error,
    );

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
  try {
    const context = await requireCurrentContext();

    requireRole(
      context,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

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
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Equipment assignment deletion failed:",
      error,
    );

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
