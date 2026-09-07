import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "LIVE":
      return "destructive";
    case "READY":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function EventsPage() {
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

  events.sort(
    (a, b) =>
      new Date(a.startDate).getTime() -
      new Date(b.startDate).getTime(),
  );

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your events and production projects.
          </p>
        </div>

        <Link href="/dashboard/events/new">
          <Button>New Event</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length}{" "}
            {events.length === 1 ? "event" : "events"} in{" "}
            {context.organization.name}
          </p>
        </CardHeader>

        <CardContent>
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h3 className="font-medium">No events yet</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Create your first event to get started.
              </p>

              <div className="mt-5">
                <Link href="/dashboard/events/new">
                  <Button>Create Event</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">
                      Event
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Start
                    </th>
                    <th className="px-4 py-3 font-medium">
                      End
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {event.name}
                        </div>

                        {event.description && (
                          <div className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                            {event.description}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant={getStatusVariant(event.status)}
                        >
                          {event.status.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                        {formatDate(event.startDate)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                        {formatDate(event.endDate)}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="text-sm font-medium underline underline-offset-4"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
