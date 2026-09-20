import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../../../../src/lib/authorization";
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

async function getAuthorizedDepartment(
  eventId: number,
  departmentId: number,
  organizationId: number,
) {
  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId,
    })
    .first();

  if (!event) {
    return {
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
    event,
    department,
  };
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const authContext = await requireCurrentContext();

    const { id, departmentId } = await params;
    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await getAuthorizedDepartment(
      eventId,
      parsedDepartmentId,
      authContext.organization.id,
    );

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
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

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
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
      "PRODUCER",
      "PRODUCTION_MANAGER",
    );

    const { id, departmentId } = await params;
    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await getAuthorizedDepartment(
      eventId,
      parsedDepartmentId,
      authContext.organization.id,
    );

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
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

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
    const authContext = await requireCurrentContext();

    requireRole(
      authContext,
      "OWNER",
      "ADMIN",
    );

    const { id, departmentId } = await params;
    const eventId = parseId(id);
    const parsedDepartmentId =
      parseId(departmentId);

    if (!eventId || !parsedDepartmentId) {
      return NextResponse.json(
        { error: "Invalid ID." },
        { status: 400 },
      );
    }

    const result = await getAuthorizedDepartment(
      eventId,
      parsedDepartmentId,
      authContext.organization.id,
    );

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
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

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
