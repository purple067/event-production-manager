import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../../../src/lib/authorization";
import { db } from "../../../../../../../src/prisma/db";

const ACTIONS = ["START", "BLOCK", "COMPLETE", "RESUME", "CANCEL"] as const;

type Action = (typeof ACTIONS)[number];

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

function isValidAction(value: unknown): value is Action {
  return typeof value === "string" && ACTIONS.includes(value as Action);
}

function isValidTransition(current: TaskStatus, action: Action) {
  switch (current) {
    case "TODO":
      return action === "START" || action === "BLOCK" || action === "CANCEL";

    case "IN_PROGRESS":
      return action === "BLOCK" || action === "COMPLETE" || action === "CANCEL";

    case "BLOCKED":
      return action === "RESUME" || action === "CANCEL";

    case "DONE":
    case "CANCELLED":
      return false;

    default:
      return false;
  }
}

function nextStatus(action: Action): TaskStatus {
  switch (action) {
    case "START":
      return "IN_PROGRESS";

    case "BLOCK":
      return "BLOCKED";

    case "COMPLETE":
      return "DONE";

    case "RESUME":
      return "IN_PROGRESS";

    case "CANCEL":
      return "CANCELLED";
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      taskId: string;
    }>;
  },
) {
  let context;

  try {
    context = await requireCurrentContext();

    requireRole(context, "OWNER", "ADMIN", "PRODUCER", "PRODUCTION_MANAGER");
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    throw error;
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

  const event = await db.orm.public.Event.where({
    id: eventId,
    organizationId: context.organization.id,
  }).first();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  let body: { action?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidAction(body.action)) {
    return NextResponse.json(
      {
        error: "Invalid operation.",
        allowed: ACTIONS,
      },
      { status: 400 },
    );
  }

  const action = body.action;

  const result = await db.transaction(async (tx) => {
    const task = await tx.orm.public.ProductionTask.where({
      id: parsedTaskId,
      eventId,
    }).first();

    if (!task) {
      return {
        kind: "not_found" as const,
      };
    }

    const currentStatus = task.status as TaskStatus;

    if (!isValidTransition(currentStatus, action)) {
      return {
        kind: "invalid_transition" as const,
        currentStatus,
      };
    }

    const targetStatus = nextStatus(action);

    const updatePlan = db.raw.sql`
      UPDATE "productionTask"
      SET "status" = ${targetStatus}
      WHERE "id" = ${parsedTaskId}
        AND "eventId" = ${eventId}
        AND "status" = ${currentStatus}
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
      };
    }

    const updatedTask = await tx.orm.public.ProductionTask.where({
      id: parsedTaskId,
      eventId,
    }).first();

    if (!updatedTask) {
      return {
        kind: "not_found" as const,
      };
    }

    return {
      kind: "success" as const,
      task: updatedTask,
    };
  });

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (result.kind === "invalid_transition") {
    return NextResponse.json(
      {
        error: `Invalid task transition from ${result.currentStatus} using ${action}.`,
        currentStatus: result.currentStatus,
      },
      { status: 409 },
    );
  }

  if (result.kind === "concurrent_transition") {
    return NextResponse.json(
      {
        error:
          "Task was changed by another operation. Please refresh and try again.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    task: result.task,
  });
}
