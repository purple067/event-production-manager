import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { db } from "../prisma/db";

const CURRENT_ORGANIZATION_COOKIE = "epm_current_org";

export async function getCurrentContext() {
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

  if (!user) {
    return null;
  }

  const memberships = await db.orm.public.OrganizationMembership
    .where({
      userId: user.id,
    })
    .all();

  if (memberships.length === 0) {
    return null;
  }

  const organizations = await Promise.all(
    memberships.map(async (membership) => {
      const organization = await db.orm.public.Organization
        .where({
          id: membership.organizationId,
        })
        .first();

      return {
        membership,
        organization,
      };
    }),
  );

  const validOrganizations = organizations.filter(
    (item) =>
      item.organization !== null &&
      item.membership.status === "ACTIVE",
  );

  if (validOrganizations.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const currentOrganizationCookie = cookieStore.get(
    CURRENT_ORGANIZATION_COOKIE,
  );

  let current = null;

  if (currentOrganizationCookie?.value) {
    const organizationId = Number(currentOrganizationCookie.value);

    if (Number.isInteger(organizationId)) {
      current =
        validOrganizations.find(
          (item) => item.organization?.id === organizationId,
        ) ?? null;
    }
  }

  if (!current) {
    current = validOrganizations[0];
  }

  if (!current.organization) {
    return null;
  }

  return {
    session,
    authUser: session.user,
    user,
    membership: current.membership,
    organization: current.organization,
    organizations: validOrganizations,
  };
}