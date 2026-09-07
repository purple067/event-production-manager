import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

const ALLOWED_CURRENCIES = ["NPR", "USD", "EUR", "GBP", "INR"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
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

  const budget = await db.orm.public.Budget
    .where({
      eventId,
    })
    .first();

  return NextResponse.json({ budget });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
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

  const existingBudget = await db.orm.public.Budget
    .where({
      eventId,
    })
    .first();

  if (existingBudget) {
    return NextResponse.json(
      { error: "This event already has a budget." },
      { status: 409 },
    );
  }

  let body: {
    totalBudget?: unknown;
    currency?: unknown;
    notes?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const totalBudget = Number(body.totalBudget);

  if (!Number.isFinite(totalBudget) || totalBudget < 0) {
    return NextResponse.json(
      { error: "totalBudget must be a non-negative number." },
      { status: 400 },
    );
  }

  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : "NPR";

  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      {
        error: `Unsupported currency. Allowed currencies: ${ALLOWED_CURRENCIES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const budget = await db.orm.public.Budget.create({
    eventId,
    totalBudget: String(totalBudget),
    currency,
    notes,
  });

  return NextResponse.json({ budget }, { status: 201 });
}
