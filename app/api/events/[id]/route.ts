import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../../src/lib/auth";
import { db } from "../../../../src/prisma/db";

type EventRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateEventBody = {
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

  return user;
}

function parseEventId(id: string) {
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return null;
  }

  return eventId;
}

export async function GET(
  _request: Request,
  { params }: EventRouteProps,
) {
  try {
    const { id } = await params;
    const eventId = parseEventId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

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
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    const event = await db.orm.public.Event
      .where({
        id: eventId,
        organizationId: membership.organizationId,
      })
      .first();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Get event failed:", error);

    return NextResponse.json(
      { error: "Unable to load event." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: EventRouteProps,
) {
  try {
    const { id } = await params;
    const eventId = parseEventId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

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
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    const event = await db.orm.public.Event
      .where({
        id: eventId,
        organizationId: membership.organizationId,
      })
      .first();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateEventBody;

    const name =
      body.name !== undefined
        ? body.name.trim()
        : event.name;

    const description =
      body.description !== undefined
        ? body.description.trim() || null
        : event.description;

    const startDate =
      body.startDate !== undefined
        ? body.startDate
        : event.startDate;

    const endDate =
      body.endDate !== undefined
        ? body.endDate
        : event.endDate;

    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
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
      body.status !== undefined
        ? (body.status as EventStatus)
        : event.status;

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
        {
          error:
            "End date must be after the start date.",
        },
        { status: 400 },
      );
    }

    const updatedEvent =
      await db.orm.public.Event
        .where({
          id: eventId,
          organizationId: membership.organizationId,
        })
        .update({
          name,
          description,
          status,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });

    if (!updatedEvent) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Update event failed:", error);

    return NextResponse.json(
      { error: "Unable to update event." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: EventRouteProps,
) {
  try {
    const { id } = await params;
    const eventId = parseEventId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

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
        {
          error:
            "No active organization membership found.",
        },
        { status: 403 },
      );
    }

    const deletedEvent =
      await db.orm.public.Event
        .where({
          id: eventId,
          organizationId: membership.organizationId,
        })
        .delete();

    if (!deletedEvent) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      event: deletedEvent,
    });
  } catch (error) {
    console.error("Delete event failed:", error);

    return NextResponse.json(
      { error: "Unable to delete event." },
      { status: 500 },
    );
  }
}
