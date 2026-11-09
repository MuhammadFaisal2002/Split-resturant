"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const links = [
  { href: "/home", label: "Splits" },
  { href: "/groups", label: "Groups" },
  { href: "/profile", label: "Profile" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/") || (l.href === "/home" && pathname.startsWith("/splits"));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "h-9 px-3 rounded-lg text-sm font-medium flex items-center",
              active ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
