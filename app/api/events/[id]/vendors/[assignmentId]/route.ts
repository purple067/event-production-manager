import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../src/lib/session";
import { db } from "../../../../../../src/prisma/db";

const VENDOR_ASSIGNMENT_STATUSES = [
  "PLANNED",
  "QUOTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function getPositiveInt(value: string) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, assignmentId: assignmentIdParam } =
    await params;

  const eventId = getPositiveInt(id);
  const assignmentId = getPositiveInt(assignmentIdParam);

  if (!eventId) {
    return NextResponse.json(
      { error: "Invalid event ID." },
      { status: 400 },
    );
  }

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Invalid assignment ID." },
      { status: 400 },
    );
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found." },
      { status: 404 },
    );
  }

  const assignment =
    await db.orm.public.EventVendorAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Vendor assignment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ assignment });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, assignmentId: assignmentIdParam } =
    await params;

  const eventId = getPositiveInt(id);
  const assignmentId = getPositiveInt(assignmentIdParam);

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid event or assignment ID." },
      { status: 400 },
    );
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found." },
      { status: 404 },
    );
  }

  const existing =
    await db.orm.public.EventVendorAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!existing) {
    return NextResponse.json(
      { error: "Vendor assignment not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    const data: {
      vendorId?: number;
      departmentId?: number | null;
      serviceName?: string;
      description?: string | null;
      status?: string;
      quotedCost?: string | null;
      agreedCost?: string | null;
      currency?: string;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
    } = {};

    if (body.vendorId !== undefined) {
      const vendorId = Number(body.vendorId);

      if (!Number.isInteger(vendorId) || vendorId <= 0) {
        return NextResponse.json(
          { error: "Invalid vendor." },
          { status: 400 },
        );
      }

      const vendor = await db.orm.public.Vendor
        .where({
          id: vendorId,
          organizationId: context.organization.id,
        })
        .first();

      if (!vendor) {
        return NextResponse.json(
          { error: "Vendor not found." },
          { status: 404 },
        );
      }

      if (!vendor.isActive) {
        return NextResponse.json(
          { error: "Vendor is inactive." },
          { status: 400 },
        );
      }

      data.vendorId = vendorId;
    }

    if (body.departmentId !== undefined) {
      const departmentId =
        body.departmentId === null ||
        body.departmentId === ""
          ? null
          : Number(body.departmentId);

      if (
        departmentId !== null &&
        (!Number.isInteger(departmentId) ||
          departmentId <= 0)
      ) {
        return NextResponse.json(
          { error: "Invalid department." },
          { status: 400 },
        );
      }

      if (departmentId !== null) {
        const department = await db.orm.public.Department
          .where({
            id: departmentId,
            eventId,
          })
          .first();

        if (!department) {
          return NextResponse.json(
            {
              error:
                "Department not found for this event.",
            },
            { status: 400 },
          );
        }
      }

      data.departmentId = departmentId;
    }

    if (body.serviceName !== undefined) {
      if (
        typeof body.serviceName !== "string" ||
        !body.serviceName.trim()
      ) {
        return NextResponse.json(
          { error: "Service name cannot be empty." },
          { status: 400 },
        );
      }

      data.serviceName = body.serviceName.trim();
    }

    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !VENDOR_ASSIGNMENT_STATUSES.includes(
          body.status,
        )
      ) {
        return NextResponse.json(
          { error: "Invalid vendor assignment status." },
          { status: 400 },
        );
      }

      data.status = body.status;
    }

    if (body.currency !== undefined) {
      if (
        typeof body.currency !== "string" ||
        !body.currency.trim()
      ) {
        return NextResponse.json(
          { error: "Currency cannot be empty." },
          { status: 400 },
        );
      }

      data.currency = body.currency.trim().toUpperCase();
    }

    if (
      body.quotedCost !== undefined
    ) {
      const quotedCost =
        body.quotedCost === null ||
        body.quotedCost === ""
          ? null
          : String(body.quotedCost);

      if (quotedCost !== null) {
        const value = Number(quotedCost);

        if (!Number.isFinite(value) || value < 0) {
          return NextResponse.json(
            {
              error:
                "Quoted cost must be a valid non-negative number.",
            },
            { status: 400 },
          );
        }
      }

      data.quotedCost = quotedCost;
    }

    if (
      body.agreedCost !== undefined
    ) {
      const agreedCost =
        body.agreedCost === null ||
        body.agreedCost === ""
          ? null
          : String(body.agreedCost);

      if (agreedCost !== null) {
        const value = Number(agreedCost);

        if (!Number.isFinite(value) || value < 0) {
          return NextResponse.json(
            {
              error:
                "Agreed cost must be a valid non-negative number.",
            },
            { status: 400 },
          );
        }
      }

      data.agreedCost = agreedCost;
    }

    if (body.startDate !== undefined) {
      const value =
        typeof body.startDate === "string" &&
        body.startDate.trim()
          ? body.startDate
          : null;

      if (value && Number.isNaN(new Date(value).getTime())) {
        return NextResponse.json(
          { error: "Invalid start date." },
          { status: 400 },
        );
      }

      data.startDate = value;
    }

    if (body.endDate !== undefined) {
      const value =
        typeof body.endDate === "string" &&
        body.endDate.trim()
          ? body.endDate
          : null;

      if (value && Number.isNaN(new Date(value).getTime())) {
        return NextResponse.json(
          { error: "Invalid end date." },
          { status: 400 },
        );
      }

      data.endDate = value;
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string"
          ? body.notes.trim() || null
          : null;
    }

    const effectiveStart =
      data.startDate !== undefined
        ? data.startDate
        : existing.startDate;

    const effectiveEnd =
      data.endDate !== undefined
        ? data.endDate
        : existing.endDate;

    if (
      effectiveStart &&
      effectiveEnd &&
      new Date(effectiveEnd) < new Date(effectiveStart)
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    const assignment =
      await db.orm.public.EventVendorAssignment
        .where({
          id: assignmentId,
          eventId,
        })
        .update(data);

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Update vendor assignment error:", error);

    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
    }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id, assignmentId: assignmentIdParam } =
    await params;

  const eventId = getPositiveInt(id);
  const assignmentId = getPositiveInt(assignmentIdParam);

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid event or assignment ID." },
      { status: 400 },
    );
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found." },
      { status: 404 },
    );
  }

  const existing =
    await db.orm.public.EventVendorAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .first();

  if (!existing) {
    return NextResponse.json(
      { error: "Vendor assignment not found." },
      { status: 404 },
    );
  }

  await db.orm.public.EventVendorAssignment
    .where({
      id: assignmentId,
      eventId,
    })
    .delete();

  return NextResponse.json({
    success: true,
  });
}
