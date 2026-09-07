import Link from "next/link";
import { getCurrentContext } from "../../../../src/lib/session";
import { db } from "../../../../src/prisma/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function EquipmentCategoriesPage() {
  const context = await getCurrentContext();

  if (!context) {
    return null;
  }

  const categories = await db.orm.public.EquipmentCategory
    .where({
      organizationId: context.organization.id,
    })
    .orderBy((category) => category.name.asc())
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your production equipment by category.
          </p>
        </div>

        <Link href="/dashboard/equipment/categories/new">
          <Button>Add Category</Button>
        </Link>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No equipment categories found.
            </p>

            <Link
              href="/dashboard/equipment/categories/new"
              className="mt-4 inline-block"
            >
              <Button>Create your first category</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {category.code}
                  </p>
                </div>
              </CardHeader>

              <CardContent>
                <p className="min-h-10 text-sm text-muted-foreground">
                  {category.description || "No description provided."}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/dashboard/equipment/categories/${category.id}/edit`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Edit
                  </Link>

                  <span className="text-xs text-muted-foreground">
                    Category #{category.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}