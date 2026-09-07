import Link from "next/link";
import { getCurrentContext } from "../../../src/lib/session";
import { db } from "../../../src/prisma/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EquipmentPage() {
  const context = await getCurrentContext();

  if (!context) {
    return null;
  }

  const equipment = await db.orm.public.Equipment
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((item) => item.name.asc())
    .all();

  const equipmentWithCategories = await Promise.all(
    equipment.map(async (item) => {
      const category = await db.orm.public.EquipmentCategory
        .where({
          id: item.categoryId,
          organizationId: context.organization.id,
        })
        .first();

      return {
        item,
        category,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Equipment Inventory
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage equipment, availability, condition and ownership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/equipment/categories">
            <Button variant="outline">
              Categories
            </Button>
          </Link>

          <Link href="/dashboard/equipment/new">
            <Button>
              Add Equipment
            </Button>
          </Link>
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No equipment found in your inventory.
            </p>

            <Link
              href="/dashboard/equipment/new"
              className="mt-4 inline-block"
            >
              <Button>
                Add your first equipment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Inventory ({equipment.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-3 font-medium">
                      Equipment
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Category
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Quantity
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Condition
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Ownership
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {equipmentWithCategories.map(
                    ({ item, category }) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-4">
                          <div className="font-medium">
                            {item.name}
                          </div>

                          {(item.manufacturer ||
                            item.model) && (
                            <div className="text-xs text-muted-foreground">
                              {[
                                item.manufacturer,
                                item.model,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}

                          {item.assetNumber && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Asset: {item.assetNumber}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {category ? (
                            <div>
                              <div className="font-medium">
                                {category.name}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {category.code}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Unknown
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {item.quantity}
                        </td>

                        <td className="px-3 py-4">
                          <Badge variant="outline">
                            {item.status}
                          </Badge>
                        </td>

                        <td className="px-3 py-4">
                          {item.condition}
                        </td>

                        <td className="px-3 py-4">
                          {item.ownership}
                        </td>

                        <td className="px-3 py-4">
                          <Link
                            href={`/dashboard/equipment/${item.id}/edit`}
                            className="font-medium underline underline-offset-4"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}