import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../src/lib/session";
import { db } from "../../../../../../src/prisma/db";

const MILESTONE_TYPES = [
  "LOAD_IN",
  "SETUP",
  "SOUNDCHECK",
  "REHEARSAL",
  "SHOW_START",
  "SHOW_END",
  "LOAD_OUT",
  "OTHER",
] as const;

const MILESTONE_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
] as const;

function isValidPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isValidMilestoneType(
  value: unknown,
): value is (typeof MILESTONE_TYPES)[number] {
  return (
    typeof value === "string" &&
    MILESTONE_TYPES.includes(
      value as (typeof MILESTONE_TYPES)[number],
    )
  );
}

function isValidMilestoneStatus(
  value: unknown,
): value is (typeof MILESTONE_STATUSES)[number] {
  return (
    typeof value === "string" &&
    MILESTONE_STATUSES.includes(
      value as (typeof MILESTONE_STATUSES)[number],
    )
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id, milestoneId: milestoneIdParam } = await params;

  const eventId = Number(id);
  const milestoneId = Number(milestoneIdParam);

  if (
    !isValidPositiveInteger(eventId) ||
    !isValidPositiveInteger(milestoneId)
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
      id: milestoneId,
      eventId,
    })
    .first();

  if (!milestone) {
    return NextResponse.json(
      { error: "Milestone not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ milestone });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id, milestoneId: milestoneIdParam } = await params;

  const eventId = Number(id);
  const milestoneId = Number(milestoneIdParam);

  if (
    !isValidPositiveInteger(eventId) ||
    !isValidPositiveInteger(milestoneId)
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
      id: milestoneId,
      eventId,
    })
    .first();

  if (!milestone) {
    return NextResponse.json(
      { error: "Milestone not found" },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title must not be empty" },
        { status: 400 },
      );
    }

    data.title = body.title.trim();
  }

  if (body.type !== undefined) {
    if (!isValidMilestoneType(body.type)) {
      return NextResponse.json(
        { error: "Invalid milestone type" },
        { status: 400 },
      );
    }

    data.type = body.type;
  }

  if (body.status !== undefined) {
    if (!isValidMilestoneStatus(body.status)) {
      return NextResponse.json(
        { error: "Invalid milestone status" },
        { status: 400 },
      );
    }

    data.status = body.status;
  }

  let startTime =
    body.startTime !== undefined
      ? parseDate(body.startTime)
      : new Date(milestone.startTime);

  if (!startTime) {
    return NextResponse.json(
      { error: "Invalid startTime" },
      { status: 400 },
    );
  }

  let endTime: Date | null;

  if (body.endTime !== undefined) {
    if (body.endTime === null || body.endTime === "") {
      endTime = null;
    } else {
      endTime = parseDate(body.endTime);

      if (!endTime) {
        return NextResponse.json(
          { error: "Invalid endTime" },
          { status: 400 },
        );
      }
    }
  } else {
    endTime = milestone.endTime
      ? new Date(milestone.endTime)
      : null;
  }

  if (endTime && endTime < startTime) {
    return NextResponse.json(
      { error: "endTime cannot be before startTime" },
      { status: 400 },
    );
  }

  if (body.startTime !== undefined) {
    data.startTime = startTime.toISOString();
  }

  if (body.endTime !== undefined) {
    data.endTime = endTime
      ? endTime.toISOString()
      : null;
  }

  if (body.departmentId !== undefined) {
    const departmentId =
      body.departmentId === null || body.departmentId === ""
        ? null
        : Number(body.departmentId);

    if (
      departmentId !== null &&
      !isValidPositiveInteger(departmentId)
    ) {
      return NextResponse.json(
        { error: "Invalid departmentId" },
        { status: 400 },
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
          { error: "Department not found for this event" },
          { status: 400 },
        );
      }
    }

    data.departmentId = departmentId;
  }

  if (body.crewMemberId !== undefined) {
    const crewMemberId =
      body.crewMemberId === null || body.crewMemberId === ""
        ? null
        : Number(body.crewMemberId);

    if (
      crewMemberId !== null &&
      !isValidPositiveInteger(crewMemberId)
    ) {
      return NextResponse.json(
        { error: "Invalid crewMemberId" },
        { status: 400 },
      );
    }

    if (crewMemberId !== null) {
      const crewMember = await db.orm.public.CrewMember
        .where({
          id: crewMemberId,
          organizationId: context.organization.id,
        })
        .first();

      if (!crewMember) {
        return NextResponse.json(
          { error: "Crew member not found" },
          { status: 400 },
        );
      }
    }

    data.crewMemberId = crewMemberId;
  }

  if (body.notes !== undefined) {
    data.notes =
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const updatedMilestone =
    await db.orm.public.Milestone
      .where({
        id: milestoneId,
        eventId,
      })
      .update(data);

  return NextResponse.json({
    milestone: updatedMilestone,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id, milestoneId: milestoneIdParam } = await params;

  const eventId = Number(id);
  const milestoneId = Number(milestoneIdParam);

  if (
    !isValidPositiveInteger(eventId) ||
    !isValidPositiveInteger(milestoneId)
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
      id: milestoneId,
      eventId,
    })
    .first();

  if (!milestone) {
    return NextResponse.json(
      { error: "Milestone not found" },
      { status: 404 },
    );
  }

  await db.orm.public.Milestone
    .where({
      id: milestoneId,
      eventId,
    })
    .delete();

  return NextResponse.json({
    success: true,
    milestone,
  });
}
