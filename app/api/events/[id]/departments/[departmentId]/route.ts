import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../../../src/lib/auth";
import { db } from "../../../../../../src/prisma/db";

type RouteProps = {
  params: Promise<{
    id: string;
    departmentId: string;
  }>;
};

type UpdateDepartmentBody = {
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

async function authorize(
  eventId: number,
  departmentId: number,
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      membership: null,
      event: null,
      department: null,
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
      department: null,
    };
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: membership.organizationId,
    })
    .first();

  if (!event) {
    return {
      user,
      membership,
      event: null,
      department: null,
    };
  }

  const department =
    await db.orm.public.Department
      .where({
        id: departmentId,
        eventId,
      })
      .first();

  return {
    user,
    membership,
    event,
    department,
  };
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const { id, departmentId } =
      await params;

    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await authorize(
      eventId,
      parsedDepartmentId,
    );

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

    if (!result.event || !result.department) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      department: result.department,
    });
  } catch (error) {
    console.error(
      "Get department failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load department." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteProps,
) {
  try {
    const { id, departmentId } =
      await params;

    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await authorize(
      eventId,
      parsedDepartmentId,
    );

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

    if (!result.event || !result.department) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    const body =
      (await request.json()) as UpdateDepartmentBody;

    const name =
      body.name !== undefined
        ? body.name.trim()
        : result.department.name;

    const notes =
      body.notes !== undefined
        ? body.notes.trim() || null
        : result.department.notes;

    const type =
      body.type !== undefined
        ? body.type
        : result.department.type;

    if (!name) {
      return NextResponse.json(
        { error: "Department name is required." },
        { status: 400 },
      );
    }

    if (
      !allowedDepartmentTypes.includes(
        type as DepartmentType,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid department type." },
        { status: 400 },
      );
    }

    const updated =
      await db.orm.public.Department
        .where({
          id: parsedDepartmentId,
          eventId,
        })
        .update({
          name,
          type: type as DepartmentType,
          notes,
        });

    if (!updated) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      department: updated,
    });
  } catch (error) {
    console.error(
      "Update department failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to update department." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const { id, departmentId } =
      await params;

    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await authorize(
      eventId,
      parsedDepartmentId,
    );

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

    if (!result.event || !result.department) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    const deleted =
      await db.orm.public.Department
        .where({
          id: parsedDepartmentId,
          eventId,
        })
        .delete();

    if (!deleted) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      department: deleted,
    });
  } catch (error) {
    console.error(
      "Delete department failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to delete department." },
      { status: 500 },
    );
  }
}
