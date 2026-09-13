import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

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
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!isValidPositiveInteger(eventId)) {
    return NextResponse.json(
      { error: "Invalid event ID" },
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

  const milestones = await db.orm.public.Milestone
    .where({
      eventId,
    })
    .orderBy((milestone) => milestone.startTime.asc())
    .all();

  return NextResponse.json({
    eventId,
    milestones,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!isValidPositiveInteger(eventId)) {
    return NextResponse.json(
      { error: "Invalid event ID" },
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

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const type = body.type;

  if (!isValidMilestoneType(type)) {
    return NextResponse.json(
      { error: "Invalid milestone type" },
      { status: 400 },
    );
  }

  const status =
    body.status === undefined ? "PLANNED" : body.status;

  if (!isValidMilestoneStatus(status)) {
    return NextResponse.json(
      { error: "Invalid milestone status" },
      { status: 400 },
    );
  }

  const startTime = parseDate(body.startTime);

  if (!startTime) {
    return NextResponse.json(
      { error: "Valid startTime is required" },
      { status: 400 },
    );
  }

  const endTime =
    body.endTime === null || body.endTime === undefined
      ? null
      : parseDate(body.endTime);

  if (
    body.endTime !== null &&
    body.endTime !== undefined &&
    !endTime
  ) {
    return NextResponse.json(
      { error: "Invalid endTime" },
      { status: 400 },
    );
  }

  if (endTime && endTime < startTime) {
    return NextResponse.json(
      { error: "endTime cannot be before startTime" },
      { status: 400 },
    );
  }

  const departmentId =
    body.departmentId === null ||
    body.departmentId === undefined ||
    body.departmentId === ""
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

  const crewMemberId =
    body.crewMemberId === null ||
    body.crewMemberId === undefined ||
    body.crewMemberId === ""
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

  const notes =
    typeof body.notes === "string"
      ? body.notes.trim() || null
      : null;

  const milestone = await db.orm.public.Milestone.create({
    title,
    type,
    status,
    startTime: startTime.toISOString(),
    endTime: endTime ? endTime.toISOString() : null,
    notes,
    eventId,
    departmentId,
    crewMemberId,
  });

  return NextResponse.json(
    { milestone },
    { status: 201 },
  );
}
