import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "@/src/lib/authorization";

import { db } from "@/src/prisma/db";

function parsePositiveInt(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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

    const body = await request.json();
    const action = body.action;

    if (action !== "CHECK_IN" && action !== "RETURN") {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use CHECK_IN or RETURN.",
        },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const assignment =
        await tx.orm.public.EquipmentAssignment
          .where({
            id: assignmentId,
            eventId,
          })
          .first();

      if (!assignment) {
        return {
          kind: "not_found" as const,
        };
      }

      /*
       * CHECK IN
       *
       * Only PLANNED and CONFIRMED assignments can be
       * checked in.
       *
       * The conditional UPDATE is the concurrency guard.
       * PostgreSQL locks the assignment row during UPDATE.
       * If another transaction changes the status first,
       * this UPDATE matches zero rows and RETURNING produces
       * no result.
       */
      if (action === "CHECK_IN") {
        if (
          assignment.status !== "PLANNED" &&
          assignment.status !== "CONFIRMED"
        ) {
          return {
            kind: "invalid_transition" as const,
            error:
              `Equipment cannot be checked in from ${assignment.status}.`,
          };
        }

        const allocatedAt =
          assignment.allocatedAt ??
          new Date().toISOString();

        const updatePlan = db.raw.sql`
          UPDATE "equipmentAssignment"
          SET
            "status" = 'CHECKED_IN',
            "allocatedAt" = ${allocatedAt}
          WHERE "id" = ${assignmentId}
            AND "eventId" = ${eventId}
            AND "status" IN ('PLANNED', 'CONFIRMED')
          RETURNING "id"
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let updatedId: number | undefined;

        for await (const row of tx.query(updatePlan)) {
          updatedId = row.id;
          break;
        }

        if (updatedId === undefined) {
          return {
            kind: "concurrent_transition" as const,
            error:
              "Equipment assignment was changed by another operation. Please refresh and try again.",
          };
        }

        const updatedAssignment =
          await tx.orm.public.EquipmentAssignment
            .where({
              id: assignmentId,
              eventId,
            })
            .first();

        if (!updatedAssignment) {
          return {
            kind: "concurrent_transition" as const,
            error:
              "Equipment assignment could not be reloaded. Please refresh and try again.",
          };
        }

        return {
          kind: "success" as const,
          assignment: updatedAssignment,
        };
      }

      /*
       * RETURN
       *
       * Only CHECKED_IN assignments can be returned.
       *
       * As with CHECK_IN, the conditional UPDATE itself
       * provides the concurrency guarantee.
       */
      if (assignment.status !== "CHECKED_IN") {
        return {
          kind: "invalid_transition" as const,
          error:
            `Equipment cannot be returned from ${assignment.status}.`,
        };
      }

      const returnedAt = new Date().toISOString();

      if (
        assignment.allocatedAt &&
        new Date(returnedAt) <
          new Date(assignment.allocatedAt)
      ) {
        return {
          kind: "invalid_timestamp" as const,
          error:
            "Equipment return time cannot be earlier than allocation time.",
        };
      }

      const updatePlan = db.raw.sql`
        UPDATE "equipmentAssignment"
        SET
          "status" = 'COMPLETED',
          "returnedAt" = ${returnedAt}
        WHERE "id" = ${assignmentId}
          AND "eventId" = ${eventId}
          AND "status" = 'CHECKED_IN'
        RETURNING "id"
      `
        .returnsRow({
          id: "pg/int4@1",
        })
        .build();

      let updatedId: number | undefined;

      for await (const row of tx.query(updatePlan)) {
        updatedId = row.id;
        break;
      }

      if (updatedId === undefined) {
        return {
          kind: "concurrent_transition" as const,
          error:
            "Equipment assignment was changed by another operation. Please refresh and try again.",
        };
      }

      const updatedAssignment =
        await tx.orm.public.EquipmentAssignment
          .where({
            id: assignmentId,
            eventId,
          })
          .first();

      if (!updatedAssignment) {
        return {
          kind: "concurrent_transition" as const,
          error:
            "Equipment assignment could not be reloaded. Please refresh and try again.",
        };
      }

      return {
        kind: "success" as const,
        assignment: updatedAssignment,
      };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Equipment assignment not found." },
        { status: 404 },
      );
    }

    if (result.kind === "invalid_transition") {
      return NextResponse.json(
        { error: result.error },
        { status: 409 },
      );
    }

    if (result.kind === "invalid_timestamp") {
      return NextResponse.json(
        { error: result.error },
        { status: 409 },
      );
    }

    if (result.kind === "concurrent_transition") {
      return NextResponse.json(
        { error: result.error },
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
      "Equipment operation failed:",
      error,
    );

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
