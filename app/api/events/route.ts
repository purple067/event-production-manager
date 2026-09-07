import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../src/lib/auth";
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

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
      !allowedStatuses.includes(
        body.status as EventStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid event status." },
        { status: 400 },
      );
    }

    const status: EventStatus =
      body.status !== undefined &&
      allowedStatuses.includes(
        body.status as EventStatus,
      )
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

    const user = await db.orm.public.User
      .where({
        authUserId: session.user.id,
      })
      .first();

    if (!user) {
      return NextResponse.json(
        { error: "EPM user not found." },
        { status: 404 },
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
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    const event = await db.orm.public.Event.create({
      name,
      description,
      status,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      organizationId: membership.organizationId,
      createdById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        event,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create event failed:", error);

    return NextResponse.json(
      { error: "Unable to create event." },
      { status: 500 },
    );
  }
}