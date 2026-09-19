import "server-only";

import { getCurrentContext } from "./session";

export const ROLES = [
  "OWNER",
  "ADMIN",
  "PRODUCER",
  "PRODUCTION_MANAGER",
  "DEPARTMENT_HEAD",
  "CREW",
  "VIEWER",
] as const;

export type Role = (typeof ROLES)[number];

export type CurrentContext = NonNullable<
  Awaited<ReturnType<typeof getCurrentContext>>
>;

export async function requireCurrentContext(): Promise<CurrentContext> {
  const context = await getCurrentContext();

  if (!context) {
    throw new AuthorizationError(
      "AUTHENTICATION_REQUIRED",
      "Authentication required.",
    );
  }

  return context;
}

export function requireRole(
  context: CurrentContext,
  ...allowedRoles: Role[]
): void {
  if (!allowedRoles.includes(context.membership.role as Role)) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  }
}

export function requireAnyRole(
  context: CurrentContext,
  allowedRoles: Role[],
): void {
  requireRole(context, ...allowedRoles);
}

export function isRole(
  context: CurrentContext,
  role: Role,
): boolean {
  return context.membership.role === role;
}

export class AuthorizationError extends Error {
  readonly code: "AUTHENTICATION_REQUIRED" | "FORBIDDEN";

  constructor(
    code: "AUTHENTICATION_REQUIRED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}


export function authorizationErrorResponse(
  error: unknown,
) {
  if (!(error instanceof AuthorizationError)) {
    return null;
  }

  const status =
    error.code === "AUTHENTICATION_REQUIRED"
      ? 401
      : 403;

  return Response.json(
    { error: error.message },
    { status },
  );
}
