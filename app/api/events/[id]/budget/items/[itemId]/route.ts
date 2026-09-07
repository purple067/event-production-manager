import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "../../../../../../../src/lib/session";
import { db } from "../../../../../../../src/prisma/db";

async function getBudgetItemContext(
  eventId: number,
  itemId: number,
) {
  const budget = await db.orm.public.Budget
    .where({
      eventId,
    })
    .first();

  if (!budget) {
    return null;
  }

  const item = await db.orm.public.BudgetItem
    .where({
      id: itemId,
      budgetId: budget.id,
    })
    .first();

  if (!item) {
    return null;
  }

  return {
    budget,
    item,
  };
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, itemId } = await params;
  const eventId = Number(id);
  const budgetItemId = Number(itemId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(budgetItemId) ||
    budgetItemId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or item ID." },
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

  const result = await getBudgetItemContext(eventId, budgetItemId);

  if (!result) {
    return NextResponse.json(
      { error: "Budget item not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    item: result.item,
  });
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, itemId } = await params;
  const eventId = Number(id);
  const budgetItemId = Number(itemId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(budgetItemId) ||
    budgetItemId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or item ID." },
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

  const result = await getBudgetItemContext(eventId, budgetItemId);

  if (!result) {
    return NextResponse.json(
      { error: "Budget item not found." },
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

  const data: {
    category?: string;
    description?: string | null;
    estimatedCost?: string;
    actualCost?: string;
    notes?: string | null;
  } = {};

  if (body.category !== undefined) {
    if (
      typeof body.category !== "string" ||
      !body.category.trim()
    ) {
      return NextResponse.json(
        { error: "Category must be a non-empty string." },
        { status: 400 },
      );
    }

    data.category = body.category.trim();
  }

  if (body.description !== undefined) {
    if (
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return NextResponse.json(
        { error: "Description must be a string or null." },
        { status: 400 },
      );
    }

    data.description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (body.estimatedCost !== undefined) {
    const estimatedCost = Number(body.estimatedCost);

    if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
      return NextResponse.json(
        {
          error:
            "estimatedCost must be a non-negative number.",
        },
        { status: 400 },
      );
    }

    data.estimatedCost = String(estimatedCost);
  }

  if (body.actualCost !== undefined) {
    const actualCost = Number(body.actualCost);

    if (!Number.isFinite(actualCost) || actualCost < 0) {
      return NextResponse.json(
        {
          error:
            "actualCost must be a non-negative number.",
        },
        { status: 400 },
      );
    }

    data.actualCost = String(actualCost);
  }

  if (body.notes !== undefined) {
    if (
      body.notes !== null &&
      typeof body.notes !== "string"
    ) {
      return NextResponse.json(
        { error: "Notes must be a string or null." },
        { status: 400 },
      );
    }

    data.notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update." },
      { status: 400 },
    );
  }

  const item = await db.orm.public.BudgetItem
    .where({
      id: budgetItemId,
      budgetId: result.budget.id,
    })
    .update(data);

  if (!item) {
    return NextResponse.json(
      { error: "Budget item not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, itemId } = await params;
  const eventId = Number(id);
  const budgetItemId = Number(itemId);

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(budgetItemId) ||
    budgetItemId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid event or item ID." },
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

  const result = await getBudgetItemContext(eventId, budgetItemId);

  if (!result) {
    return NextResponse.json(
      { error: "Budget item not found." },
      { status: 404 },
    );
  }

  const deleted = await db.orm.public.BudgetItem
    .where({
      id: budgetItemId,
      budgetId: result.budget.id,
    })
    .delete();

  if (!deleted) {
    return NextResponse.json(
      { error: "Budget item not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "Budget item deleted successfully.",
  });
}
