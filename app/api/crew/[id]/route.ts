import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../src/lib/auth";
import { db } from "../../../../src/prisma/db";

const allowedCrewTypes = [
  "EMPLOYEE",
  "FREELANCER",
  "CONTRACTOR",
  "INTERN",
] as const;

const allowedStatuses = [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
] as const;

type CrewType = (typeof allowedCrewTypes)[number];
type CrewStatus = (typeof allowedStatuses)[number];

type UpdateCrewBody = {
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
  crewType?: string;
  status?: string;
  skills?: string;
  notes?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getAuthenticatedUser() {
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

  return user;
}

async function getActiveOrganizationId(userId: number) {
  const membership =
    await db.orm.public.OrganizationMembership
      .where({
        userId,
        status: "ACTIVE",
      })
      .first();

  return membership?.organizationId ?? null;
}

function parseId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const organizationId = await getActiveOrganizationId(user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization membership found." },
        { status: 403 },
      );
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crew member ID." },
        { status: 400 },
      );
    }

    const crewMember = await db.orm.public.CrewMember
      .where({
        id,
        organizationId,
      })
      .first();

    if (!crewMember) {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      crewMember,
    });
  } catch (error) {
    console.error("Get crew member failed:", error);

    return NextResponse.json(
      { error: "Unable to load crew member." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const organizationId = await getActiveOrganizationId(user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization membership found." },
        { status: 403 },
      );
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crew member ID." },
        { status: 400 },
      );
    }

    const existingCrewMember =
      await db.orm.public.CrewMember
        .where({
          id,
          organizationId,
        })
        .first();

    if (!existingCrewMember) {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateCrewBody;

    const name =
      body.name !== undefined
        ? body.name.trim()
        : existingCrewMember.name;

    if (!name) {
      return NextResponse.json(
        { error: "Crew member name is required." },
        { status: 400 },
      );
    }

    if (
      body.crewType !== undefined &&
      !allowedCrewTypes.includes(body.crewType as CrewType)
    ) {
      return NextResponse.json(
        { error: "Invalid crew type." },
        { status: 400 },
      );
    }

    if (
      body.status !== undefined &&
      !allowedStatuses.includes(body.status as CrewStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid crew status." },
        { status: 400 },
      );
    }

    const crewType =
      body.crewType !== undefined
        ? (body.crewType as CrewType)
        : existingCrewMember.crewType;

    const status =
      body.status !== undefined
        ? (body.status as CrewStatus)
        : existingCrewMember.status;

    const crewMember =
      await db.orm.public.CrewMember
        .where({
          id,
          organizationId,
        })
        .update({
          name,
          email:
            body.email !== undefined
              ? body.email.trim() || null
              : existingCrewMember.email,
          phone:
            body.phone !== undefined
              ? body.phone.trim() || null
              : existingCrewMember.phone,
          designation:
            body.designation !== undefined
              ? body.designation.trim() || null
              : existingCrewMember.designation,
          crewType,
          status,
          skills:
            body.skills !== undefined
              ? body.skills.trim() || null
              : existingCrewMember.skills,
          notes:
            body.notes !== undefined
              ? body.notes.trim() || null
              : existingCrewMember.notes,
        });

    if (!crewMember) {
      return NextResponse.json(
        { error: "Unable to update crew member." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      crewMember,
    });
  } catch (error) {
    console.error("Update crew member failed:", error);

    return NextResponse.json(
      { error: "Unable to update crew member." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const organizationId = await getActiveOrganizationId(user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization membership found." },
        { status: 403 },
      );
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crew member ID." },
        { status: 400 },
      );
    }

    const existingCrewMember =
      await db.orm.public.CrewMember
        .where({
          id,
          organizationId,
        })
        .first();

    if (!existingCrewMember) {
      return NextResponse.json(
        { error: "Crew member not found." },
        { status: 404 },
      );
    }

    const deletedCrewMember =
      await db.orm.public.CrewMember
        .where({
          id,
          organizationId,
        })
        .delete();

    if (!deletedCrewMember) {
      return NextResponse.json(
        { error: "Unable to delete crew member." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      crewMember: deletedCrewMember,
    });
  } catch (error) {
    console.error("Delete crew member failed:", error);

    return NextResponse.json(
      { error: "Unable to delete crew member." },
      { status: 500 },
    );
  }
}
