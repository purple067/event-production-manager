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

import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";
import { DeleteEventButton } from "./delete-event-button";

type EventDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
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

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
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

  let client = null;

  if (event.clientId) {
    client = await db.orm.public.Client
      .where({
        id: event.clientId,
        organizationId: context.organization.id,
      })
      .first();
  }

  let venue = null;

  if (event.venueId) {
    venue = await db.orm.public.Venue
      .where({
        id: event.venueId,
        organizationId: context.organization.id,
      })
      .first();
  }

  let createdBy = null;

  if (event.createdById) {
    createdBy = await db.orm.public.User
      .where({
        id: event.createdById,
      })
      .first();
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/events"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Events
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {event.name}
            </h1>

            <Badge variant={getStatusVariant(event.status)}>
              {formatStatus(event.status)}
            </Badge>
          </div>

          <p className="mt-1 text-muted-foreground">
            Event overview and production information.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Button variant="outline">Edit Event</Button>
          </Link>

          <DeleteEventButton eventId={event.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>

              <p className="mt-1">
                {event.description || "No description provided."}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Start
                </p>

                <p className="mt-1">
                  {formatDate(event.startDate)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  End
                </p>

                <p className="mt-1">
                  {formatDate(event.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Production Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Organization
              </p>

              <p className="mt-1">
                {context.organization.name}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Client
              </p>

              <p className="mt-1">
                {client?.name || "Not assigned"}
              </p>

              {client?.company && (
                <p className="text-sm text-muted-foreground">
                  {client.company}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Venue
              </p>

              <p className="mt-1">
                {venue?.name || "Not assigned"}
              </p>

              {venue?.city && (
                <p className="text-sm text-muted-foreground">
                  {venue.city}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created by
              </p>

              <p className="mt-1">
                {createdBy?.name ||
                  createdBy?.email ||
                  "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>

          <CardContent>
            <Link
              href={`/dashboard/events/${event.id}/departments`}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Manage Departments</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage audio, lighting, video, stage, power, rigging and other
                production departments for this event.
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Modules</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Production</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Production planning and tasks
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium">Crew</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crew assignments
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium">Equipment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Equipment allocation
              </p>
            </div>

            <Link
              href={`/dashboard/events/${event.id}/finance`}
              className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Finance</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Event budget and expenses
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
