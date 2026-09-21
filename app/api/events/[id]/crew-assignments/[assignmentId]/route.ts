import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../../src/lib/authorization";
import { db } from "../../../../../../src/prisma/db";

const allowedStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

type AssignmentStatus = (typeof allowedStatuses)[number];

function isValidStatus(
  value: unknown,
): value is AssignmentStatus {
  return (
    typeof value === "string" &&
    allowedStatuses.includes(
      value as AssignmentStatus,
    )
  );
}

function isValidTransition(
  current: AssignmentStatus,
  next: AssignmentStatus,
) {
  if (current === next) {
    return true;
  }

  switch (current) {
    case "PLANNED":
      return (
        next === "CONFIRMED" ||
        next === "CANCELLED" ||
        next === "NO_SHOW"
      );

    case "CONFIRMED":
      return (
        next === "CHECKED_IN" ||
        next === "CANCELLED" ||
        next === "NO_SHOW"
      );

    case "CHECKED_IN":
      return next === "COMPLETED";

    case "COMPLETED":
    case "CANCELLED":
    case "NO_SHOW":
      return false;

    default:
      return false;
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
    let context;
    try {
      context = await requireCurrentContext();
      requireRole(
        context,
        "OWNER",
        "ADMIN",
        "PRODUCER",
        "PRODUCTION_MANAGER",
      );
    } catch (error) {
      const authorizationResponse =
        authorizationErrorResponse(error);

      if (authorizationResponse) {
        return authorizationResponse;
      }

      throw error;
    }

    const { id, assignmentId } = await params;

    const eventId = Number(id);
    const crewAssignmentId = Number(assignmentId);

    if (
      !Number.isInteger(eventId) ||
      eventId <= 0 ||
      !Number.isInteger(crewAssignmentId) ||
      crewAssignmentId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid event or assignment ID",
        },
        { status: 400 },
      );
    }

    const event =
      await db.orm.public.Event
        .where({
          id: eventId,
          organizationId:
            context.organization.id,
        })
        .first();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
      );
    }

    let body: {
      status?: unknown;
    };

    try {
      body =
        (await request.json()) as {
          status?: unknown;
        };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        {
          error: "Invalid assignment status",
          allowed: allowedStatuses,
        },
        { status: 400 },
      );
    }

    const requestedStatus = body.status;

    const result = await db.transaction(async (tx) => {
      const assignment =
        await tx.orm.public.CrewAssignment
          .where({
            id: crewAssignmentId,
            eventId,
          })
          .first();

      if (!assignment) {
        return {
          kind: "assignment_not_found" as const,
        };
      }

      const currentStatus =
        assignment.assignmentStatus as AssignmentStatus;

      if (
        !isValidTransition(
          currentStatus,
          requestedStatus,
        )
      ) {
        return {
          kind: "invalid_transition" as const,
          currentStatus,
          requestedStatus,
        };
      }

      if (currentStatus === requestedStatus) {
        return {
          kind: "success" as const,
          assignment,
        };
      }

      const now = new Date().toISOString();

      if (requestedStatus === "CHECKED_IN") {
        const updatePlan = db.raw.sql`
          UPDATE "crewAssignment"
          SET
            "assignmentStatus" = 'CHECKED_IN',
            "callTime" = COALESCE(
              "callTime",
              ${now}
            )
          WHERE "id" = ${crewAssignmentId}
            AND "eventId" = ${eventId}
            AND "assignmentStatus" = 'CONFIRMED'
          RETURNING "id"
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let updatedId: number | undefined;

        for await (const row of tx.query(
          updatePlan,
        )) {
          updatedId = row.id;
          break;
        }

        if (updatedId === undefined) {
          return {
            kind: "concurrent_transition" as const,
          };
        }
      } else if (requestedStatus === "COMPLETED") {
        const updatePlan = db.raw.sql`
          UPDATE "crewAssignment"
          SET
            "assignmentStatus" = 'COMPLETED',
            "releaseTime" = COALESCE(
              "releaseTime",
              ${now}
            )
          WHERE "id" = ${crewAssignmentId}
            AND "eventId" = ${eventId}
            AND "assignmentStatus" = 'CHECKED_IN'
          RETURNING "id"
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let updatedId: number | undefined;

        for await (const row of tx.query(
          updatePlan,
        )) {
          updatedId = row.id;
          break;
        }

        if (updatedId === undefined) {
          return {
            kind: "concurrent_transition" as const,
          };
        }
      } else {
        const updatePlan = db.raw.sql`
          UPDATE "crewAssignment"
          SET
            "assignmentStatus" = ${requestedStatus}
          WHERE "id" = ${crewAssignmentId}
            AND "eventId" = ${eventId}
            AND "assignmentStatus" = ${currentStatus}
          RETURNING "id"
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let updatedId: number | undefined;

        for await (const row of tx.query(
          updatePlan,
        )) {
          updatedId = row.id;
          break;
        }

        if (updatedId === undefined) {
          return {
            kind: "concurrent_transition" as const,
          };
        }
      }

      const updatedAssignment =
        await tx.orm.public.CrewAssignment
          .where({
            id: crewAssignmentId,
            eventId,
          })
          .first();

      if (!updatedAssignment) {
        return {
          kind: "assignment_not_found" as const,
        };
      }

      return {
        kind: "success" as const,
        assignment: updatedAssignment,
      };
    });

    if (result.kind === "assignment_not_found") {
      return NextResponse.json(
        { error: "Crew assignment not found" },
        { status: 404 },
      );
    }

    if (result.kind === "invalid_transition") {
      return NextResponse.json(
        {
          error: `Invalid crew assignment transition from ${result.currentStatus} to ${result.requestedStatus}.`,
        },
        { status: 409 },
      );
    }

    if (result.kind === "concurrent_transition") {
      return NextResponse.json(
        {
          error:
            "Crew assignment was changed by another operation. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      assignment: result.assignment,
    });
  } catch (error) {
    console.error(
      "Update crew assignment lifecycle failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update crew assignment lifecycle.",
      },
      { status: 500 },
    );
  }
}
