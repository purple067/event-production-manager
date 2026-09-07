"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Equipment = {
  id: number;
  name: string;
  model: string | null;
  quantity: number;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

type Assignment = {
  id: number;
  equipmentId: number;
  departmentId: number | null;
  quantity: number;
  status: string;
  allocatedAt: string | null;
  returnedAt: string | null;
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

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

export default function EditEquipmentAssignmentPage() {
  const params = useParams<{
    id: string;
    assignmentId: string;
  }>();

  const router = useRouter();

  const eventId = params.id;
  const assignmentId = params.assignmentId;

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [equipmentId, setEquipmentId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("PLANNED");
  const [allocatedAt, setAllocatedAt] = useState("");
  const [returnedAt, setReturnedAt] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          assignmentResponse,
          equipmentResponse,
          departmentResponse,
        ] = await Promise.all([
          fetch(
            `/api/events/${eventId}/equipment/${assignmentId}`,
          ),
          fetch("/api/equipment"),
          fetch(`/api/events/${eventId}/departments`),
        ]);

        const assignmentData =
          await assignmentResponse.json();
        const equipmentData = await equipmentResponse.json();
        const departmentData =
          await departmentResponse.json();

        if (!assignmentResponse.ok) {
          throw new Error(
            assignmentData.error ??
              "Failed to load equipment assignment.",
          );
        }

        if (!equipmentResponse.ok) {
          throw new Error(
            equipmentData.error ??
              "Failed to load equipment.",
          );
        }

        if (!departmentResponse.ok) {
          throw new Error(
            departmentData.error ??
              "Failed to load departments.",
          );
        }

        const currentAssignment =
          assignmentData.assignment as Assignment;

        setAssignment(currentAssignment);
        setEquipment(equipmentData.equipment ?? []);
        setDepartments(departmentData.departments ?? []);

        setEquipmentId(
          String(currentAssignment.equipmentId),
        );

        setDepartmentId(
          currentAssignment.departmentId
            ? String(currentAssignment.departmentId)
            : "",
        );

        setQuantity(String(currentAssignment.quantity));
        setStatus(currentAssignment.status);

        setAllocatedAt(
          toDateTimeLocal(currentAssignment.allocatedAt),
        );

        setReturnedAt(
          toDateTimeLocal(currentAssignment.returnedAt),
        );

        setNotes(currentAssignment.notes ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load assignment.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, assignmentId]);

  const selectedEquipment = equipment.find(
    (item) => String(item.id) === equipmentId,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const quantityNumber = Number(quantity);

    if (!equipmentId) {
      setError("Please select equipment.");
      return;
    }

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (
      selectedEquipment &&
      quantityNumber > selectedEquipment.quantity
    ) {
      setError(
        `Quantity cannot exceed equipment quantity (${selectedEquipment.quantity}).`,
      );
      return;
    }

    if (allocatedAt && returnedAt) {
      const allocatedDate = new Date(allocatedAt);
      const returnedDate = new Date(returnedAt);

      if (returnedDate < allocatedDate) {
        setError(
          "Returned date cannot be earlier than allocated date.",
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/events/${eventId}/equipment/${assignmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            equipmentId: Number(equipmentId),
            departmentId: departmentId
              ? Number(departmentId)
              : null,
            quantity: quantityNumber,
            status,
            allocatedAt: allocatedAt
              ? new Date(allocatedAt).toISOString()
              : null,
            returnedAt: returnedAt
              ? new Date(returnedAt).toISOString()
              : null,
            notes: notes.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update equipment assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/equipment`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this equipment assignment?",
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/equipment/${assignmentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to delete equipment assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/equipment`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete assignment.",
      );
    } finally {
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
          Equipment assignment not found.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${eventId}/equipment`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Equipment
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Edit Equipment Assignment
        </h1>

        <p className="text-muted-foreground">
          Update or remove this equipment assignment.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        {error && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="equipment"
              className="text-sm font-medium"
            >
              Equipment
            </label>

            <Select
              value={equipmentId}
              onValueChange={(value) =>
                setEquipmentId(value ?? "")
              }
            >
              <SelectTrigger
                id="equipment"
                className="w-full"
              >
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>

              <SelectContent>
                {equipment.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.name}
                    {item.model
                      ? ` — ${item.model}`
                      : ""}
                    {` — Qty ${item.quantity}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="department"
              className="text-sm font-medium"
            >
              Department
            </label>

            <Select
              value={departmentId}
              onValueChange={(value) =>
                setDepartmentId(value ?? "")
              }
            >
              <SelectTrigger
                id="department"
                className="w-full"
              >
                <SelectValue placeholder="Select department" />
              </SelectTrigger>

              <SelectContent>
                {departments.map((department) => (
                  <SelectItem
                    key={department.id}
                    value={String(department.id)}
                  >
                    {department.name} ({department.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="quantity"
              className="text-sm font-medium"
            >
              Quantity
            </label>

            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />

            {selectedEquipment && (
              <p className="text-xs text-muted-foreground">
                Inventory quantity:{" "}
                {selectedEquipment.quantity}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="text-sm font-medium"
            >
              Assignment Status
            </label>

            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value ?? "PLANNED")
              }
            >
              <SelectTrigger
                id="status"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="allocatedAt"
                className="text-sm font-medium"
              >
                Allocated At
              </label>

              <input
                id="allocatedAt"
                type="datetime-local"
                value={allocatedAt}
                onChange={(e) =>
                  setAllocatedAt(e.target.value)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="returnedAt"
                className="text-sm font-medium"
              >
                Returned At
              </label>

              <input
                id="returnedAt"
                type="datetime-local"
                value={returnedAt}
                onChange={(e) =>
                  setReturnedAt(e.target.value)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Additional assignment notes..."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? "Deleting..." : "Delete Assignment"}
            </Button>

            <div className="flex gap-3">
              <Link
                href={`/dashboard/events/${eventId}/equipment`}
              >
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>

              <Button type="submit" disabled={saving || deleting}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
