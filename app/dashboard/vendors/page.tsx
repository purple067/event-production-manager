import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";

export default async function VendorsPage() {
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const vendors = await db.orm.public.Vendor
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((vendor) => vendor.name.asc())
    .all();

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Vendors
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage vendors and external service providers.
          </p>
        </div>

        <Link href="/dashboard/vendors/new">
          <Button>Add Vendor</Button>
        </Link>
      </div>

      <div className="rounded-lg border">
        {vendors.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No vendors found.
            </p>

            <div className="mt-4">
              <Link href="/dashboard/vendors/new">
                <Button>Add your first vendor</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    Vendor
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Contact
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Phone
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Service
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {vendor.name}
                      </div>

                      {vendor.email && (
                        <div className="text-xs text-muted-foreground">
                          {vendor.email}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {vendor.contactPerson || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {vendor.phone || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {vendor.serviceType || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          vendor.isActive
                            ? "default"
                            : "secondary"
                        }
                      >
                        {vendor.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/vendors/${vendor.id}/edit`}
                      >
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
