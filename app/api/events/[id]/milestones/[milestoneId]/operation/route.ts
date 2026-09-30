import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../../../src/lib/authorization";
import { db } from "../../../../../../../src/prisma/db";

const ACTIONS = ["START", "COMPLETE", "SKIP"] as const;

type Action = (typeof ACTIONS)[number];

function isValidAction(value: unknown): value is Action {
  return (
    typeof value === "string" &&
    ACTIONS.includes(value as Action)
  );
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      milestoneId: string;
    }>;
  },
) {
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

  const { id, milestoneId } = await params;

  const eventId = Number(id);
  const milestoneIdNumber = Number(milestoneId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(milestoneIdNumber) ||
    milestoneIdNumber <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or milestone ID" },
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
      { error: "Event not found" },
      { status: 404 },
    );
  }

  let body: { action?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!isValidAction(body.action)) {
    return NextResponse.json(
      {
        error: "Invalid operation",
        allowed: ACTIONS,
      },
      { status: 400 },
    );
  }

  const result = await db.transaction(async (tx) => {
    const milestone = await tx.orm.public.Milestone
      .where({
        id: milestoneIdNumber,
        eventId,
      })
      .first();

    if (!milestone) {
      return {
        kind: "not_found" as const,
      };
    }

    if (body.action === "START") {
      if (milestone.status !== "PLANNED") {
        return {
          kind: "invalid_transition" as const,
          error: "Only planned milestones can be started",
          currentStatus: milestone.status,
        };
      }

      const updatePlan = db.raw.sql`
        UPDATE "milestone"
        SET
          "status" = 'IN_PROGRESS'
        WHERE "id" = ${milestoneIdNumber}
          AND "eventId" = ${eventId}
          AND "status" = 'PLANNED'
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
            "Milestone was changed by another operation. Please refresh and try again.",
        };
      }
    } else if (body.action === "COMPLETE") {
      if (milestone.status !== "IN_PROGRESS") {
        return {
          kind: "invalid_transition" as const,
          error:
            "Only in-progress milestones can be completed",
          currentStatus: milestone.status,
        };
      }

      const endTime = new Date().toISOString();

      const updatePlan = db.raw.sql`
        UPDATE "milestone"
        SET
          "status" = 'COMPLETED',
          "endTime" = ${endTime}
        WHERE "id" = ${milestoneIdNumber}
          AND "eventId" = ${eventId}
          AND "status" = 'IN_PROGRESS'
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
            "Milestone was changed by another operation. Please refresh and try again.",
        };
      }
    } else {
      if (milestone.status !== "PLANNED") {
        return {
          kind: "invalid_transition" as const,
          error: "Only planned milestones can be skipped",
          currentStatus: milestone.status,
        };
      }

      const updatePlan = db.raw.sql`
        UPDATE "milestone"
        SET
          "status" = 'SKIPPED'
        WHERE "id" = ${milestoneIdNumber}
          AND "eventId" = ${eventId}
          AND "status" = 'PLANNED'
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
            "Milestone was changed by another operation. Please refresh and try again.",
        };
      }
    }

    const updatedMilestone =
      await tx.orm.public.Milestone
        .where({
          id: milestoneIdNumber,
          eventId,
        })
        .first();

    if (!updatedMilestone) {
      return {
        kind: "not_found" as const,
      };
    }

    return {
      kind: "success" as const,
      milestone: updatedMilestone,
    };
  });

  if (result.kind === "not_found") {
    return NextResponse.json(
      { error: "Milestone not found" },
      { status: 404 },
    );
  }

  if (result.kind === "invalid_transition") {
    return NextResponse.json(
      {
        error: result.error,
        currentStatus: result.currentStatus,
      },
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
    milestone: result.milestone,
  });
}
