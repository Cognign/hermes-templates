"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/dashboard", label: "Team", icon: Home },
  { href: "/dashboard/general", label: "Profile", icon: Settings },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/security", label: "Security", icon: Shield },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto border-b bg-card p-2 lg:min-h-[calc(100dvh-57px)] lg:flex-col lg:border-r lg:border-b-0 lg:p-3"
    >
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Button
            key={href}
            variant={active ? "secondary" : "ghost"}
            className="shrink-0 lg:justify-start"
            asChild
          >
            <Link href={href} aria-current={active ? "page" : undefined}>
              <Icon data-icon="inline-start" aria-hidden="true" />
              {label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
