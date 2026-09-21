import { notFound } from "next/navigation";
import { requireCurrentContext } from "../../../../../src/lib/authorization";
import { db } from "../../../../../src/prisma/db";
import MilestonesClient from "./milestones-client";

export default async function MilestonesPage({
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
    .orderBy((crewMember) => crewMember.name.asc())
    .all();

  const milestones = await db.orm.public.Milestone
    .where({
      eventId,
    })
    .orderBy((milestone) => milestone.startTime.asc())
    .all();

  return (
    <MilestonesClient
      event={event}
      departments={departments}
      crewMembers={crewMembers}
      initialMilestones={milestones}
    />
  );
}
