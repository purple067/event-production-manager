import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../../src/lib/auth";
import { db } from "../../../../../src/prisma/db";

const allowedStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
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

async function getOrganizationContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const user = await db.orm.public.User
    .where({
      authUserId: session.user.id,
    })
    .first();

  if (!user) {
    return null;
  }

  const membership =
    await db.orm.public.OrganizationMembership
      .where({
        userId: user.id,
        status: "ACTIVE",
      })
      .first();

  if (!membership) {
    return null;
  }

  return {
    user,
    membership,
  };
}

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

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const organizationContext = await getOrganizationContext();

    if (!organizationContext) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const eventId = Number((await context.params).id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const event = await getEvent(
      eventId,
      organizationContext.membership.organizationId,
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
        .orderBy((assignment) => assignment.callTime.asc())
        .all();

    return NextResponse.json({
      assignments,
    });
  } catch (error) {
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
    const organizationContext = await getOrganizationContext();

    if (!organizationContext) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const eventId = Number((await context.params).id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const event = await getEvent(
      eventId,
      organizationContext.membership.organizationId,
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as CreateAssignmentBody;

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

    const crewMember =
      await db.orm.public.CrewMember
        .where({
          id: body.crewMemberId,
          organizationId:
            organizationContext.membership.organizationId,
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

    const role = body.role?.trim() || null;
    const rateUnit = body.rateUnit?.trim() || null;
    const notes = body.notes?.trim() || null;

    let callTime: string | null = null;
    let releaseTime: string | null = null;

    if (body.callTime) {
      const date = new Date(body.callTime);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid call time." },
          { status: 400 },
        );
      }

      callTime = date.toISOString();
    }

    if (body.releaseTime) {
      const date = new Date(body.releaseTime);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid release time." },
          { status: 400 },
        );
      }

      releaseTime = date.toISOString();
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

    const assignment = await db.orm.public.CrewAssignment.create({
      crewMemberId: body.crewMemberId,
      eventId,
      departmentId,
      role,
      assignmentStatus,
      callTime,
      releaseTime,
      rate:
	 body.rate !== undefined && body.rate !== null
		? String(body.rate)
		: null,
      rateUnit,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        assignment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create crew assignment failed:", error);

    return NextResponse.json(
      { error: "Unable to create crew assignment." },
      { status: 500 },
    );
  }
}
