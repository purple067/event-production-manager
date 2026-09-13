import { NextResponse } from "next/server";
import { getCurrentContext } from "@/src/lib/session";
import { db } from "@/src/prisma/db";

function parsePositiveInt(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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

  const resolvedParams = await params;

  const eventId = parsePositiveInt(resolvedParams.id);
  const assignmentId = parsePositiveInt(resolvedParams.assignmentId);

  if (!eventId || !assignmentId) {
    return NextResponse.json(
      { error: "Invalid ID." },
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

  const assignment = await db.orm.public.EquipmentAssignment
    .where({
      id: assignmentId,
      eventId,
    })
    .first();

  if (!assignment) {
    return NextResponse.json(
      { error: "Equipment assignment not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    const action = body.action;

    if (
      action !== "CHECK_IN" &&
      action !== "RETURN"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use CHECK_IN or RETURN.",
        },
        { status: 400 },
      );
    }

    if (action === "CHECK_IN") {
      if (
        assignment.status !== "PLANNED" &&
        assignment.status !== "CONFIRMED"
      ) {
        return NextResponse.json(
          {
            error:
              `Equipment cannot be checked in from ${assignment.status}.`,
          },
          { status: 409 },
        );
      }

      const updated = await db.orm.public.EquipmentAssignment
        .where({
          id: assignmentId,
          eventId,
        })
        .update({
          status: "CHECKED_IN",
          allocatedAt:
            assignment.allocatedAt ??
            new Date().toISOString(),
        });

      return NextResponse.json({
        assignment: updated,
      });
    }

    if (assignment.status !== "CHECKED_IN") {
      return NextResponse.json(
        {
          error:
            `Equipment cannot be returned from ${assignment.status}.`,
        },
        { status: 409 },
      );
    }

    const updated = await db.orm.public.EquipmentAssignment
      .where({
        id: assignmentId,
        eventId,
      })
      .update({
        status: "COMPLETED",
        returnedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      assignment: updated,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
