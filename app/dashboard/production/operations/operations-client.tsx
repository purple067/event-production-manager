"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Event = {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
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

type CrewAssignment = {
  id: number;
  role: string | null;
  assignmentStatus: string;
  callTime: string | null;
  releaseTime: string | null;
  crewMemberId: number;
  departmentId: number | null;
  eventId: number;
};

type EquipmentAssignment = {
  id: number;
  quantity: number;
  status: string;
  allocatedAt: string | null;
  returnedAt: string | null;
  equipmentId: number;
  departmentId: number | null;
  eventId: number;
};

type Department = {
  id: number;
  name: string;
  type: string;
  eventId: number;
};

type CrewMember = {
  id: number;
  name: string;
  designation: string | null;
  status: string;
};

type Equipment = {
  id: number;
  name: string;
  model: string | null;
  status: string;
  quantity: number;
};

type OperationData = {
  event: Event;
  milestones: Milestone[];
  tasks: Task[];
  crewAssignments: CrewAssignment[];
  equipmentAssignments: EquipmentAssignment[];
  departments: Department[];
};

type OperationsClientProps = {
  operations: OperationData[];
  crewMembers: CrewMember[];
  equipment: Equipment[];
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

const milestoneStatusLabel: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
};

const taskStatusLabel: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const assignmentStatusLabel: Record<string, string> = {
  PLANNED: "Planned",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
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

function sameCalendarDay(a: string, b: Date) {
  const date = new Date(a);

  return (
    date.getFullYear() === b.getFullYear() &&
    date.getMonth() === b.getMonth() &&
    date.getDate() === b.getDate()
  );
}

export default function OperationsClient({
  operations,
  crewMembers,
  equipment,
}: OperationsClientProps) {
  const activeOperations = operations.filter(
    ({ event }) =>
      !["COMPLETED", "ARCHIVED", "CANCELLED"].includes(event.status),
  );

  const [selectedEventId, setSelectedEventId] = useState(
    activeOperations[0]?.event.id.toString() ?? "",
  );

  const [updatingAssignmentId, setUpdatingAssignmentId] = useState<number | null>(
    null,
  );

  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<number | null>(
    null,
  );
  const [updatingEquipmentAssignmentId, setUpdatingEquipmentAssignmentId] =
    useState<number | null>(null);

  async function updateEquipmentAssignment(
    assignmentId: number,
    action: "CHECK_IN" | "RETURN",
  ) {
    if (!selectedOperation) {
      return;
    }

    setUpdatingEquipmentAssignmentId(assignmentId);

    try {
      const response = await fetch(
        `/api/events/${selectedOperation.event.id}/equipment-assignments/${assignmentId}/operation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to update equipment assignment.",
        );
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update equipment assignment.",
      );
    } finally {
      setUpdatingEquipmentAssignmentId(null);
    }
  }

  async function operateMilestone(
    milestoneId: number,
    action: "START" | "COMPLETE" | "SKIP",
  ) {
    if (!selectedOperation) {
      return;
    }

    setUpdatingMilestoneId(milestoneId);

    try {
      const response = await fetch(
        `/api/events/${selectedOperation.event.id}/milestones/${milestoneId}/operation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update milestone");
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update milestone",
      );
    } finally {
      setUpdatingMilestoneId(null);
    }
  }

  async function updateCrewAssignment(
    assignmentId: number,
    status: string,
  ) {
    if (!selectedOperation) {
      return;
    }

    setUpdatingAssignmentId(assignmentId);

    try {
      const response = await fetch(
        `/api/events/${selectedOperation.event.id}/crew-assignments/${assignmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update crew assignment");
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update crew assignment",
      );
    } finally {
      setUpdatingAssignmentId(null);
    }
  }

  const selectedOperation = useMemo(
    () =>
      activeOperations.find(
        (operation) => operation.event.id.toString() === selectedEventId,
      ) ?? activeOperations[0],
    [activeOperations, selectedEventId],
  );

  if (!selectedOperation) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Production Control</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Event Operations
          </h1>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No active events</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create or activate an event to begin operational control.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    event,
    milestones,
    tasks,
    crewAssignments,
    equipmentAssignments,
    departments,
  } = selectedOperation;

  const today = new Date();

  const todayMilestones = milestones
    .filter((milestone) => sameCalendarDay(milestone.startTime, today))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime(),
    );

  const activeMilestones = milestones.filter(
    (milestone) => milestone.status === "IN_PROGRESS",
  );

  const openTasks = tasks.filter(
    (task) => !["DONE", "CANCELLED"].includes(task.status),
  );

  const criticalTasks = openTasks.filter(
    (task) => task.priority === "CRITICAL",
  );

  const checkedInCrew = crewAssignments.filter(
    (assignment) => assignment.assignmentStatus === "CHECKED_IN",
  );

  const noShowCrew = crewAssignments.filter(
    (assignment) => assignment.assignmentStatus === "NO_SHOW",
  );

  const equipmentInUse = equipmentAssignments.filter(
    (assignment) => assignment.status === "CHECKED_IN",
  );

  const equipmentAllocatedQuantity = equipmentInUse.reduce(
    (total, assignment) => total + assignment.quantity,
    0,
  );

  const crewMap = new Map(
    crewMembers.map((crewMember) => [crewMember.id, crewMember]),
  );

  const equipmentMap = new Map(
    equipment.map((item) => [item.id, item]),
  );

  const departmentMap = new Map(
    departments.map((department) => [department.id, department]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Production Control</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Event Operations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Live operational view of crew, equipment, milestones, and
            production tasks.
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedEventId}
            onValueChange={(value) => setSelectedEventId(value ?? "")}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>

            <SelectContent>
              {activeOperations.map((operation) => (
                <SelectItem
                  key={operation.event.id}
                  value={operation.event.id.toString()}
                >
                  {operation.event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link href={`/dashboard/events/${event.id}/planning`}>
            <Button variant="outline">Open Planning</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{event.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </p>
            </div>

            <Badge variant="secondary">
              {eventStatusLabel[event.status] ?? event.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Today's Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {todayMilestones.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {activeMilestones.length}
            </p>
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
              Crew Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {checkedInCrew.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Equipment Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {equipmentAllocatedQuantity}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Timeline</CardTitle>
          </CardHeader>

          <CardContent>
            {todayMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones scheduled for today.
              </p>
            ) : (
              <div className="space-y-4">
                {todayMilestones.map((milestone, index) => (
                  <div key={milestone.id}>
                    <div className="flex gap-4">
                      <div className="w-20 shrink-0">
                        <p className="text-sm font-medium">
                          {formatTime(milestone.startTime)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium">{milestone.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {milestone.type.replaceAll("_", " ")}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {milestoneStatusLabel[milestone.status] ??
                              milestone.status}
                          </Badge>

                          {milestone.departmentId && (
                            <Badge variant="secondary">
                              {departmentMap.get(milestone.departmentId)?.name ??
                                "Department"}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {milestone.status === "PLANNED" && (
                            <>
                              <Button
                                size="sm"
                                disabled={updatingMilestoneId === milestone.id}
                                onClick={() =>
                                  operateMilestone(milestone.id, "START")
                                }
                              >
                                {updatingMilestoneId === milestone.id
                                  ? "Updating..."
                                  : "Start"}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingMilestoneId === milestone.id}
                                onClick={() =>
                                  operateMilestone(milestone.id, "SKIP")
                                }
                              >
                                Skip
                              </Button>
                            </>
                          )}

                          {milestone.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              disabled={updatingMilestoneId === milestone.id}
                              onClick={() =>
                                operateMilestone(milestone.id, "COMPLETE")
                              }
                            >
                              {updatingMilestoneId === milestone.id
                                ? "Updating..."
                                : "Complete"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {index < todayMilestones.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Alerts</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {criticalTasks.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="font-medium">Critical production tasks</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {criticalTasks.length} critical task
                  {criticalTasks.length === 1 ? "" : "s"} require attention.
                </p>
              </div>
            )}

            {noShowCrew.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="font-medium">Crew no-show</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {noShowCrew.length} crew assignment
                  {noShowCrew.length === 1 ? "" : "s"} marked as no-show.
                </p>
              </div>
            )}

            {criticalTasks.length === 0 && noShowCrew.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No operational alerts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crew Operations</CardTitle>
          </CardHeader>

          <CardContent>
            {crewAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No crew assignments for this event.
              </p>
            ) : (
              <div className="space-y-4">
                {crewAssignments.map((assignment, index) => {
                  const crew = crewMap.get(assignment.crewMemberId);
                  const department = assignment.departmentId
                    ? departmentMap.get(assignment.departmentId)
                    : null;

                  const isUpdating =
                    updatingAssignmentId === assignment.id;

                  return (
                    <div key={assignment.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {crew?.name ?? "Unknown crew member"}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {assignment.role ?? crew?.designation ?? "Crew"}
                            {department ? ` · ${department.name}` : ""}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Call {formatTime(assignment.callTime)}
                            {" · "}
                            Release {formatTime(assignment.releaseTime)}
                          </p>
                        </div>

                        <Badge variant="secondary">
                          {assignmentStatusLabel[
                            assignment.assignmentStatus
                          ] ?? assignment.assignmentStatus}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(assignment.assignmentStatus === "PLANNED" ||
                          assignment.assignmentStatus === "CONFIRMED") && (
                          <>
                            <Button
                              size="sm"
                              disabled={isUpdating}
                              onClick={() =>
                                updateCrewAssignment(
                                  assignment.id,
                                  "CHECKED_IN",
                                )
                              }
                            >
                              {isUpdating ? "Updating..." : "Check In"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() =>
                                updateCrewAssignment(
                                  assignment.id,
                                  "NO_SHOW",
                                )
                              }
                            >
                              No Show
                            </Button>
                          </>
                        )}

                        {assignment.assignmentStatus === "CHECKED_IN" && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              updateCrewAssignment(
                                assignment.id,
                                "COMPLETED",
                              )
                            }
                          >
                            {isUpdating ? "Updating..." : "Complete"}
                          </Button>
                        )}
                      </div>

                      {index < crewAssignments.length - 1 && (
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
            <CardTitle>Equipment Operations</CardTitle>
          </CardHeader>

          <CardContent>
            {equipmentAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No equipment assignments for this event.
              </p>
            ) : (
              <div className="space-y-4">
                {equipmentAssignments.map((assignment, index) => {
                  const item = equipmentMap.get(assignment.equipmentId);
                  const department = assignment.departmentId
                    ? departmentMap.get(assignment.departmentId)
                    : null;

                  return (
                    <div key={assignment.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {item?.name ?? "Unknown equipment"}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {item?.model ?? "Equipment"}
                            {department ? ` · ${department.name}` : ""}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Quantity {assignment.quantity}
                            {" · "}
                            Allocated {formatTime(assignment.allocatedAt)}
                            {" · "}
                            Returned {formatTime(assignment.returnedAt)}
                          </p>
                        </div>

                        <Badge variant="secondary">
                          {assignmentStatusLabel[assignment.status] ??
                            assignment.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(assignment.status === "PLANNED" ||
                          assignment.status === "CONFIRMED") && (
                          <Button
                            size="sm"
                            disabled={
                              updatingEquipmentAssignmentId === assignment.id
                            }
                            onClick={() =>
                              updateEquipmentAssignment(
                                assignment.id,
                                "CHECK_IN",
                              )
                            }
                          >
                            {updatingEquipmentAssignmentId === assignment.id
                              ? "Updating..."
                              : "Check In"}
                          </Button>
                        )}

                        {assignment.status === "CHECKED_IN" && (
                          <Button
                            size="sm"
                            disabled={
                              updatingEquipmentAssignmentId === assignment.id
                            }
                            onClick={() =>
                              updateEquipmentAssignment(
                                assignment.id,
                                "RETURN",
                              )
                            }
                          >
                            {updatingEquipmentAssignmentId === assignment.id
                              ? "Updating..."
                              : "Return"}
                          </Button>
                        )}
                      </div>

                      {index < equipmentAssignments.length - 1 && (
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
              {openTasks.slice(0, 10).map((task, index) => {
                const department = task.departmentId
                  ? departmentMap.get(task.departmentId)
                  : null;
                const crew = task.crewMemberId
                  ? crewMap.get(task.crewMemberId)
                  : null;

                return (
                  <div key={task.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{task.title}</p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {department?.name ?? "No department"}
                          {crew ? ` · ${crew.name}` : ""}
                        </p>

                        {task.dueDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Due {formatDateTime(task.dueDate)}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline">{task.priority}</Badge>
                        <Badge variant="secondary">
                          {taskStatusLabel[task.status] ?? task.status}
                        </Badge>
                      </div>
                    </div>

                    {index < Math.min(openTasks.length, 10) - 1 && (
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
  );
}
