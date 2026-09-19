"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Event = {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  eventId: number;
  departmentId: number | null;
  crewMemberId: number | null;
};

type Milestone = {
  id: number;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string | null;
  eventId: number;
  departmentId: number | null;
  crewMemberId: number | null;
};

type Department = {
  id: number;
  name: string;
  eventId: number;
};

type CrewMember = {
  id: number;
  name: string;
};

type ProductionClientProps = {
  events: Event[];
  tasks: Task[];
  milestones: Milestone[];
  departments: Department[];
  crewMembers: CrewMember[];
};

const eventStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PLANNING: "Planning",
  PRE_PRODUCTION: "Pre-production",
  READY: "Ready",
  LIVE: "Live",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

const taskStatusLabel: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const milestoneStatusLabel: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
};

const priorityLabel: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ProductionClient({
  events,
  tasks,
  milestones,
  departments,
  crewMembers,
}: ProductionClientProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeEvents = events.filter((event) =>
    ["PLANNING", "PRE_PRODUCTION", "READY", "LIVE"].includes(
      event.status,
    ),
  );

  const openTasks = tasks
    .filter(
      (task) => !["DONE", "CANCELLED"].includes(task.status),
    )
    .sort((a, b) => {
      const statusRank: Record<string, number> = {
        BLOCKED: 0,
        IN_PROGRESS: 1,
        TODO: 2,
      };

      const priorityRank: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };

      const aStatus = statusRank[a.status] ?? 99;
      const bStatus = statusRank[b.status] ?? 99;

      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      const aPriority = priorityRank[a.priority] ?? 99;
      const bPriority = priorityRank[b.priority] ?? 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aDue = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.POSITIVE_INFINITY;

      const bDue = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.POSITIVE_INFINITY;

      return aDue - bDue;
    });

  const criticalTasks = openTasks.filter(
    (task) => task.priority === "CRITICAL",
  );



  const upcomingMilestones = milestones
    .filter(
      (milestone) =>
        !["COMPLETED", "CANCELLED", "SKIPPED"].includes(milestone.status) &&
        new Date(milestone.startTime).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime(),
    )
    .slice(0, 8);

  const eventMap = new Map(events.map((event) => [event.id, event]));
  const departmentMap = new Map(
    departments.map((department) => [department.id, department]),
  );
  const crewMap = new Map(
    crewMembers.map((crewMember) => [crewMember.id, crewMember]),
  );

  const overdueTasks = openTasks
    .filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate).getTime() < now,
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() -
        new Date(b.dueDate!).getTime(),
    );

  const blockedTasks = openTasks.filter(
    (task) => task.status === "BLOCKED",
  );

  const liveEvents = events.filter(
    (event) => event.status === "LIVE",
  );

  const overdueMilestones = milestones
    .filter(
      (milestone) =>
        milestone.status === "PLANNED" &&
        new Date(milestone.startTime).getTime() < now,
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime(),
    );

  const productionAlerts = [
    ...overdueTasks.map((task) => ({
      type: "OVERDUE_TASK",
      title: task.title,
      description: "Production task is past its due time.",
      eventId: task.eventId,
    })),
    ...blockedTasks.map((task) => ({
      type: "BLOCKED_TASK",
      title: task.title,
      description: "Production task is blocked.",
      eventId: task.eventId,
    })),
    ...overdueMilestones.map((milestone) => ({
      type: "OVERDUE_MILESTONE",
      title: milestone.title,
      description: "Planned milestone has passed its start time.",
      eventId: milestone.eventId,
    })),
    ...liveEvents.map((event) => ({
      type: "LIVE_EVENT",
      title: event.name,
      description: "Event is currently live.",
      eventId: event.id,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Production Control</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Production
        </h1>
        <p className="mt-1 text-muted-foreground">
          Organization-wide view of events, tasks, milestones, crew, and
          production activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeEvents.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{openTasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Critical Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{criticalTasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {upcomingMilestones.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {productionAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active production alerts.
            </p>
          ) : (
            <div className="space-y-4">
              {productionAlerts.slice(0, 12).map((alert, index) => {
                const event = eventMap.get(alert.eventId);

                const alertLabel: Record<string, string> = {
                  OVERDUE_TASK: "Overdue task",
                  BLOCKED_TASK: "Blocked task",
                  OVERDUE_MILESTONE: "Overdue milestone",
                  LIVE_EVENT: "Live event",
                };

                return (
                  <div key={`${alert.type}-${alert.eventId}-${alert.title}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{alert.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event?.name ?? "Unknown event"}
                        </p>
                      </div>

                      <Badge variant="destructive">
                        {alertLabel[alert.type] ?? alert.type}
                      </Badge>
                    </div>

                    {index < Math.min(productionAlerts.length, 12) - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active events.
              </p>
            ) : (
              activeEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}/planning`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(event.startDate)} –{" "}
                        {formatDate(event.endDate)}
                      </p>
                    </div>

                    <Badge variant="secondary">
                      {eventStatusLabel[event.status] ?? event.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Production Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming milestones.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingMilestones.map((milestone, index) => {
                  const event = eventMap.get(milestone.eventId);
                  const department = milestone.departmentId
                    ? departmentMap.get(milestone.departmentId)
                    : null;
                  const crew = milestone.crewMemberId
                    ? crewMap.get(milestone.crewMemberId)
                    : null;

                  return (
                    <div key={milestone.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium">{milestone.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {event?.name ?? "Unknown event"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(milestone.startTime)}
                            {department ? ` · ${department.name}` : ""}
                            {crew ? ` · ${crew.name}` : ""}
                          </p>
                        </div>

                        <Badge variant="outline">
                          {milestoneStatusLabel[milestone.status] ??
                            milestone.status}
                        </Badge>
                      </div>

                      {index < upcomingMilestones.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Production Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open production tasks.
            </p>
          ) : (
            <div className="space-y-4">
              {openTasks.slice(0, 12).map((task, index) => {
                const event = eventMap.get(task.eventId);
                const department = task.departmentId
                  ? departmentMap.get(task.departmentId)
                  : null;
                const crew = task.crewMemberId
                  ? crewMap.get(task.crewMemberId)
                  : null;

                return (
                  <div key={task.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event?.name ?? "Unknown event"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {department ? department.name : "No department"}
                          {crew ? ` · ${crew.name}` : ""}
                          {task.dueDate
                            ? ` · Due ${formatDateTime(task.dueDate)}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Badge variant="outline">
                          {priorityLabel[task.priority] ?? task.priority}
                        </Badge>
                        <Badge variant="secondary">
                          {taskStatusLabel[task.status] ?? task.status}
                        </Badge>
                      </div>
                    </div>

                    {index < Math.min(openTasks.length, 12) - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/crew"
              className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Crew</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {crewMembers.length} crew members
              </p>
            </Link>

            <Link
              href="/dashboard/equipment"
              className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Equipment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Equipment inventory and allocation
              </p>
            </Link>

            <Link
              href="/dashboard/events"
              className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Events</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open event management
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
