import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../src/lib/authorization";
import { db } from "../../../../../src/prisma/db";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type CreateDepartmentBody = {
  name?: string;
  type?: string;
  notes?: string;
};

const allowedDepartmentTypes = [
  "AUDIO",
  "LIGHTING",
  "VIDEO",
  "STAGE",
  "POWER",
  "RIGGING",
  "STREAMING",
  "SPECIAL_EFFECTS",
  "SECURITY",
  "TRANSPORT",
  "OTHER",
] as const;

type DepartmentType =
  (typeof allowedDepartmentTypes)[number];

function parseId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const authContext = await requireCurrentContext();

    const { id } = await params;
    const eventId = parseId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const event = await db.orm.public.Event
      .where({
        id: eventId,
        organizationId: authContext.organization.id,
      })
      .first();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const departments =
      await db.orm.public.Department
        .where({
          eventId,
        })
        .all();

    departments.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return NextResponse.json({
      success: true,
      departments,
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Get departments failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load departments." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteProps,
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

    const { id } = await params;
    const eventId = parseId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const event = await db.orm.public.Event
      .where({
        id: eventId,
        organizationId: authContext.organization.id,
      })
      .first();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const body =
      (await request.json()) as CreateDepartmentBody;

    const name = body.name?.trim();
    const notes =
      body.notes?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { error: "Department name is required." },
        { status: 400 },
      );
    }

    if (
      !body.type ||
      !allowedDepartmentTypes.includes(
        body.type as DepartmentType,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid department type." },
        { status: 400 },
      );
    }

    const department =
      await db.orm.public.Department.create({
        name,
        type: body.type as DepartmentType,
        notes,
        eventId,
      });

    return NextResponse.json(
      {
        success: true,
        department,
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
      "Create department failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to create department." },
      { status: 500 },
    );
  }
}
