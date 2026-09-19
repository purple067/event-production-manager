import { NextResponse } from "next/server";

import { cookies } from "next/headers";

import {
  authorizationErrorResponse,
  requireCurrentContext,
} from "../../../../src/lib/authorization";

const CURRENT_ORGANIZATION_COOKIE = "epm_current_org";

export async function POST(request: Request) {
  try {
    const context = await requireCurrentContext();

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

    /*
     * getCurrentContext() already returns only ACTIVE memberships.
     * Switching is therefore limited to organizations the authenticated
     * user is already authorized to access.
     */
    const target = context.organizations.find(
      (item) => item.organization?.id === organizationId,
    );

    if (!target?.organization) {
      return NextResponse.json(
        { error: "You do not have access to this organization." },
        { status: 403 },
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(
      CURRENT_ORGANIZATION_COOKIE,
      String(organizationId),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    return NextResponse.json({
      success: true,
      organization: {
        id: target.organization.id,
        name: target.organization.name,
      },
    });
  } catch (error) {
    const authorizationResponse =
      authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Organization switch failed:", error);

    return NextResponse.json(
      { error: "Unable to switch organization." },
      { status: 500 },
    );
  }
}
