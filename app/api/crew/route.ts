import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../src/lib/authorization";

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

export async function GET() {
  try {
    const context = await requireCurrentContext();

    const crewMembers = await db.orm.public.CrewMember
      .where({
        organizationId: context.organization.id,
      })
      .orderBy((crew) => crew.name.asc())
      .all();

    return NextResponse.json({
      crewMembers,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Get crew members failed:", error);

    return NextResponse.json(
      { error: "Unable to load crew members." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCurrentContext();

    requireRole(
      context,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

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
      organizationId: context.organization.id,
    });

    return NextResponse.json(
      {
        success: true,
        crewMember,
      },
      { status: 201 },
    );
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Create crew member failed:", error);

    return NextResponse.json(
      { error: "Unable to create crew member." },
      { status: 500 },
    );
  }
}
