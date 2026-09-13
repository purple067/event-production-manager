"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const MILESTONE_TYPES = [
  ["LOAD_IN", "Load-in"],
  ["SETUP", "Setup"],
  ["SOUNDCHECK", "Soundcheck"],
  ["REHEARSAL", "Rehearsal"],
  ["SHOW_START", "Show Start"],
  ["SHOW_END", "Show End"],
  ["LOAD_OUT", "Load-out"],
  ["OTHER", "Other"],
] as const;

const MILESTONE_STATUSES = [
  ["PLANNED", "Planned"],
  ["IN_PROGRESS", "In Progress"],
  ["COMPLETED", "Completed"],
  ["SKIPPED", "Skipped"],
  ["CANCELLED", "Cancelled"],
] as const;

type Milestone = {
  id: number;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  departmentId: number | null;
  crewMemberId: number | null;
};

type MilestonesClientProps = {
  event: {
    id: number;
    name: string;
  };
  departments: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  crewMembers: Array<{
    id: number;
    name: string;
  }>;
  initialMilestones: Milestone[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function typeLabel(type: string) {
  return (
    MILESTONE_TYPES.find(([value]) => value === type)?.[1] ?? type
  );
}

function statusLabel(status: string) {
  return (
    MILESTONE_STATUSES.find(([value]) => value === status)?.[1] ?? status
  );
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "IN_PROGRESS":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export default function MilestonesClient({
  event,
  departments,
  crewMembers,
  initialMilestones,
}: MilestonesClientProps) {
  const [milestones, setMilestones] =
    useState<Milestone[]>(initialMilestones);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState("SETUP");
  const [status, setStatus] = useState("PLANNED");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [crewMemberId, setCrewMemberId] = useState("");
  const [notes, setNotes] = useState("");

  const sortedMilestones = useMemo(
    () =>
      [...milestones].sort(
        (a, b) =>
          new Date(a.startTime).getTime() -
          new Date(b.startTime).getTime(),
      ),
    [milestones],
  );

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setType("SETUP");
    setStatus("PLANNED");
    setStartTime("");
    setEndTime("");
    setDepartmentId("");
    setCrewMemberId("");
    setNotes("");
    setError("");
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(milestone: Milestone) {
    setEditingId(milestone.id);
    setTitle(milestone.title);
    setType(milestone.type);
    setStatus(milestone.status);
    setStartTime(toDateTimeLocal(milestone.startTime));
    setEndTime(toDateTimeLocal(milestone.endTime));
    setDepartmentId(
      milestone.departmentId
        ? String(milestone.departmentId)
        : "",
    );
    setCrewMemberId(
      milestone.crewMemberId
        ? String(milestone.crewMemberId)
        : "",
    );
    setNotes(milestone.notes ?? "");
    setError("");
    setShowForm(true);
  }

  async function refreshMilestones() {
    const response = await fetch(
      `/api/events/${event.id}/milestones`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load milestones");
    }

    setMilestones(data.milestones);
  }

  async function handleSubmit(
    eventObject: React.FormEvent<HTMLFormElement>,
  ) {
    eventObject.preventDefault();

    setLoading(true);
    setError("");

    try {
      const payload = {
        title,
        type,
        status,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime
          ? new Date(endTime).toISOString()
          : null,
        departmentId: departmentId
          ? Number(departmentId)
          : null,
        crewMemberId: crewMemberId
          ? Number(crewMemberId)
          : null,
        notes,
      };

      const url = editingId
        ? `/api/events/${event.id}/milestones/${editingId}`
        : `/api/events/${event.id}/milestones`;

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to save milestone",
        );
      }

      await refreshMilestones();

      resetForm();
      setShowForm(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Delete this milestone?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${event.id}/milestones/${id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to delete milestone",
        );
      }

      await refreshMilestones();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="hover:underline"
            >
              {event.name}
            </Link>
            {" / Production Planning / Milestones"}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Production Milestones
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage the operational timeline for this event.
          </p>
        </div>

        <Button onClick={openAddForm}>
          Add Milestone
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Milestone" : "Add Milestone"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="milestone-title">
                    Title
                  </Label>

                  <Input
                    id="milestone-title"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="FOH Soundcheck"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>

                  <Select
                    value={type}
                    onValueChange={(value) =>
                      setType(value ?? "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>

                    <SelectContent>
                      {MILESTONE_TYPES.map(
                        ([value, label]) => (
                          <SelectItem
                            key={value}
                            value={value}
                          >
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>

                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value ?? "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      {MILESTONE_STATUSES.map(
                        ([value, label]) => (
                          <SelectItem
                            key={value}
                            value={value}
                          >
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-start">
                    Start
                  </Label>

                  <Input
                    id="milestone-start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-end">
                    End
                  </Label>

                  <Input
                    id="milestone-end"
                    type="datetime-local"
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>

                  <Select
                    value={departmentId}
                    onValueChange={(value) =>
                      setDepartmentId(value ?? "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="none">
                        No department
                      </SelectItem>

                      {departments.map((department) => (
                        <SelectItem
                          key={department.id}
                          value={String(department.id)}
                        >
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Crew Member</Label>

                  <Select
                    value={crewMemberId}
                    onValueChange={(value) =>
                      setCrewMemberId(value ?? "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No crew member" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="none">
                        No crew member
                      </SelectItem>

                      {crewMembers.map((crewMember) => (
                        <SelectItem
                          key={crewMember.id}
                          value={String(crewMember.id)}
                        >
                          {crewMember.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="milestone-notes">
                    Notes
                  </Label>

                  <Input
                    id="milestone-notes"
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Operational notes..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editingId
                      ? "Update Milestone"
                      : "Create Milestone"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sortedMilestones.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <h2 className="text-lg font-medium">
              No production milestones
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Build the event timeline by adding load-in,
              setup, soundcheck, rehearsal, show, and load-out
              milestones.
            </p>

            <Button
              className="mt-4"
              onClick={openAddForm}
            >
              Add First Milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0">
          {sortedMilestones.map((milestone, index) => {
            const department = departments.find(
              (item) =>
                item.id === milestone.departmentId,
            );

            const crewMember = crewMembers.find(
              (item) =>
                item.id === milestone.crewMemberId,
            );

            return (
              <div
                key={milestone.id}
                className="relative pl-8"
              >
                {index < sortedMilestones.length - 1 && (
                  <div className="absolute left-[11px] top-7 h-full w-px bg-border" />
                )}

                <div className="absolute left-0 top-5 flex size-6 items-center justify-center rounded-full border bg-background">
                  <div className="size-2 rounded-full bg-primary" />
                </div>

                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {milestone.title}
                        </CardTitle>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDateTime(
                            milestone.startTime,
                          )}

                          {milestone.endTime && (
                            <>
                              {" — "}
                              {formatDateTime(
                                milestone.endTime,
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {typeLabel(milestone.type)}
                        </Badge>

                        <Badge
                          variant={statusVariant(
                            milestone.status,
                          )}
                        >
                          {statusLabel(milestone.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">
                          Department
                        </p>
                        <p className="font-medium">
                          {department?.name ?? "Unassigned"}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Crew
                        </p>
                        <p className="font-medium">
                          {crewMember?.name ?? "Unassigned"}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Milestone ID
                        </p>
                        <p className="font-medium">
                          #{milestone.id}
                        </p>
                      </div>
                    </div>

                    {milestone.notes && (
                      <>
                        <Separator />

                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">
                            Notes
                          </p>

                          <p className="text-sm">
                            {milestone.notes}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openEditForm(milestone)
                        }
                        disabled={loading}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDelete(milestone.id)
                        }
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
