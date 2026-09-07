import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../src/lib/session";
import { db } from "../../../../../../src/prisma/db";

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

  if (!budget) {
    return NextResponse.json(
      { error: "Budget not found." },
      { status: 404 },
    );
  }

  const items = await db.orm.public.BudgetItem
    .where({
      budgetId: budget.id,
    })
    .orderBy((item) => item.createdAt.desc())
    .all();

  return NextResponse.json({
    budgetId: budget.id,
    items,
  });
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

  const budget = await db.orm.public.Budget
    .where({
      eventId,
    })
    .first();

  if (!budget) {
    return NextResponse.json(
      { error: "Budget not found. Create a budget first." },
      { status: 404 },
    );
  }

  let body: {
    category?: unknown;
    description?: unknown;
    estimatedCost?: unknown;
    actualCost?: unknown;
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

  const category =
    typeof body.category === "string"
      ? body.category.trim()
      : "";

  if (!category) {
    return NextResponse.json(
      { error: "Category is required." },
      { status: 400 },
    );
  }

  const estimatedCost = Number(body.estimatedCost);

  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
    return NextResponse.json(
      { error: "estimatedCost must be a non-negative number." },
      { status: 400 },
    );
  }

  const actualCost =
    body.actualCost === undefined || body.actualCost === null
      ? 0
      : Number(body.actualCost);

  if (!Number.isFinite(actualCost) || actualCost < 0) {
    return NextResponse.json(
      { error: "actualCost must be a non-negative number." },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const item = await db.orm.public.BudgetItem.create({
    budgetId: budget.id,
    category,
    description,
    estimatedCost: String(estimatedCost),
    actualCost: String(actualCost),
    notes,
  });

  return NextResponse.json({ item }, { status: 201 });
}
