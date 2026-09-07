import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatType(type: string) {
  return type.replaceAll("_", " ");
}

export default async function DepartmentsPage({
  params,
}: PageProps) {
  const context = await getCurrentContext();

  if (!context) {
    notFound();
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId)) {
    notFound();
  }

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId: context.organization.id,
    })
    .first();

  if (!event) {
    notFound();
  }

  const departments =
    await db.orm.public.Department
      .where({
        eventId,
      })
      .all();

  departments.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-8 p-8">
      <div>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Event
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Departments
            </h1>

            <p className="mt-1 text-muted-foreground">
              Production departments for{" "}
              <span className="font-medium text-foreground">
                {event.name}
              </span>
            </p>
          </div>

          <Link
            href={`/dashboard/events/${event.id}/departments/new`}
          >
            <Button>New Department</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Production Departments
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            {departments.length}{" "}
            {departments.length === 1
              ? "department"
              : "departments"}
          </p>
        </CardHeader>

        <CardContent>
          {departments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h3 className="font-medium">
                No departments yet
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Create departments for this event to
                organize production.
              </p>

              <div className="mt-5">
                <Link
                  href={`/dashboard/events/${event.id}/departments/new`}
                >
                  <Button>
                    Create Department
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((department) => (
                <Card key={department.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">
                        {department.name}
                      </CardTitle>

                      <Badge variant="outline">
                        {formatType(department.type)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {department.notes && (
                      <p className="mb-4 text-sm text-muted-foreground">
                        {department.notes}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/events/${event.id}/departments/${department.id}/edit`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                      </Link>

                      <Link
                        href={`/dashboard/events/${event.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          Event
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
