import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentContext } from "../../src/lib/session";
import { db } from "../../src/prisma/db";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function DashboardPage() {
  const context = await getCurrentContext();

  if (!context) {
    return null;
  }

  const organizationId = context.organization.id;

  const events = await db.orm.public.Event
    .where({
      organizationId,
    })
    .all();

  const now = new Date();

  const activeStatuses = [
    "PLANNING",
    "PRE_PRODUCTION",
    "READY",
    "LIVE",
  ];

  const activeEvents = events.filter((event) =>
    activeStatuses.includes(event.status),
  );

  const upcomingEvents = events
    .filter((event) => new Date(event.startDate) >= now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {context.organization.name}
        </h1>

        <p className="mt-1 text-muted-foreground">
          Production overview and event operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Events
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {events.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active Events
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {activeEvents.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Upcoming Events
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {upcomingEvents.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Organization
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="truncate text-lg font-semibold">
              {context.organization.name}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No upcoming events</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Create your first event to get started.
              </p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{event.name}</p>

                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.startDate)}
                  </p>
                </div>

                <Badge>{event.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}