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

const activeStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

type AssignmentStatus = (typeof allowedStatuses)[number];

type UpdateAssignmentBody = {
  crewMemberId?: number;
  departmentId?: number | null;
  role?: string | null;
  assignmentStatus?: string;
  callTime?: string | null;
  releaseTime?: string | null;
  rate?: number | null;
  rateUnit?: string | null;
  notes?: string | null;
};

function isActiveStatus(status: AssignmentStatus) {
  return activeStatuses.includes(
    status as (typeof activeStatuses)[number],
  );
}

function isValidTransition(
  current: AssignmentStatus,
  next: AssignmentStatus,
) {
  if (current === next) return true;

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

async function getAssignment(
  eventId: number,
  assignmentId: number,
  organizationId: number,
) {
  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId,
    })
    .first();

  if (!event) return null;

  return db.orm.public.CrewAssignment
    .where({
      id: assignmentId,
      eventId,
    })
    .first();
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  try {
    const authContext = await requireCurrentContext();

    const params = await context.params;
    const eventId = Number(params.id);
    const assignmentId = Number(params.assignmentId);

    if (
      !Number.isInteger(eventId) ||
      eventId <= 0 ||
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
        { status: 400 },
      );
    }

    const assignment = await getAssignment(
      eventId,
      assignmentId,
      authContext.organization.id,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      assignment,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Get crew assignment failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load crew assignment." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  try {
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

    const params = await context.params;
    const eventId = Number(params.id);
    const assignmentId = Number(params.assignmentId);

    if (
      !Number.isInteger(eventId) ||
      eventId <= 0 ||
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
        { status: 400 },
      );
    }

    const organizationId = authContext.organization.id;

    const existingAssignment = await getAssignment(
      eventId,
      assignmentId,
      organizationId,
    );

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
      );
    }

    let body: UpdateAssignmentBody;

    try {
      body =
        (await request.json()) as UpdateAssignmentBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    let requestedCrewMemberId =
      existingAssignment.crewMemberId;

    if (body.crewMemberId !== undefined) {
      if (
        !Number.isInteger(body.crewMemberId) ||
        body.crewMemberId <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid crew member ID." },
          { status: 400 },
        );
      }

      requestedCrewMemberId = body.crewMemberId;
    }

    if (body.departmentId !== undefined) {
      if (body.departmentId !== null) {
        if (
          !Number.isInteger(body.departmentId) ||
          body.departmentId <= 0
        ) {
          return NextResponse.json(
            { error: "Invalid department ID." },
            { status: 400 },
          );
        }

        const department =
          await db.orm.public.Department
            .where({
              id: body.departmentId,
              eventId,
            })
            .first();

        if (!department) {
          return NextResponse.json(
            {
              error:
                "Department not found for this event.",
            },
            { status: 404 },
          );
        }
      }
    }

    let requestedStatus =
      existingAssignment.assignmentStatus as AssignmentStatus;

    if (body.assignmentStatus !== undefined) {
      if (
        !allowedStatuses.includes(
          body.assignmentStatus as AssignmentStatus,
        )
      ) {
        return NextResponse.json(
          { error: "Invalid assignment status." },
          { status: 400 },
        );
      }

      requestedStatus =
        body.assignmentStatus as AssignmentStatus;
    }

    if (
      !isValidTransition(
        existingAssignment.assignmentStatus as AssignmentStatus,
        requestedStatus,
      )
    ) {
      return NextResponse.json(
        {
          error: `Invalid crew assignment transition from ${existingAssignment.assignmentStatus} to ${requestedStatus}.`,
        },
        { status: 409 },
      );
    }

    const finalCallTime =
      body.callTime !== undefined
        ? parseDate(body.callTime)
        : existingAssignment.callTime;

    const finalReleaseTime =
      body.releaseTime !== undefined
        ? parseDate(body.releaseTime)
        : existingAssignment.releaseTime;

    if (
      body.callTime !== undefined &&
      body.callTime !== null &&
      finalCallTime === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid call time." },
        { status: 400 },
      );
    }

    if (
      body.releaseTime !== undefined &&
      body.releaseTime !== null &&
      finalReleaseTime === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid release time." },
        { status: 400 },
      );
    }

    if (
      finalCallTime &&
      finalReleaseTime &&
      new Date(finalReleaseTime) <=
        new Date(finalCallTime)
    ) {
      return NextResponse.json(
        {
          error:
            "Release time must be after call time.",
        },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.crewMemberId !== undefined) {
      updateData.crewMemberId =
        requestedCrewMemberId;
    }

    if (body.departmentId !== undefined) {
      updateData.departmentId =
        body.departmentId;
    }

    if (body.role !== undefined) {
      updateData.role =
        body.role?.trim() || null;
    }

    if (body.rateUnit !== undefined) {
      updateData.rateUnit =
        body.rateUnit?.trim() || null;
    }

    if (body.notes !== undefined) {
      updateData.notes =
        body.notes?.trim() || null;
    }

    if (body.rate !== undefined) {
      updateData.rate = body.rate;
    }

    if (body.assignmentStatus !== undefined) {
      updateData.assignmentStatus =
        requestedStatus;
    }

    if (body.callTime !== undefined) {
      updateData.callTime = finalCallTime;
    }

    if (body.releaseTime !== undefined) {
      updateData.releaseTime =
        finalReleaseTime;
    }

    const result = await db.transaction(async (tx) => {
      const crewMemberIds = [
        existingAssignment.crewMemberId,
        requestedCrewMemberId,
      ].sort((a, b) => a - b);

      const uniqueCrewMemberIds = [
        ...new Set(crewMemberIds),
      ];

      for (const crewMemberId of uniqueCrewMemberIds) {
        const lockPlan = db.raw.sql`
          SELECT
            "id"
          FROM "crewMember"
          WHERE "id" = ${crewMemberId}
            AND "organizationId" = ${organizationId}
          FOR UPDATE
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let lockedId: number | undefined;

        for await (const row of tx.query(lockPlan)) {
          lockedId = row.id;
          break;
        }

        if (lockedId === undefined) {
          return {
            kind: "crew_not_found" as const,
          };
        }
      }

      const currentAssignment =
        await tx.orm.public.CrewAssignment
          .where({
            id: assignmentId,
            eventId,
          })
          .first();

      if (!currentAssignment) {
        return {
          kind: "assignment_not_found" as const,
        };
      }

      if (
        currentAssignment.assignmentStatus !==
          existingAssignment.assignmentStatus ||
        currentAssignment.crewMemberId !==
          existingAssignment.crewMemberId
      ) {
        return {
          kind: "concurrent_change" as const,
        };
      }

      if (
        isActiveStatus(requestedStatus) &&
        finalCallTime &&
        finalReleaseTime
      ) {
        const conflictPlan = db.raw.sql`
          SELECT
            "id"
          FROM "crewAssignment"
          WHERE "crewMemberId" = ${requestedCrewMemberId}
            AND "id" <> ${assignmentId}
            AND "assignmentStatus" IN (
              'PLANNED',
              'CONFIRMED',
              'CHECKED_IN'
            )
            AND "callTime" IS NOT NULL
            AND "releaseTime" IS NOT NULL
            AND "callTime" < ${finalReleaseTime}
            AND "releaseTime" > ${finalCallTime}
          ORDER BY "id"
          LIMIT 1
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let conflictId: number | undefined;

        for await (const row of tx.query(
          conflictPlan,
        )) {
          conflictId = row.id;
          break;
        }

        if (conflictId !== undefined) {
          return {
            kind: "conflict" as const,
            conflictId,
          };
        }
      }

      const updatedAssignment =
        await tx.orm.public.CrewAssignment
          .where({
            id: assignmentId,
            eventId,
          })
          .update(updateData);

      return {
        kind: "success" as const,
        assignment: updatedAssignment,
      };
    });

    if (result.kind === "crew_not_found") {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
      );
    }

    if (result.kind === "assignment_not_found") {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
      );
    }

    if (result.kind === "concurrent_change") {
      return NextResponse.json(
        {
          error:
            "Crew assignment was changed by another operation. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    if (result.kind === "conflict") {
      return NextResponse.json(
        {
          error:
            "Crew member has an overlapping active assignment.",
          conflictAssignmentId:
            result.conflictId,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Update crew assignment failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to update crew assignment." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  try {
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

    const params = await context.params;
    const eventId = Number(params.id);
    const assignmentId = Number(params.assignmentId);

    if (
      !Number.isInteger(eventId) ||
      eventId <= 0 ||
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
        { status: 400 },
      );
    }

    const assignment = await getAssignment(
      eventId,
      assignmentId,
      authContext.organization.id,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
      );
    }

    if (
      assignment.assignmentStatus ===
        "CHECKED_IN" ||
      assignment.assignmentStatus ===
        "COMPLETED"
    ) {
      return NextResponse.json(
        {
          error:
            "Checked-in or completed crew assignments cannot be deleted.",
        },
        { status: 409 },
      );
    }

    await db.orm.public.CrewAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .delete();

    return NextResponse.json({
      success: true,
      message: "Crew assignment deleted.",
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Delete crew assignment failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to delete crew assignment." },
      { status: 500 },
    );
  }
}
