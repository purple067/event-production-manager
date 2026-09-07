"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

const assignmentStatuses = [
  "PLANNED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export default function NewCrewAssignmentPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = Number(params.id);

  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [crewMemberId, setCrewMemberId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("");
  const [assignmentStatus, setAssignmentStatus] =
    useState("PLANNED");

  const [callTime, setCallTime] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState("DAY");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [crewResponse, departmentResponse] =
          await Promise.all([
            fetch("/api/crew"),
            fetch(`/api/events/${eventId}/departments`),
          ]);

        const crewData = await crewResponse.json();
        const departmentData =
          await departmentResponse.json();

        if (!crewResponse.ok) {
          throw new Error(
            crewData.error ?? "Failed to load crew members.",
          );
        }

        if (!departmentResponse.ok) {
          throw new Error(
            departmentData.error ??
              "Failed to load departments.",
          );
        }

        setCrewMembers(crewData.crewMembers ?? []);
        setDepartments(departmentData.departments ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load form data.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/crew`,
        {
          method: "POST",
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
        throw new Error(
          data.error ?? "Failed to create assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/crew`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading crew assignment form...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/events/${eventId}/crew`,
            )
          }
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Event Crew
        </button>

        <h1 className="mt-2 text-2xl font-bold">
          Assign Crew
        </h1>

        <p className="text-sm text-muted-foreground">
          Assign a crew member to this event and department.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border p-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="crewMember"
              className="text-sm font-medium"
            >
              Crew Member
            </label>

            <select
              id="crewMember"
              value={crewMemberId}
              onChange={(e) =>
                setCrewMemberId(e.target.value)
              }
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">
                Select crew member
              </option>

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
            <label
              htmlFor="department"
              className="text-sm font-medium"
            >
              Department
            </label>

            <select
              id="department"
              value={departmentId}
              onChange={(e) =>
                setDepartmentId(e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">
                No department
              </option>

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
            <label
              htmlFor="role"
              className="text-sm font-medium"
            >
              Assignment Role
            </label>

            <input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. FOH Engineer"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="text-sm font-medium"
            >
              Assignment Status
            </label>

            <select
              id="status"
              value={assignmentStatus}
              onChange={(e) =>
                setAssignmentStatus(e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {assignmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="callTime"
              className="text-sm font-medium"
            >
              Call Time
            </label>

            <input
              id="callTime"
              type="datetime-local"
              value={callTime}
              onChange={(e) =>
                setCallTime(e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="releaseTime"
              className="text-sm font-medium"
            >
              Release Time
            </label>

            <input
              id="releaseTime"
              type="datetime-local"
              value={releaseTime}
              onChange={(e) =>
                setReleaseTime(e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="rate"
              className="text-sm font-medium"
            >
              Rate
            </label>

            <input
              id="rate"
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="rateUnit"
              className="text-sm font-medium"
            >
              Rate Unit
            </label>

            <select
              id="rateUnit"
              value={rateUnit}
              onChange={(e) =>
                setRateUnit(e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="DAY">DAY</option>
              <option value="HOUR">HOUR</option>
              <option value="EVENT">EVENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="notes"
            className="text-sm font-medium"
          >
            Notes
          </label>

          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Additional assignment notes..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/events/${eventId}/crew`,
              )
            }
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !crewMemberId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Assigning..." : "Assign Crew"}
          </button>
        </div>
      </form>
    </div>
  );
}
