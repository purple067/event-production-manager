import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../src/lib/session";
import { db } from "../../../../../../src/prisma/db";

function isValidPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

async function getTaskContext(
  eventId: number,
  taskId: number,
  organizationId: number,
) {
  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId,
    })
    .first();

  if (!event) {
    return null;
  }

  const task = await db.orm.public.ProductionTask
    .where({
      id: taskId,
      eventId,
    })
    .first();

  if (!task) {
    return null;
  }

  return {
    event,
    task,
  };
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; taskId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, taskId } = await params;

  const eventId = Number(id);
  const parsedTaskId = Number(taskId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(parsedTaskId) ||
    parsedTaskId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or task ID." },
      { status: 400 },
    );
  }

  const result = await getTaskContext(
    eventId,
    parsedTaskId,
    context.organization.id,
  );

  if (!result) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    task: result.task,
  });
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; taskId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, taskId } = await params;

  const eventId = Number(id);
  const parsedTaskId = Number(taskId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(parsedTaskId) ||
    parsedTaskId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or task ID." },
      { status: 400 },
    );
  }

  const result = await getTaskContext(
    eventId,
    parsedTaskId,
    context.organization.id,
  );

  if (!result) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 },
    );
  }

  let body: {
    title?: unknown;
    description?: unknown;
    status?: unknown;
    priority?: unknown;
    dueDate?: unknown;
    departmentId?: unknown;
    crewMemberId?: unknown;
    notes?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const data: {
    title?: string;
    description?: string | null;
    status?:
      | "TODO"
      | "IN_PROGRESS"
      | "BLOCKED"
      | "DONE"
      | "CANCELLED";
    priority?:
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL";
    dueDate?: string | null;
    departmentId?: number | null;
    crewMemberId?: number | null;
    notes?: string | null;
  } = {};

  if (body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return NextResponse.json(
        { error: "Title must be a non-empty string." },
        { status: 400 },
      );
    }

    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Description must be a string or null.",
        },
        { status: 400 },
      );
    }

    data.description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (body.status !== undefined) {
    const validStatuses = [
      "TODO",
      "IN_PROGRESS",
      "BLOCKED",
      "DONE",
      "CANCELLED",
    ] as const;

    if (
      typeof body.status !== "string" ||
      !validStatuses.includes(
        body.status as (typeof validStatuses)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid task status." },
        { status: 400 },
      );
    }

    data.status =
      body.status as (typeof validStatuses)[number];
  }

  if (body.priority !== undefined) {
    const validPriorities = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ] as const;

    if (
      typeof body.priority !== "string" ||
      !validPriorities.includes(
        body.priority as (typeof validPriorities)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid task priority." },
        { status: 400 },
      );
    }

    data.priority =
      body.priority as (typeof validPriorities)[number];
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null) {
      data.dueDate = null;
    } else if (typeof body.dueDate === "string") {
      const parsedDate = new Date(body.dueDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid dueDate." },
          { status: 400 },
        );
      }

      data.dueDate = body.dueDate;
    } else {
      return NextResponse.json(
        { error: "dueDate must be a string or null." },
        { status: 400 },
      );
    }
  }

  if (body.departmentId !== undefined) {
    if (body.departmentId === null) {
      data.departmentId = null;
    } else if (isValidPositiveInteger(body.departmentId)) {
      const department = await db.orm.public.Department
        .where({
          id: body.departmentId,
          eventId,
        })
        .first();

      if (!department) {
        return NextResponse.json(
          {
            error:
              "Department does not belong to this event.",
          },
          { status: 400 },
        );
      }

      data.departmentId = body.departmentId;
    } else {
      return NextResponse.json(
        {
          error:
            "departmentId must be a positive integer or null.",
        },
        { status: 400 },
      );
    }
  }

  if (body.crewMemberId !== undefined) {
    if (body.crewMemberId === null) {
      data.crewMemberId = null;
    } else if (isValidPositiveInteger(body.crewMemberId)) {
      const crewMember = await db.orm.public.CrewMember
        .where({
          id: body.crewMemberId,
          organizationId: context.organization.id,
        })
        .first();

      if (!crewMember) {
        return NextResponse.json(
          {
            error:
              "Crew member does not belong to this organization.",
          },
          { status: 400 },
        );
      }

      data.crewMemberId = body.crewMemberId;
    } else {
      return NextResponse.json(
        {
          error:
            "crewMemberId must be a positive integer or null.",
        },
        { status: 400 },
      );
    }
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

    data.notes =
      typeof body.notes === "string" &&
      body.notes.trim()
        ? body.notes.trim()
        : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  const task = await db.orm.public.ProductionTask
    .where({
      id: parsedTaskId,
      eventId,
    })
    .update(data);

  if (!task) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    task,
  });
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; taskId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, taskId } = await params;

  const eventId = Number(id);
  const parsedTaskId = Number(taskId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(parsedTaskId) ||
    parsedTaskId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or task ID." },
      { status: 400 },
    );
  }

  const result = await getTaskContext(
    eventId,
    parsedTaskId,
    context.organization.id,
  );

  if (!result) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 },
    );
  }

  const deletedTask = await db.orm.public.ProductionTask
    .where({
      id: parsedTaskId,
      eventId,
    })
    .delete();

  if (!deletedTask) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    task: deletedTask,
  });
}
