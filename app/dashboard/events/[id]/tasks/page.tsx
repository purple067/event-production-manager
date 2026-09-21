import { notFound } from "next/navigation";
import { requireCurrentContext } from "../../../../../src/lib/authorization";
import { db } from "../../../../../src/prisma/db";
import TasksClient from "./tasks-client";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireCurrentContext();


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

  const departments = await db.orm.public.Department
    .where({
      eventId,
    })
    .orderBy((department) => department.name.asc())
    .all();

  const crewMembers = await db.orm.public.CrewMember
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((crew) => crew.name.asc())
    .all();

  return (
    <TasksClient
      eventId={eventId}
      eventName={event.name}
      departments={departments.map((department) => ({
        id: department.id,
        name: department.name,
        type: department.type,
      }))}
      crewMembers={crewMembers.map((crew) => ({
        id: crew.id,
        name: crew.name,
        designation: crew.designation,
      }))}
    />
  );
}
