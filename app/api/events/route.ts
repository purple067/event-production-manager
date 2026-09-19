import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../src/lib/authorization";

import { db } from "../../../src/prisma/db";

type CreateEventBody = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

const allowedStatuses = [
  "DRAFT",
  "PLANNING",
  "PRE_PRODUCTION",
  "READY",
  "LIVE",
  "COMPLETED",
  "ARCHIVED",
  "ON_HOLD",
  "CANCELLED",
] as const;

type EventStatus = (typeof allowedStatuses)[number];

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

    const body = (await request.json()) as CreateEventBody;

    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const startDate = body.startDate;
    const endDate = body.endDate;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            "Event name, start date, and end date are required.",
        },
        { status: 400 },
      );
    }

    if (
      body.status !== undefined &&
      !allowedStatuses.includes(body.status as EventStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid event status." },
        { status: 400 },
      );
    }

    const status: EventStatus =
      body.status !== undefined
        ? (body.status as EventStatus)
        : "DRAFT";

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid event dates." },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after the start date." },
        { status: 400 },
      );
    }

    const event = await db.orm.public.Event.create({
      name,
      description,
      status,
      startDate: start.toISOString(),
      endDate: end.toISOString(),

      // Tenant is always derived from the authenticated context.
      organizationId: context.organization.id,

      // Creator is always the authenticated EPM user.
      createdById: context.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        event,
      },
      { status: 201 },
    );
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Create event failed:", error);

    return NextResponse.json(
      { error: "Unable to create event." },
      { status: 500 },
    );
  }
}
