import { NextResponse } from "next/server";

import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
] as const;

const TASK_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

function isValidStatus(value: unknown): value is (typeof TASK_STATUSES)[number] {
  return (
    typeof value === "string" &&
    TASK_STATUSES.includes(value as (typeof TASK_STATUSES)[number])
  );
}

function isValidPriority(
  value: unknown,
): value is (typeof TASK_PRIORITIES)[number] {
  return (
    typeof value === "string" &&
    TASK_PRIORITIES.includes(value as (typeof TASK_PRIORITIES)[number])
  );
}

function isValidPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isValidDate(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
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

  const tasks = await db.orm.public.ProductionTask
    .where({
      eventId,
    })
    .orderBy((task) => task.createdAt.desc())
    .all();

  return NextResponse.json({
    eventId,
    tasks,
  });
}

export async function POST(
  request: Request,
  { params }: RouteProps,
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be an object" },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const title =
    typeof data.title === "string"
      ? data.title.trim()
      : "";

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const description =
    data.description === null
      ? null
      : typeof data.description === "string"
        ? data.description.trim() || null
        : undefined;

  if (
    data.description !== undefined &&
    data.description !== null &&
    typeof data.description !== "string"
  ) {
    return NextResponse.json(
      { error: "Description must be a string or null" },
      { status: 400 },
    );
  }

  const status = data.status ?? "TODO";

  if (!isValidStatus(status)) {
    return NextResponse.json(
      {
        error: "Invalid task status",
        allowed: TASK_STATUSES,
      },
      { status: 400 },
    );
  }

  const priority = data.priority ?? "MEDIUM";

  if (!isValidPriority(priority)) {
    return NextResponse.json(
      {
        error: "Invalid task priority",
        allowed: TASK_PRIORITIES,
      },
      { status: 400 },
    );
  }

  let dueDate: string | null = null;

  if (data.dueDate !== undefined && data.dueDate !== null) {
    if (!isValidDate(data.dueDate)) {
      return NextResponse.json(
        { error: "Invalid due date" },
        { status: 400 },
      );
    }

    dueDate = new Date(data.dueDate as string).toISOString();
  }

  let departmentId: number | null = null;

  if (data.departmentId !== undefined && data.departmentId !== null) {
    if (!isValidPositiveInteger(data.departmentId)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const department = await db.orm.public.Department
      .where({
        id: data.departmentId,
        eventId,
      })
      .first();

    if (!department) {
      return NextResponse.json(
        { error: "Department not found for this event" },
        { status: 404 },
      );
    }

    departmentId = data.departmentId;
  }

  let crewMemberId: number | null = null;

  if (data.crewMemberId !== undefined && data.crewMemberId !== null) {
    if (!isValidPositiveInteger(data.crewMemberId)) {
      return NextResponse.json(
        { error: "Invalid crew member ID" },
        { status: 400 },
      );
    }

    const crewMember = await db.orm.public.CrewMember
      .where({
        id: data.crewMemberId,
        organizationId: context.organization.id,
      })
      .first();

    if (!crewMember) {
      return NextResponse.json(
        { error: "Crew member not found for this organization" },
        { status: 404 },
      );
    }

    crewMemberId = data.crewMemberId;
  }

  const notes =
    data.notes === null
      ? null
      : typeof data.notes === "string"
        ? data.notes.trim() || null
        : undefined;

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    return NextResponse.json(
      { error: "Notes must be a string or null" },
      { status: 400 },
    );
  }

  const task = await db.orm.public.ProductionTask.create({
    title,
    description,
    status,
    priority,
    dueDate,
    notes,
    eventId,
    departmentId,
    crewMemberId,
  });

  return NextResponse.json(
    { task },
    { status: 201 },
  );
}
