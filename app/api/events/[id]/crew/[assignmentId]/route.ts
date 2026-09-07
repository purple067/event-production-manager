import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../../../src/lib/auth";
import { db } from "../../../../../../src/prisma/db";

const allowedStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
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

  if (!event) {
    return null;
  }

  return db.orm.public.CrewAssignment
    .where({
      id: assignmentId,
      eventId,
    })
    .first();
}

function parseDate(
  value: string | null | undefined,
) {
  if (!value) {
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
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
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
      organizationContext.membership.organizationId,
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
    console.error("Get crew assignment failed:", error);

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
    const organizationContext = await getOrganizationContext();

    if (!organizationContext) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

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
      organizationContext.membership.organizationId,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateAssignmentBody;

    const updateData: Record<string, unknown> = {};

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

      updateData.crewMemberId = body.crewMemberId;
    }

    if (body.departmentId !== undefined) {
      if (body.departmentId === null) {
        updateData.departmentId = null;
      } else {
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

        updateData.departmentId = body.departmentId;
      }
    }

    if (body.role !== undefined) {
      updateData.role = body.role?.trim() || null;
    }

    if (body.rateUnit !== undefined) {
      updateData.rateUnit =
        body.rateUnit?.trim() || null;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }

    if (body.rate !== undefined) {
      updateData.rate = body.rate;
    }

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

      updateData.assignmentStatus =
        body.assignmentStatus;
    }

    if (body.callTime !== undefined) {
      const parsed = parseDate(body.callTime);

      if (
        body.callTime !== null &&
        parsed === undefined
      ) {
        return NextResponse.json(
          { error: "Invalid call time." },
          { status: 400 },
        );
      }

      updateData.callTime = parsed;
    }

    if (body.releaseTime !== undefined) {
      const parsed = parseDate(body.releaseTime);

      if (
        body.releaseTime !== null &&
        parsed === undefined
      ) {
        return NextResponse.json(
          { error: "Invalid release time." },
          { status: 400 },
        );
      }

      updateData.releaseTime = parsed;
    }

    const finalCallTime =
      body.callTime !== undefined
        ? parseDate(body.callTime)
        : assignment.callTime;

    const finalReleaseTime =
      body.releaseTime !== undefined
        ? parseDate(body.releaseTime)
        : assignment.releaseTime;

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

    const updatedAssignment =
      await db.orm.public.CrewAssignment
        .where({
          id: assignmentId,
          eventId,
        })
        .update(updateData);

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Update crew assignment failed:", error);

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
    const organizationContext = await getOrganizationContext();

    if (!organizationContext) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

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
      organizationContext.membership.organizationId,
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "Crew assignment not found." },
        { status: 404 },
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
    console.error("Delete crew assignment failed:", error);

    return NextResponse.json(
      { error: "Unable to delete crew assignment." },
      { status: 500 },
    );
  }
}
