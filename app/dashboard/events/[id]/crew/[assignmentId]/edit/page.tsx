"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CrewMember = {
  id: number;
  name: string;
  designation: string | null;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

type Assignment = {
  id: number;
  crewMemberId: number;
  departmentId: number | null;
  role: string | null;
  assignmentStatus: string;
  callTime: string | null;
  releaseTime: string | null;
  rate: string | null;
  rateUnit: string | null;
  notes: string | null;
};

const statuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const rateUnits = ["DAY", "HOUR", "EVENT", "FIXED"];

export default function EditCrewAssignmentPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.id);
  const assignmentId = String(params.assignmentId);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [crewMemberId, setCrewMemberId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("PLANNED");
  const [callTime, setCallTime] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [assignmentResponse, crewResponse, departmentResponse] =
          await Promise.all([
            fetch(`/api/events/${eventId}/crew/${assignmentId}`),
            fetch("/api/crew"),
            fetch(`/api/events/${eventId}/departments`),
          ]);

        const assignmentData = await assignmentResponse.json();
        const crewData = await crewResponse.json();
        const departmentData = await departmentResponse.json();

        if (!assignmentResponse.ok) {
          throw new Error(
            assignmentData.error || "Failed to load assignment.",
          );
        }

        if (!crewResponse.ok) {
          throw new Error(crewData.error || "Failed to load crew.");
        }

        if (!departmentResponse.ok) {
          throw new Error(
            departmentData.error || "Failed to load departments.",
          );
        }

        const item = assignmentData.assignment;

        setAssignment(item);
        setCrewMembers(crewData.crewMembers ?? []);
        setDepartments(departmentData.departments ?? []);

        setCrewMemberId(String(item.crewMemberId));
        setDepartmentId(
          item.departmentId ? String(item.departmentId) : "",
        );
        setRole(item.role ?? "");
        setAssignmentStatus(item.assignmentStatus);
        setCallTime(toDateTimeLocal(item.callTime));
        setReleaseTime(toDateTimeLocal(item.releaseTime));
        setRate(item.rate ?? "");
        setRateUnit(item.rateUnit ?? "");
        setNotes(item.notes ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, assignmentId]);

  function toDateTimeLocal(value: string | null) {
    if (!value) return "";

    const date = new Date(value);

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/crew/${assignmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crewMemberId: Number(crewMemberId),
            departmentId: departmentId
              ? Number(departmentId)
              : null,
            role: role || null,
            assignmentStatus,
            callTime: callTime
              ? new Date(callTime).toISOString()
              : null,
            releaseTime: releaseTime
              ? new Date(releaseTime).toISOString()
              : null,
            rate: rate ? Number(rate) : null,
            rateUnit: rateUnit || null,
            notes: notes || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update assignment.");
      }

      router.push(`/dashboard/events/${eventId}/crew`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this crew assignment?",
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/crew/${assignmentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete assignment.");
      }

      router.push(`/dashboard/events/${eventId}/crew`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Loading assignment...
        </p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          {error || "Assignment not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Edit Crew Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Update the crew member's assignment for this event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Crew Member
                </label>

                <select
                  value={crewMemberId}
                  onChange={(e) => setCrewMemberId(e.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select crew member</option>

                  {crewMembers.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                      {crew.designation
                        ? ` — ${crew.designation}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Department
                </label>

                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">No department</option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name} — {department.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Assignment Role
                </label>

                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. FOH Engineer"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Status
                </label>

                <select
                  value={assignmentStatus}
                  onChange={(e) =>
                    setAssignmentStatus(e.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Call Time
                </label>

                <input
                  type="datetime-local"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Release Time
                </label>

                <input
                  type="datetime-local"
                  value={releaseTime}
                  onChange={(e) =>
                    setReleaseTime(e.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rate
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rate Unit
                </label>

                <select
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select unit</option>

                  {rateUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Assignment notes..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? "Deleting..." : "Delete Assignment"}
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/events/${eventId}/crew`,
                    )
                  }
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving || deleting}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
