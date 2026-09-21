import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireCurrentContext,
  requireRole,
} from "../../../src/lib/authorization";
import { db } from "../../../src/prisma/db";

export async function GET() {
  try {
    const context = await requireCurrentContext();

    const vendors = await db.orm.public.Vendor
      .where({
        organizationId: context.organization.id,
      })
      .orderBy((vendor) => vendor.name.asc())
      .all();

    return NextResponse.json({ vendors });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    return NextResponse.json(
      { error: "Failed to load vendors." },
      { status: 500 },
    );
  }
}

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

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const contactPerson =
      typeof body.contactPerson === "string"
        ? body.contactPerson.trim()
        : null;

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : null;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : null;

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : null;

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : null;

    const serviceType =
      typeof body.serviceType === "string"
        ? body.serviceType.trim()
        : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    const isActive =
      body.isActive === undefined
        ? true
        : Boolean(body.isActive);

    if (!name) {
      return NextResponse.json(
        { error: "Vendor name is required." },
        { status: 400 },
      );
    }

    const vendor = await db.orm.public.Vendor.create({
      name,
      contactPerson: contactPerson || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      serviceType: serviceType || null,
      notes: notes || null,
      isActive,
      organizationId: context.organization.id,
    });

    return NextResponse.json(
      { vendor },
      { status: 201 },
    );
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
