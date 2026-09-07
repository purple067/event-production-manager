import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { auth } from "../../../../src/lib/auth";
import { db } from "../../../../src/prisma/db";

const CURRENT_ORGANIZATION_COOKIE = "epm_current_org";

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

    const body = (await request.json()) as {
      organizationId?: number;
    };

    const organizationId = Number(body.organizationId);

    if (!Number.isInteger(organizationId)) {
      return NextResponse.json(
        { error: "Invalid organization ID." },
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

    const membership = await db.orm.public.OrganizationMembership
      .where({
        userId: user.id,
        organizationId,
        status: "ACTIVE",
      })
      .first();

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this organization." },
        { status: 403 },
      );
    }

    const organization = await db.orm.public.Organization
      .where({
        id: organizationId,
      })
      .first();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(CURRENT_ORGANIZATION_COOKIE, String(organizationId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Organization switch failed:", error);

    return NextResponse.json(
      { error: "Unable to switch organization." },
      { status: 500 },
    );
  }
}