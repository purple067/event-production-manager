import { Sidebar } from "@/components/dashboard/sidebar";
import { requireCurrentContext } from "../../src/lib/authorization";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCurrentContext();


  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}