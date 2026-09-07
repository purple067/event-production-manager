import { NextResponse } from "next/server";
import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getVendorId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await params;
  const id = getVendorId(idParam);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid vendor ID." },
      { status: 400 },
    );
  }

  const vendor = await db.orm.public.Vendor
    .where({
      id,
      organizationId: context.organization.id,
    })
    .first();

  if (!vendor) {
    return NextResponse.json(
      { error: "Vendor not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ vendor });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await params;
  const id = getVendorId(idParam);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid vendor ID." },
      { status: 400 },
    );
  }

  const existing = await db.orm.public.Vendor
    .where({
      id,
      organizationId: context.organization.id,
    })
    .first();

  if (!existing) {
    return NextResponse.json(
      { error: "Vendor not found." },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    const data: {
      name?: string;
      contactPerson?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      serviceType?: string | null;
      notes?: string | null;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Vendor name cannot be empty." },
          { status: 400 },
        );
      }

      data.name = body.name.trim();
    }

    if (body.contactPerson !== undefined) {
      data.contactPerson =
        typeof body.contactPerson === "string"
          ? body.contactPerson.trim() || null
          : null;
    }

    if (body.email !== undefined) {
      data.email =
        typeof body.email === "string"
          ? body.email.trim() || null
          : null;
    }

    if (body.phone !== undefined) {
      data.phone =
        typeof body.phone === "string"
          ? body.phone.trim() || null
          : null;
    }

    if (body.address !== undefined) {
      data.address =
        typeof body.address === "string"
          ? body.address.trim() || null
          : null;
    }

    if (body.city !== undefined) {
      data.city =
        typeof body.city === "string"
          ? body.city.trim() || null
          : null;
    }

    if (body.serviceType !== undefined) {
      data.serviceType =
        typeof body.serviceType === "string"
          ? body.serviceType.trim() || null
          : null;
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string"
          ? body.notes.trim() || null
          : null;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    const vendor = await db.orm.public.Vendor
      .where({
        id,
        organizationId: context.organization.id,
      })
      .update(data);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ vendor });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const context = await getCurrentContext();

  if (!context) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: idParam } = await params;
  const id = getVendorId(idParam);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid vendor ID." },
      { status: 400 },
    );
  }

  const vendor = await db.orm.public.Vendor
    .where({
      id,
      organizationId: context.organization.id,
    })
    .first();

  if (!vendor) {
    return NextResponse.json(
      { error: "Vendor not found." },
      { status: 404 },
    );
  }

  await db.orm.public.Vendor
    .where({
      id,
      organizationId: context.organization.id,
    })
    .delete();

  return NextResponse.json({
    success: true,
  });
}
