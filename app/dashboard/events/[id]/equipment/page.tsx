import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      return "default" as const;
    case "CHECKED_IN":
      return "secondary" as const;
    case "COMPLETED":
      return "secondary" as const;
    case "CANCELLED":
    case "NO_SHOW":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default async function EventEquipmentPage({
  params,
}: PageProps) {
  const context = await getCurrentContext();

  if (!context) {
    notFound();
  }

  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
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

  const assignments = await db.orm.public.EquipmentAssignment
    .where({
      eventId: event.id,
    })
    .orderBy((assignment) => assignment.id.desc())
    .all();

  const equipment = await Promise.all(
    assignments.map(async (assignment) => {
      const item = await db.orm.public.Equipment
        .where({
          id: assignment.equipmentId,
          organizationId: context.organization.id,
        })
        .first();

      const category = item
        ? await db.orm.public.EquipmentCategory
            .where({
              id: item.categoryId,
              organizationId: context.organization.id,
            })
            .first()
        : null;

      const department = assignment.departmentId
        ? await db.orm.public.Department
            .where({
              id: assignment.departmentId,
              eventId: event.id,
            })
            .first()
        : null;

      return {
        assignment,
        equipment: item,
        category,
        department,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              ← Back to Event
            </Link>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Equipment
          </h1>

          <p className="text-muted-foreground">
            Equipment assigned to {event.name}.
          </p>
        </div>

        <Link href={`/dashboard/events/${event.id}/equipment/new`}>
          <Button>Assign Equipment</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            Equipment Assignments
          </h2>

          <p className="text-sm text-muted-foreground">
            {assignments.length} assignment
            {assignments.length === 1 ? "" : "s"}
          </p>
        </div>

        {equipment.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">
              No equipment has been assigned to this event yet.
            </p>

            <Link
              href={`/dashboard/events/${event.id}/equipment/new`}
              className="mt-4 inline-block"
            >
              <Button>Assign Equipment</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Allocated
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Returned
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {equipment.map(
                  ({
                    assignment,
                    equipment: item,
                    category,
                    department,
                  }) => (
                    <tr
                      key={assignment.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {item?.name ?? "Unknown equipment"}
                        </div>

                        {item?.model && (
                          <div className="text-xs text-muted-foreground">
                            {item.model}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {category?.name ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        {department?.name ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        {assignment.quantity}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant={statusVariant(assignment.status)}
                        >
                          {assignment.status.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {formatDateTime(assignment.allocatedAt)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {formatDateTime(assignment.returnedAt)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/dashboard/events/${event.id}/equipment/${assignment.id}/edit`}
                        >
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
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
    </div>
  );
}
