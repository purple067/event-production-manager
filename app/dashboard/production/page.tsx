import { redirect } from "next/navigation";
import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";
import ProductionClient from "./production-client";

export default async function ProductionPage() {
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const organizationId = context.organization.id;

  const events = await db.orm.public.Event
    .where({ organizationId })
    .orderBy((event) => event.startDate.asc())
    .all();

  const eventIds = events.map((event) => event.id);

  const tasks =
    eventIds.length > 0
      ? (
          await db.orm.public.ProductionTask
            .orderBy((task) => task.createdAt.desc())
            .all()
        ).filter((task) => eventIds.includes(task.eventId))
      : [];

  const milestones =
    eventIds.length > 0
      ? (
          await db.orm.public.Milestone
            .orderBy((milestone) => milestone.startTime.asc())
            .all()
        ).filter((milestone) => eventIds.includes(milestone.eventId))
      : [];

  const departments =
    eventIds.length > 0
      ? (
          await db.orm.public.Department
            .orderBy((department) => department.name.asc())
            .all()
        ).filter((department) => eventIds.includes(department.eventId))
      : [];

  const crewMembers = await db.orm.public.CrewMember
    .where({ organizationId })
    .orderBy((crewMember) => crewMember.name.asc())
    .all();

  return (
    <ProductionClient
      events={events}
      tasks={tasks}
      milestones={milestones}
      departments={departments}
      crewMembers={crewMembers}
    />
  );
}
