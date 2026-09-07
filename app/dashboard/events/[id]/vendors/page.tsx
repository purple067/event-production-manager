import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusVariant = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "default";
    case "IN_PROGRESS":
      return "secondary";
    case "COMPLETED":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatCurrency = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `NPR ${value}`;
  }

  return `NPR ${amount.toLocaleString("en-NP")}`;
};

export default async function EventVendorsPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    notFound();
  }

  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const organizationId = context.organization.id;

  const event = await db.orm.public.Event
    .where({
      id: eventId,
      organizationId,
    })
    .first();

  if (!event) {
    notFound();
  }

  const assignments = await db.orm.public.EventVendorAssignment
    .where({
      eventId,
    })
    .orderBy((assignment) => assignment.createdAt.desc())
    .all();

  const vendors = await db.orm.public.Vendor
    .where({
      organizationId,
    })
    .all();

  const departments = await db.orm.public.Department
    .where({
      eventId,
    })
    .all();

  const vendorMap = new Map(
    vendors.map((vendor) => [vendor.id, vendor]),
  );

  const departmentMap = new Map(
    departments.map((department) => [department.id, department]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="hover:underline"
            >
              {event.name}
            </Link>
            <span>/</span>
            <span>Vendors</span>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Vendor Assignments
          </h1>

          <p className="mt-1 text-muted-foreground">
            Manage vendors and services assigned to this event.
          </p>
        </div>

        <Link href={`/dashboard/events/${eventId}/vendors/new`}>
          <Button>Add Vendor</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {assignments.length}{" "}
            {assignments.length === 1 ? "Assignment" : "Assignments"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No vendors assigned yet.</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add a vendor to this event to start managing vendor services.
              </p>

              <Link
                href={`/dashboard/events/${eventId}/vendors/new`}
                className="mt-4 inline-block"
              >
                <Button>Add First Vendor</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-3 font-medium">Vendor</th>
                    <th className="px-3 py-3 font-medium">Service</th>
                    <th className="px-3 py-3 font-medium">Department</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Quoted</th>
                    <th className="px-3 py-3 font-medium">Agreed</th>
                    <th className="px-3 py-3 font-medium">Schedule</th>
                    <th className="px-3 py-3 font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignments.map((assignment) => {
                    const vendor = vendorMap.get(assignment.vendorId);
                    const department = assignment.departmentId
                      ? departmentMap.get(assignment.departmentId)
                      : null;

                    return (
                      <tr
                        key={assignment.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-4">
                          <div className="font-medium">
                            {vendor?.name ?? "Unknown Vendor"}
                          </div>

                          {vendor?.contactPerson && (
                            <div className="text-xs text-muted-foreground">
                              {vendor.contactPerson}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <div className="font-medium">
                            {assignment.serviceName}
                          </div>

                          {assignment.description && (
                            <div className="max-w-xs text-xs text-muted-foreground">
                              {assignment.description}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {department?.name ?? "—"}
                        </td>

                        <td className="px-3 py-4">
                          <Badge variant={statusVariant(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </td>

                        <td className="px-3 py-4">
                          {formatCurrency(assignment.quotedCost)}
                        </td>

                        <td className="px-3 py-4 font-medium">
                          {formatCurrency(assignment.agreedCost)}
                        </td>

                        <td className="px-3 py-4">
                          <div className="whitespace-nowrap text-xs">
                            {formatDate(assignment.startDate)}
                          </div>

                          {assignment.endDate && (
                            <div className="whitespace-nowrap text-xs text-muted-foreground">
                              to {formatDate(assignment.endDate)}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-right">
                          <Link
                            href={`/dashboard/events/${eventId}/vendors/${assignment.id}/edit`}
                          >
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Link href={`/dashboard/events/${eventId}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>
    </div>
  );
}
