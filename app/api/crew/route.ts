import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../src/lib/auth";
import { db } from "../../../src/prisma/db";

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

type CreateCrewBody = {
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
  crewType?: string;
  status?: string;
  skills?: string;
  notes?: string;
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

  if (!user) {
    return null;
  }

  return user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const membership =
      await db.orm.public.OrganizationMembership
        .where({
          userId: user.id,
          status: "ACTIVE",
        })
        .first();

    if (!membership) {
      return NextResponse.json(
        { error: "No active organization membership found." },
        { status: 403 },
      );
    }

    const crewMembers = await db.orm.public.CrewMember
      .where({
        organizationId: membership.organizationId,
      })
      .orderBy((crew) => crew.name.asc())
      .all();

    return NextResponse.json({
      crewMembers,
    });
  } catch (error) {
    console.error("Get crew members failed:", error);

    return NextResponse.json(
      { error: "Unable to load crew members." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CreateCrewBody;

    const name = body.name?.trim();

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

    const membership =
      await db.orm.public.OrganizationMembership
        .where({
          userId: user.id,
          status: "ACTIVE",
        })
        .first();

    if (!membership) {
      return NextResponse.json(
        { error: "No active organization membership found." },
        { status: 403 },
      );
    }

    const crewType: CrewType =
      body.crewType !== undefined
        ? (body.crewType as CrewType)
        : "FREELANCER";

    const status: CrewStatus =
      body.status !== undefined
        ? (body.status as CrewStatus)
        : "ACTIVE";

    const crewMember = await db.orm.public.CrewMember.create({
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      designation: body.designation?.trim() || null,
      crewType,
      status,
      skills: body.skills?.trim() || null,
      notes: body.notes?.trim() || null,
      organizationId: membership.organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        crewMember,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create crew member failed:", error);

    return NextResponse.json(
      { error: "Unable to create crew member." },
      { status: 500 },
    );
  }
}
