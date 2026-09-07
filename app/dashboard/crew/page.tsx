import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";

export default async function CrewPage() {
  const context = await getCurrentContext();

  if (!context) {
    return null;
  }

  const crewMembers = await db.orm.public.CrewMember
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((crew) => crew.name.asc())
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Crew
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your event production crew and freelancers.
          </p>
        </div>

        <Link
          href="/dashboard/crew/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          Add Crew Member
        </Link>
      </div>

      {crewMembers.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <h2 className="font-medium">No crew members yet</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first crew member to start building your
              production team.
            </p>

            <Link
              href="/dashboard/crew/new"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              Add Crew Member
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crewMembers.map((crewMember) => (
            <Card key={crewMember.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{crewMember.name}</CardTitle>

                    {crewMember.designation && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {crewMember.designation}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant={
                      crewMember.status === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {crewMember.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    Type:{" "}
                  </span>
                  {crewMember.crewType.replace("_", " ")}
                </div>

                {crewMember.email && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Email:{" "}
                    </span>
                    {crewMember.email}
                  </div>
                )}

                {crewMember.phone && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Phone:{" "}
                    </span>
                    {crewMember.phone}
                  </div>
                )}

                {crewMember.skills && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Skills:{" "}
                    </span>
                    {crewMember.skills}
                  </div>
                )}

                <Link
                  href={`/dashboard/crew/${crewMember.id}/edit`}
                  className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Edit Crew Member
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
