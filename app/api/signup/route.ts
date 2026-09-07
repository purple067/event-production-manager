import { NextResponse } from "next/server";
import { auth } from "../../../src/lib/auth";
import { db } from "../../../src/prisma/db";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
  organizationName?: string;
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const organizationName = body.organizationName?.trim();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const slugBase = createSlug(organizationName);

    if (!slugBase) {
      return NextResponse.json(
        { error: "Invalid organization name." },
        { status: 400 },
      );
    }

    // Create the Better Auth account.
    const authResult = await auth.api.signUpEmail({
      returnHeaders: true,
      body: {
        name,
        email,
        password,
      },
    });

    if (!authResult?.response?.user) {
      return NextResponse.json(
        { error: "Unable to create authentication account." },
        { status: 500 },
      );
    }

    const authUserId = authResult.response.user.id;

    // Create the EPM records atomically.
    try {
      const result = await db.transaction(async (tx) => {
        const epmUser = await tx.orm.public.User.create({
          authUserId,
          email,
          name,
        });

        const organization = await tx.orm.public.Organization.create({
          name: organizationName,
          slug: `${slugBase}-${authUserId.slice(0, 8)}`,
        });

        await tx.orm.public.OrganizationMembership.create({
          userId: epmUser.id,
          organizationId: organization.id,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
        });

        return {
          userId: epmUser.id,
          organizationId: organization.id,
        };
      });

      // Forward Better Auth session cookies to the browser.
      const response = NextResponse.json(
        {
          success: true,
          ...result,
        },
        { status: 201 },
      );

      if (authResult.headers) {
        for (const cookie of authResult.headers.getSetCookie()) {
          response.headers.append("set-cookie", cookie);
        }
      }

      return response;
    } catch (epmError) {
      console.error("EPM bootstrap failed:", epmError);

      return NextResponse.json(
        {
          error:
            "Authentication account was created, but EPM account setup failed.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Signup failed:", error);

    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 },
    );
  }
}
