import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../src/lib/authorization";
import { db } from "../../../../../src/prisma/db";

const allowedStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

const creatableStatuses = [
  "PLANNED",
  "CONFIRMED",
] as const;

const activeStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

type AssignmentStatus = (typeof allowedStatuses)[number];

type CreateAssignmentBody = {
  crewMemberId?: number;
  departmentId?: number;
  role?: string;
  assignmentStatus?: string;
  callTime?: string;
  releaseTime?: string;
  rate?: number;
  rateUnit?: string;
  notes?: string;
};

async function getEvent(
  eventId: number,
  organizationId: number,
) {
  return db.orm.public.Event
    .where({
      id: eventId,
      organizationId,
    })
    .first();
}

function parseDate(
  value: string | undefined,
): string | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const authContext = await requireCurrentContext();

    const eventId = Number(
      (await context.params).id,
    );

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const event = await getEvent(
      eventId,
      authContext.organization.id,
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const assignments =
      await db.orm.public.CrewAssignment
        .where({
          eventId,
        })
        .orderBy((assignment) =>
          assignment.callTime.asc(),
        )
        .all();

    return NextResponse.json({
      assignments,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Get event crew failed:", error);

    return NextResponse.json(
      { error: "Unable to load event crew." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
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

    const eventId = Number(
      (await context.params).id,
    );

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const organizationId = authContext.organization.id;

    const event = await getEvent(
      eventId,
      organizationId,
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    let body: CreateAssignmentBody;

    try {
      body = (await request.json()) as CreateAssignmentBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    if (
      body.crewMemberId === undefined ||
      !Number.isInteger(body.crewMemberId) ||
      body.crewMemberId <= 0
    ) {
      return NextResponse.json(
        { error: "A valid crew member is required." },
        { status: 400 },
      );
    }

    const crewMemberId = body.crewMemberId;

    const crewMember =
      await db.orm.public.CrewMember
        .where({
          id: crewMemberId,
          organizationId,
        })
        .first();

    if (!crewMember) {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
      );
    }

    let departmentId: number | null = null;

    if (body.departmentId !== undefined) {
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

      departmentId = body.departmentId;
    }

    if (
      body.assignmentStatus !== undefined &&
      !allowedStatuses.includes(
        body.assignmentStatus as AssignmentStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid assignment status." },
        { status: 400 },
      );
    }

    const assignmentStatus: AssignmentStatus =
      body.assignmentStatus !== undefined
        ? (body.assignmentStatus as AssignmentStatus)
        : "PLANNED";

    if (
      !creatableStatuses.includes(
        assignmentStatus as (typeof creatableStatuses)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "New crew assignments must be PLANNED or CONFIRMED.",
        },
        { status: 400 },
      );
    }

    const callTime = parseDate(body.callTime);
    const releaseTime = parseDate(body.releaseTime);

    if (
      body.callTime !== undefined &&
      callTime === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid call time." },
        { status: 400 },
      );
    }

    if (
      body.releaseTime !== undefined &&
      releaseTime === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid release time." },
        { status: 400 },
      );
    }

    if (
      callTime &&
      releaseTime &&
      new Date(releaseTime) <= new Date(callTime)
    ) {
      return NextResponse.json(
        {
          error:
            "Release time must be after call time.",
        },
        { status: 400 },
      );
    }

    const role = body.role?.trim() || null;
    const rateUnit = body.rateUnit?.trim() || null;
    const notes = body.notes?.trim() || null;

    const result = await db.transaction(async (tx) => {
      /*
       * Serialize all assignments for this crew member.
       *
       * The lock is deliberately taken before checking for
       * overlapping assignments. Two concurrent POST requests
       * for the same crew member therefore cannot both pass
       * the conflict check.
       */

      const crewLockPlan = db.raw.sql`
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

      let lockedCrewMemberId: number | undefined;

      for await (const row of tx.query(crewLockPlan)) {
        lockedCrewMemberId = row.id;
        break;
      }

      if (lockedCrewMemberId === undefined) {
        return {
          kind: "crew_not_found" as const,
        };
      }

      /*
       * Only active assignments consume crew availability.
       *
       * Half-open intervals are used:
       *
       * existing.callTime < new.releaseTime
       * AND
       * existing.releaseTime > new.callTime
       *
       * Therefore:
       *   10:00-18:00 + 18:00-22:00 = no conflict
       *   10:00-18:00 + 17:00-19:00 = conflict
       */

      if (
        activeStatuses.includes(
          assignmentStatus as (typeof activeStatuses)[number],
        ) &&
        callTime &&
        releaseTime
      ) {
        const conflictPlan = db.raw.sql`
          SELECT
            "id"
          FROM "crewAssignment"
          WHERE "crewMemberId" = ${crewMemberId}
            AND "assignmentStatus" IN (
              'PLANNED',
              'CONFIRMED',
              'CHECKED_IN'
            )
            AND "callTime" IS NOT NULL
            AND "releaseTime" IS NOT NULL
            AND "callTime" < ${releaseTime}
            AND "releaseTime" > ${callTime}
          ORDER BY "id"
          LIMIT 1
        `
          .returnsRow({
            id: "pg/int4@1",
          })
          .build();

        let conflictId: number | undefined;

        for await (const row of tx.query(conflictPlan)) {
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

      const assignment =
        await tx.orm.public.CrewAssignment.create({
          crewMemberId,
          eventId,
          departmentId,
          role,
          assignmentStatus,
          callTime,
          releaseTime,
          rate:
            body.rate !== undefined &&
            body.rate !== null
              ? String(body.rate)
              : null,
          rateUnit,
          notes,
        });

      return {
        kind: "success" as const,
        assignment,
      };
    });

    if (result.kind === "crew_not_found") {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
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

    return NextResponse.json(
      {
        success: true,
        assignment: result.assignment,
      },
      { status: 201 },
    );
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Create crew assignment failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to create crew assignment." },
      { status: 500 },
    );
  }
}
