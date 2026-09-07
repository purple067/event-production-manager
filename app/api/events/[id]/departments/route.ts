import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../../src/lib/auth";
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

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return db.orm.public.User
    .where({
      authUserId: session.user.id,
    })
    .first();
}

async function getAuthorizedEvent(
  eventId: number,
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      membership: null,
      event: null,
    };
  }

  const membership =
    await db.orm.public.OrganizationMembership
      .where({
        userId: user.id,
        status: "ACTIVE",
      })
      .first();

  if (!membership) {
    return {
      user,
      membership: null,
      event: null,
    };
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: membership.organizationId,
    })
    .first();

  return {
    user,
    membership,
    event,
  };
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const { id } = await params;
    const eventId = parseId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const result =
      await getAuthorizedEvent(eventId);

    if (!result.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    if (!result.membership) {
      return NextResponse.json(
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    if (!result.event) {
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
    const { id } = await params;
    const eventId = parseId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const result =
      await getAuthorizedEvent(eventId);

    if (!result.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    if (!result.membership) {
      return NextResponse.json(
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    if (!result.event) {
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
