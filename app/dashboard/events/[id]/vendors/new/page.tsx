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
  serviceType: string | null;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

export default function NewEventVendorPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.id);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

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
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [vendorsResponse, departmentsResponse] = await Promise.all([
          fetch("/api/vendors"),
          fetch(`/api/events/${eventId}/departments`),
        ]);

        if (!vendorsResponse.ok) {
          throw new Error("Failed to load vendors.");
        }

        if (!departmentsResponse.ok) {
          throw new Error("Failed to load departments.");
        }

        const vendorsData = await vendorsResponse.json();
        const departmentsData = await departmentsResponse.json();

        setVendors(vendorsData.vendors ?? []);
        setDepartments(departmentsData.departments ?? []);
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
      const response = await fetch(`/api/events/${eventId}/vendors`, {
        method: "POST",
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to create vendor assignment.",
        );
      }

      router.push(`/dashboard/events/${eventId}/vendors`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create vendor assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading vendor assignment form...
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
          Add Vendor Assignment
        </h1>

        <p className="mt-1 text-muted-foreground">
          Assign a vendor and service to this event.
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
                placeholder="e.g. Audio Equipment Rental"
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
                placeholder="Describe the vendor service..."
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
                  <SelectItem value="PLANNED">
                    PLANNED
                  </SelectItem>
                  <SelectItem value="QUOTED">
                    QUOTED
                  </SelectItem>
                  <SelectItem value="CONFIRMED">
                    CONFIRMED
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    IN_PROGRESS
                  </SelectItem>
                  <SelectItem value="COMPLETED">
                    COMPLETED
                  </SelectItem>
                  <SelectItem value="CANCELLED">
                    CANCELLED
                  </SelectItem>
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
                  placeholder="150000"
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
                  placeholder="135000"
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
                  placeholder="NPR"
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
                placeholder="Additional notes..."
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/dashboard/events/${eventId}/vendors`}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Link>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
