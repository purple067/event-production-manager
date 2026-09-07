import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventCrewPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    notFound();
  }

  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
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

  const assignments = await db.orm.public.CrewAssignment
    .where({
      eventId,
    })
    .all();

  const assignmentDetails = await Promise.all(
    assignments.map(async (assignment) => {
      const crewMember = await db.orm.public.CrewMember
        .where({
          id: assignment.crewMemberId,
          organizationId: context.organization.id,
        })
        .first();

      const department = assignment.departmentId
        ? await db.orm.public.Department
            .where({
              id: assignment.departmentId,
              eventId,
            })
            .first()
        : null;

      return {
        assignment,
        crewMember,
        department,
      };
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to Event
          </Link>

          <h1 className="mt-2 text-2xl font-bold">
            Event Crew
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage crew assignments for {event.name}.
          </p>
        </div>

        <Link
          href={`/dashboard/events/${event.id}/crew/new`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Assign Crew
        </Link>
      </div>

      {assignmentDetails.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="font-semibold">
            No crew assigned
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Start by assigning a crew member to this event.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  Assignment
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Crew Member
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Department
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Status
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Call Time
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Release Time
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Rate
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {assignmentDetails.map(
                ({ assignment, crewMember, department }) => (
                  <tr
                    key={assignment.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {assignment.role ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {crewMember?.name ?? "Unknown Crew Member"}
                        </p>

                        {crewMember?.designation && (
                          <p className="text-xs text-muted-foreground">
                            {crewMember.designation}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {department?.name ?? "—"}

                      {department?.type && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {department.type}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {assignment.assignmentStatus}
                    </td>

                    <td className="px-4 py-3">
                      {assignment.callTime
                        ? new Date(
                            assignment.callTime,
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {assignment.releaseTime
                        ? new Date(
                            assignment.releaseTime,
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {assignment.rate
                        ? `${assignment.rate} ${
                            assignment.rateUnit ?? ""
                          }`
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/events/${event.id}/crew/${assignment.id}/edit`}
                        className="text-sm font-medium hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
