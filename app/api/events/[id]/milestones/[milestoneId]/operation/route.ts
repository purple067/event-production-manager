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

  const milestone = await db.orm.public.Milestone
    .where({
      id: milestoneIdNumber,
      eventId,
    })
    .first();

  if (!milestone) {
    return NextResponse.json(
      { error: "Milestone not found" },
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

  if (body.action === "START") {
    if (milestone.status !== "PLANNED") {
      return NextResponse.json(
        {
          error: "Only planned milestones can be started",
          currentStatus: milestone.status,
        },
        { status: 409 },
      );
    }

    const updated = await db.orm.public.Milestone
      .where({
        id: milestoneIdNumber,
        eventId,
      })
      .update({
        status: "IN_PROGRESS",
      });

    return NextResponse.json({
      milestone: updated,
    });
  }

  if (body.action === "COMPLETE") {
    if (milestone.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "Only in-progress milestones can be completed",
          currentStatus: milestone.status,
        },
        { status: 409 },
      );
    }

    const updated = await db.orm.public.Milestone
      .where({
        id: milestoneIdNumber,
        eventId,
      })
      .update({
        status: "COMPLETED",
        endTime: new Date().toISOString(),
      });

    return NextResponse.json({
      milestone: updated,
    });
  }

  if (milestone.status !== "PLANNED") {
    return NextResponse.json(
      {
        error: "Only planned milestones can be skipped",
        currentStatus: milestone.status,
      },
      { status: 409 },
    );
  }

  const updated = await db.orm.public.Milestone
    .where({
      id: milestoneIdNumber,
      eventId,
    })
    .update({
      status: "SKIPPED",
    });

  return NextResponse.json({
    milestone: updated,
  });
}
