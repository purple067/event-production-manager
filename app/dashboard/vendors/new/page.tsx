"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewVendorPage() {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
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
        setError(data.error ?? "Failed to create vendor.");
        return;
      }

      window.location.href = "/dashboard/vendors";
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Add Vendor
        </h1>

        <p className="text-sm text-muted-foreground">
          Add a vendor or external service provider.
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
              placeholder="ABC Audio Rental"
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
              placeholder="Ram Shrestha"
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
              placeholder="vendor@example.com"
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
              placeholder="+977 98XXXXXXXX"
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
              placeholder="Kathmandu"
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
              placeholder="Audio Rental"
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
            placeholder="Thamel, Kathmandu"
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
            placeholder="Additional vendor information..."
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

        <div className="flex gap-3">
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
            disabled={saving}
          >
            {saving ? "Saving..." : "Add Vendor"}
          </Button>
        </div>
      </form>
    </main>
  );
}
