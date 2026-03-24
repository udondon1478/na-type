"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/naginata", label: "薙刀式" },
  { href: "/arensito", label: "Arensito" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="font-mono text-lg font-bold tracking-wider">
          N.A.Type
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
