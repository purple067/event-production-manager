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
] as const;

type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

function isValidStatus(value: unknown): value is AssignmentStatus {
  return (
    typeof value === "string" &&
    ASSIGNMENT_STATUSES.includes(value as AssignmentStatus)
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "Invalid event or assignment ID" },
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

  const assignment = await db.orm.public.CrewAssignment
    .where({
      id: crewAssignmentId,
      eventId,
    })
    .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Crew assignment not found" },
      { status: 404 },
    );
  }

  let body: { status?: unknown };

  try {
    body = await request.json();
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
        allowed: ASSIGNMENT_STATUSES,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const updateData: {
    assignmentStatus: AssignmentStatus;
    callTime?: string;
  } = {
    assignmentStatus: body.status,
  };

  if (body.status === "CHECKED_IN" && !assignment.callTime) {
    updateData.callTime = now;
  }

  const updated = await db.orm.public.CrewAssignment
    .where({
      id: crewAssignmentId,
      eventId,
    })
    .update(updateData);

  return NextResponse.json({
    assignment: updated,
  });
}
