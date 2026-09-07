"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Vendor = {
  id: number;
  name: string;
  contactPerson: string | null;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

type Assignment = {
  id: number;
  vendorId: number;
  departmentId: number | null;
  serviceName: string;
  description: string | null;
  status: string;
  quotedCost: string | null;
  agreedCost: string | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditEventVendorPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.id);
  const assignmentId = String(params.assignmentId);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const [vendorId, setVendorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [quotedCost, setQuotedCost] = useState("");
  const [agreedCost, setAgreedCost] = useState("");
  const [currency, setCurrency] = useState("NPR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [assignmentResponse, vendorsResponse, departmentsResponse] =
          await Promise.all([
            fetch(`/api/events/${eventId}/vendors/${assignmentId}`),
            fetch("/api/vendors"),
            fetch(`/api/events/${eventId}/departments`),
          ]);

        const assignmentData = await assignmentResponse.json();
        const vendorsData = await vendorsResponse.json();
        const departmentsData = await departmentsResponse.json();

        if (!assignmentResponse.ok) {
          throw new Error(
            assignmentData.error ?? "Failed to load assignment.",
          );
        }

        if (!vendorsResponse.ok) {
          throw new Error("Failed to load vendors.");
        }

        if (!departmentsResponse.ok) {
          throw new Error("Failed to load departments.");
        }

        const currentAssignment = assignmentData.assignment as Assignment;

        setAssignment(currentAssignment);
        setVendors(vendorsData.vendors ?? []);
        setDepartments(departmentsData.departments ?? []);

        setVendorId(String(currentAssignment.vendorId));
        setDepartmentId(
          currentAssignment.departmentId
            ? String(currentAssignment.departmentId)
            : "",
        );
        setServiceName(currentAssignment.serviceName);
        setDescription(currentAssignment.description ?? "");
        setStatus(currentAssignment.status);
        setQuotedCost(currentAssignment.quotedCost ?? "");
        setAgreedCost(currentAssignment.agreedCost ?? "");
        setCurrency(currentAssignment.currency ?? "NPR");
        setStartDate(toDateTimeLocal(currentAssignment.startDate));
        setEndDate(toDateTimeLocal(currentAssignment.endDate));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!vendorId) {
      setError("Please select a vendor.");
      return;
    }

    if (!serviceName.trim()) {
      setError("Service name is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/events/${eventId}/vendors/${assignmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendorId: Number(vendorId),
            departmentId: departmentId
              ? Number(departmentId)
              : null,
            serviceName: serviceName.trim(),
            description: description.trim() || null,
            status,
            quotedCost: quotedCost
              ? Number(quotedCost)
              : null,
            agreedCost: agreedCost
              ? Number(agreedCost)
              : null,
            currency: currency.trim() || "NPR",
            startDate: startDate
              ? new Date(startDate).toISOString()
              : null,
            endDate: endDate
              ? new Date(endDate).toISOString()
              : null,
            notes: notes.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to update vendor assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/vendors`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update vendor assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this vendor assignment? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      const response = await fetch(
        `/api/events/${eventId}/vendors/${assignmentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to delete vendor assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/vendors`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete vendor assignment.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading vendor assignment...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          {error || "Vendor assignment not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${eventId}/vendors`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Vendor Assignments
        </Link>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Edit Vendor Assignment
        </h1>

        <p className="mt-1 text-muted-foreground">
          Update the vendor service assigned to this event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Assignment Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Vendor *
                </label>

                <Select
                  value={vendorId}
                  onValueChange={(value) =>
                    setVendorId(value ?? "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>

                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem
                        key={vendor.id}
                        value={String(vendor.id)}
                      >
                        {vendor.name}
                        {vendor.contactPerson
                          ? ` — ${vendor.contactPerson}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Department
                </label>

                <Select
                  value={departmentId}
                  onValueChange={(value) =>
                    setDepartmentId(value ?? "")
                  }
                >
                  <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-2">
              <label
                htmlFor="serviceName"
                className="text-sm font-medium"
              >
                Service Name *
              </label>

              <input
                id="serviceName"
                value={serviceName}
                onChange={(event) =>
                  setServiceName(event.target.value)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status
              </label>

              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value ?? "PLANNED")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="PLANNED">PLANNED</SelectItem>
                  <SelectItem value="QUOTED">QUOTED</SelectItem>
                  <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    IN_PROGRESS
                  </SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="quotedCost"
                  className="text-sm font-medium"
                >
                  Quoted Cost
                </label>

                <input
                  id="quotedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotedCost}
                  onChange={(event) =>
                    setQuotedCost(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="agreedCost"
                  className="text-sm font-medium"
                >
                  Agreed Cost
                </label>

                <input
                  id="agreedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreedCost}
                  onChange={(event) =>
                    setAgreedCost(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="currency"
                  className="text-sm font-medium"
                >
                  Currency
                </label>

                <input
                  id="currency"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="startDate"
                  className="text-sm font-medium"
                >
                  Start Date & Time
                </label>

                <input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="endDate"
                  className="text-sm font-medium"
                >
                  End Date & Time
                </label>

                <input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? "Deleting..." : "Delete Assignment"}
              </Button>

              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/events/${eventId}/vendors`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || deleting}
                  >
                    Cancel
                  </Button>
                </Link>

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
