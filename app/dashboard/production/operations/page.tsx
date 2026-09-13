import { redirect } from "next/navigation";
import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";
import OperationsClient from "./operations-client";

export default async function ProductionOperationsPage() {
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const organizationId = context.organization.id;

  const events = await db.orm.public.Event
    .where({ organizationId })
    .orderBy((event) => event.startDate.asc())
    .all();

  const operations = await Promise.all(
    events.map(async (event) => {
      const [milestones, tasks, crewAssignments, equipmentAssignments, departments] =
        await Promise.all([
          db.orm.public.Milestone
            .where({ eventId: event.id })
            .orderBy((milestone) => milestone.startTime.asc())
            .all(),

          db.orm.public.ProductionTask
            .where({ eventId: event.id })
            .orderBy((task) => task.createdAt.desc())
            .all(),

          db.orm.public.CrewAssignment
            .where({ eventId: event.id })
            .orderBy((assignment) => assignment.callTime.asc())
            .all(),

          db.orm.public.EquipmentAssignment
            .where({ eventId: event.id })
            .orderBy((assignment) => assignment.allocatedAt.asc())
            .all(),

          db.orm.public.Department
            .where({ eventId: event.id })
            .orderBy((department) => department.name.asc())
            .all(),
        ]);

      return {
        event,
        milestones,
        tasks,
        crewAssignments,
        equipmentAssignments,
        departments,
      };
    }),
  );

  const crewMembers = await db.orm.public.CrewMember
    .where({ organizationId })
    .orderBy((crewMember) => crewMember.name.asc())
    .all();

  const equipment = await db.orm.public.Equipment
    .where({ organizationId })
    .orderBy((item) => item.name.asc())
    .all();

  return (
    <OperationsClient
      operations={operations}
      crewMembers={crewMembers}
      equipment={equipment}
    />
  );
}
