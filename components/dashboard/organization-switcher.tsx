"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Organization = {
  id: number;
  name: string;
};

type OrganizationSwitcherProps = {
  currentOrganization: Organization;
  organizations: Organization[];
};

export function OrganizationSwitcher({
  currentOrganization,
  organizations,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const organizationId = Number(event.target.value);

    if (!Number.isInteger(organizationId)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/organization/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error(data.error);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Organization switch failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b p-4">
      <label
        htmlFor="organization"
        className="mb-2 block text-xs font-medium text-muted-foreground"
      >
        Organization
      </label>

      <select
        id="organization"
        value={currentOrganization.id}
        onChange={handleChange}
        disabled={loading}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {organizations.map((organization) => (
          <option
            key={organization.id}
            value={organization.id}
          >
            {organization.name}
          </option>
        ))}
      </select>
    </div>
  );
}