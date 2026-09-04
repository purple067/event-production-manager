import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Users,
  Package,
  Truck,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  LayoutDashboard,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Events",
    href: "/dashboard/events",
    icon: CalendarDays,
  },
  {
    name: "Production",
    href: "/dashboard/production",
    icon: ClipboardList,
  },
  {
    name: "Equipment",
    href: "/dashboard/equipment",
    icon: Package,
  },
  {
    name: "Crew",
    href: "/dashboard/crew",
    icon: Users,
  },
  {
    name: "Logistics",
    href: "/dashboard/logistics",
    icon: Truck,
  },
  {
    name: "Finance",
    href: "/dashboard/finance",
    icon: Wallet,
  },
  {
    name: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <h1 className="text-lg font-bold">EPM</h1>
          <p className="text-xs text-muted-foreground">
            Event Production Manager
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}