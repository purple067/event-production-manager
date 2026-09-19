"use client";

import { useMemo, useState } from "react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Separator } from "../../../../../components/ui/separator";

type EventRecord = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

type CrewMember = {
  id: number;
  name: string;
  designation: string | null;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  notes: string | null;
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
  notes: string | null;
  eventId: number;
  departmentId: number | null;
  crewMemberId: number | null;
};

type PlanningClientProps = {
  event: EventRecord;
  departments: Department[];
  crewMembers: CrewMember[];
  tasks: Task[];
  milestones: Milestone[];
};

type TimelineItem =
  | {
      kind: "milestone";
      id: number;
      title: string;
      status: string;
      timestamp: string;
      endTimestamp: string | null;
      type: string;
      notes: string | null;
      departmentId: number | null;
      crewMemberId: number | null;
    }
  | {
      kind: "task";
      id: number;
      title: string;
      status: string;
      timestamp: string | null;
      endTimestamp: null;
      priority: string;
      type: "TASK";
      notes: string | null;
      departmentId: number | null;
      crewMemberId: number | null;
    };

const milestoneLabels: Record<string, string> = {
  LOAD_IN: "Load In",
  SETUP: "Setup",
  SOUNDCHECK: "Soundcheck",
  REHEARSAL: "Rehearsal",
  SHOW_START: "Show Start",
  SHOW_END: "Show End",
  LOAD_OUT: "Load Out",
  OTHER: "Other",
};

const statusLabels: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
  TODO: "To Do",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "No scheduled time";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED" || status === "DONE") {
    return "default";
  }

  if (status === "CANCELLED" || status === "BLOCKED" || status === "NO_SHOW") {
    return "destructive";
  }

  if (status === "IN_PROGRESS") {
    return "secondary";
  }

  return "outline";
}

function getDepartmentName(
  departmentId: number | null,
  departments: Department[],
) {
  if (!departmentId) {
    return null;
  }

  return departments.find((department) => department.id === departmentId)?.name ?? null;
}

function getCrewName(crewMemberId: number | null, crewMembers: CrewMember[]) {
  if (!crewMemberId) {
    return null;
  }

  return crewMembers.find((crewMember) => crewMember.id === crewMemberId)?.name ?? null;
}

export default function PlanningClient({
  event,
  departments,
  crewMembers,
  tasks,
  milestones,
}: PlanningClientProps) {
  const [filter, setFilter] = useState<"ALL" | "MILESTONES" | "TASKS">("ALL");

  const timeline = useMemo<TimelineItem[]>(() => {
    const milestoneItems: TimelineItem[] = milestones.map((milestone) => ({
      kind: "milestone",
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      timestamp: milestone.startTime,
      endTimestamp: milestone.endTime,
      type: milestone.type,
      notes: milestone.notes,
      departmentId: milestone.departmentId,
      crewMemberId: milestone.crewMemberId,
    }));

    const taskItems: TimelineItem[] = tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        kind: "task",
        id: task.id,
        title: task.title,
        status: task.status,
        timestamp: task.dueDate,
        endTimestamp: null,
        priority: task.priority,
        type: "TASK" as const,
        notes: task.notes,
        departmentId: task.departmentId,
        crewMemberId: task.crewMemberId,
      }));

    return [...milestoneItems, ...taskItems].sort((a, b) => {
      if (!a.timestamp) {
        return 1;
      }

      if (!b.timestamp) {
        return -1;
      }

      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [milestones, tasks]);

  const filteredTimeline = useMemo(() => {
    if (filter === "MILESTONES") {
      return timeline.filter((item) => item.kind === "milestone");
    }

    if (filter === "TASKS") {
      return timeline.filter((item) => item.kind === "task");
    }

    return timeline;
  }, [filter, timeline]);

  const unscheduledTasks = tasks.filter((task) => !task.dueDate);

  const completedTasks = tasks.filter(
    (task) => task.status === "DONE",
  ).length;

  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === "COMPLETED",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Production Planning</p>
            <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unified operational timeline for tasks and production milestones.
            </p>
          </div>

          <Badge variant="outline">{event.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timeline Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{timeline.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {completedMilestones}/{milestones.length}
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {completedTasks}/{tasks.length}
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unscheduled Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{unscheduledTasks.length}</div>
            <p className="text-xs text-muted-foreground">need scheduling</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Production Timeline</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tasks and milestones ordered by their scheduled time.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === "ALL" ? "default" : "outline"}
                onClick={() => setFilter("ALL")}
              >
                All
              </Button>

              <Button
                size="sm"
                variant={filter === "MILESTONES" ? "default" : "outline"}
                onClick={() => setFilter("MILESTONES")}
              >
                Milestones
              </Button>

              <Button
                size="sm"
                variant={filter === "TASKS" ? "default" : "outline"}
                onClick={() => setFilter("TASKS")}
              >
                Tasks
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTimeline.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No scheduled production items</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add milestones or tasks with a scheduled time to populate the timeline.
              </p>
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute bottom-4 left-[7px] top-4 w-px bg-border" />

              {filteredTimeline.map((item) => {
                const departmentName = getDepartmentName(
                  item.departmentId,
                  departments,
                );

                const crewName = getCrewName(
                  item.crewMemberId,
                  crewMembers,
                );

                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    <div className="relative z-10 mt-2 h-4 w-4 shrink-0 rounded-full border-4 border-background bg-foreground" />

                    <div className="min-w-0 flex-1 rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                item.kind === "milestone"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {item.kind === "milestone"
                                ? milestoneLabels[item.type] ?? item.type
                                : "Task"}
                            </Badge>

                            <Badge variant={getStatusVariant(item.status)}>
                              {statusLabels[item.status] ?? item.status}
                            </Badge>

                            {item.kind === "task" && (
                              <Badge variant="outline">
                                {priorityLabels[item.priority] ?? item.priority}
                              </Badge>
                            )}
                          </div>

                          <h3 className="mt-2 font-semibold">{item.title}</h3>

                          <div className="mt-1 text-sm text-muted-foreground">
                            {formatDateTime(item.timestamp)}
                            {item.kind === "milestone" && item.endTimestamp
                              ? ` → ${formatTime(item.endTimestamp)}`
                              : ""}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 text-sm text-muted-foreground md:items-end">
                          {departmentName && <span>{departmentName}</span>}
                          {crewName && <span>{crewName}</span>}
                        </div>
                      </div>

                      {item.notes && (
                        <>
                          <Separator className="my-3" />
                          <p className="text-sm text-muted-foreground">
                            {item.notes}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {unscheduledTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unscheduled Tasks</CardTitle>
            <p className="text-sm text-muted-foreground">
              These tasks exist but do not have a due date yet.
            </p>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {unscheduledTasks.map((task) => {
                const departmentName = getDepartmentName(
                  task.departmentId,
                  departments,
                );

                const crewName = getCrewName(
                  task.crewMemberId,
                  crewMembers,
                );

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Task</Badge>
                          <Badge variant={getStatusVariant(task.status)}>
                            {statusLabels[task.status] ?? task.status}
                          </Badge>
                          <Badge variant="outline">
                            {priorityLabels[task.priority] ?? task.priority}
                          </Badge>
                        </div>

                        <h3 className="mt-2 font-semibold">{task.title}</h3>
                      </div>

                      <div className="text-sm text-muted-foreground md:text-right">
                        {departmentName && <div>{departmentName}</div>}
                        {crewName && <div>{crewName}</div>}
                      </div>
                    </div>

                    {task.description && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
