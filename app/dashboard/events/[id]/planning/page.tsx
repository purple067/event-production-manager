import { notFound, redirect } from "next/navigation";
import { getCurrentContext } from "../../../../../src/lib/session";
import { db } from "../../../../../src/prisma/db";
import PlanningClient from "./planning-client";

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
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
    .orderBy((crewMember) => crewMember.name.asc())
    .all();

  const tasks = await db.orm.public.ProductionTask
    .where({
      eventId,
    })
    .orderBy((task) => task.dueDate.asc())
    .all();

  const milestones = await db.orm.public.Milestone
    .where({
      eventId,
    })
    .orderBy((milestone) => milestone.startTime.asc())
    .all();

  return (
    <PlanningClient
      event={event}
      departments={departments}
      crewMembers={crewMembers}
      tasks={tasks}
      milestones={milestones}
    />
  );
}
