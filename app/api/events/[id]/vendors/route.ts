import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

const VENDOR_ASSIGNMENT_STATUSES = [
  "PLANNED",
  "QUOTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function getEventId(params: { id: string }) {
  const eventId = Number(params.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return null;
  }

  return eventId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const eventId = getEventId(await params);

  if (!eventId) {
    return NextResponse.json(
      { error: "Invalid event ID." },
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

  const assignments = await db.orm.public.EventVendorAssignment
    .where({
      eventId,
    })
    .orderBy((assignment) => assignment.id.desc())
    .all();

  return NextResponse.json({ assignments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const eventId = getEventId(await params);

  if (!eventId) {
    return NextResponse.json(
      { error: "Invalid event ID." },
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

  try {
    const body = await request.json();

    const vendorId = Number(body.vendorId);

    const departmentId =
      body.departmentId === null ||
      body.departmentId === undefined ||
      body.departmentId === ""
        ? null
        : Number(body.departmentId);

    const serviceName =
      typeof body.serviceName === "string"
        ? body.serviceName.trim()
        : "";

    const description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null;

    const status =
      typeof body.status === "string"
        ? body.status
        : "PLANNED";

    const currency =
      typeof body.currency === "string" &&
      body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "NPR";

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    const startDate =
      typeof body.startDate === "string" &&
      body.startDate.trim()
        ? body.startDate
        : null;

    const endDate =
      typeof body.endDate === "string" &&
      body.endDate.trim()
        ? body.endDate
        : null;

    const quotedCost =
      body.quotedCost === null ||
      body.quotedCost === undefined ||
      body.quotedCost === ""
        ? null
        : String(body.quotedCost);

    const agreedCost =
      body.agreedCost === null ||
      body.agreedCost === undefined ||
      body.agreedCost === ""
        ? null
        : String(body.agreedCost);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return NextResponse.json(
        { error: "Valid vendor is required." },
        { status: 400 },
      );
    }

    if (!serviceName) {
      return NextResponse.json(
        { error: "Service name is required." },
        { status: 400 },
      );
    }

    if (
      departmentId !== null &&
      (!Number.isInteger(departmentId) || departmentId <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid department." },
        { status: 400 },
      );
    }

    if (!VENDOR_ASSIGNMENT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid vendor assignment status." },
        { status: 400 },
      );
    }

    if (quotedCost !== null) {
      const value = Number(quotedCost);

      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json(
          { error: "Quoted cost must be a valid non-negative number." },
          { status: 400 },
        );
      }
    }

    if (agreedCost !== null) {
      const value = Number(agreedCost);

      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json(
          { error: "Agreed cost must be a valid non-negative number." },
          { status: 400 },
        );
      }
    }

    const startDateValue = startDate
      ? new Date(startDate)
      : null;

    const endDateValue = endDate
      ? new Date(endDate)
      : null;

    if (
      startDateValue &&
      Number.isNaN(startDateValue.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid start date." },
        { status: 400 },
      );
    }

    if (
      endDateValue &&
      Number.isNaN(endDateValue.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid end date." },
        { status: 400 },
      );
    }

    if (
      startDateValue &&
      endDateValue &&
      endDateValue < startDateValue
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
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

    const assignment =
      await db.orm.public.EventVendorAssignment.create({
        eventId,
        vendorId,
        departmentId,
        serviceName,
        description,
        status,
        quotedCost,
        agreedCost,
        currency,
        startDate,
        endDate,
        notes,
      });

    return NextResponse.json(
      { assignment },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create vendor assignment error:", error);

    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
}
