"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Vendor = {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  serviceType: string | null;
  notes: string | null;
  isActive: boolean;
};

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [vendorId, setVendorId] = useState("");
  const [vendor, setVendor] = useState<Vendor | null>(null);

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVendor() {
      const { id } = await params;

      setVendorId(id);

      try {
        const response = await fetch(`/api/vendors/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Vendor not found.");
          return;
        }

        const item = data.vendor as Vendor;

        setVendor(item);
        setName(item.name);
        setContactPerson(item.contactPerson ?? "");
        setEmail(item.email ?? "");
        setPhone(item.phone ?? "");
        setAddress(item.address ?? "");
        setCity(item.city ?? "");
        setServiceType(item.serviceType ?? "");
        setNotes(item.notes ?? "");
        setIsActive(item.isActive);
      } catch {
        setError("Unable to load vendor.");
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [params]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contactPerson,
          email,
          phone,
          address,
          city,
          serviceType,
          notes,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to update vendor.");
        return;
      }

      window.location.href = "/dashboard/vendors";
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vendor?",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to delete vendor.");
        return;
      }

      window.location.href = "/dashboard/vendors";
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading vendor...
        </p>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">
          Vendor Not Found
        </h1>

        <p className="text-sm text-destructive">
          {error || "The requested vendor does not exist."}
        </p>

        <Link href="/dashboard/vendors">
          <Button variant="outline">
            Back to Vendors
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Edit Vendor
        </h1>

        <p className="text-sm text-muted-foreground">
          Update vendor information.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border p-6"
      >
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Vendor Name *
            </label>

            <input
              id="name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="contactPerson"
              className="text-sm font-medium"
            >
              Contact Person
            </label>

            <input
              id="contactPerson"
              value={contactPerson}
              onChange={(event) =>
                setContactPerson(event.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium"
            >
              Phone
            </label>

            <input
              id="phone"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="city"
              className="text-sm font-medium"
            >
              City
            </label>

            <input
              id="city"
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="serviceType"
              className="text-sm font-medium"
            >
              Service Type
            </label>

            <input
              id="serviceType"
              value={serviceType}
              onChange={(event) =>
                setServiceType(event.target.value)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="address"
            className="text-sm font-medium"
          >
            Address
          </label>

          <input
            id="address"
            value={address}
            onChange={(event) =>
              setAddress(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) =>
              setIsActive(event.target.checked)
            }
            className="h-4 w-4"
          />

          Vendor is active
        </label>

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/vendors">
            <Button
              type="button"
              variant="outline"
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

          <Button
            type="button"
            variant="destructive"
            disabled={saving || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete Vendor"}
          </Button>
        </div>
      </form>
    </main>
  );
}
