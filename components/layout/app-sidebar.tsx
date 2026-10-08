"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, findNavItem, type NavItem } from "./nav-config";

interface AppSidebarProps {
  /** Jumlah notifikasi belum dibaca, ditampilkan di menu Notifikasi. */
  unreadCount: number;
}

/**
 * Sidebar navigasi. Di layar >= lg tampil penuh; di layar lebih kecil
 * menyusut menjadi kolom ikon (label tersedia lewat tooltip).
 */
export function AppSidebar({ unreadCount }: AppSidebarProps) {
  const pathname = usePathname();
  const activeHref = findNavItem(pathname)?.href;

  // Lebar mode ikon (< lg) tetap w-16: bilah keranjang mobile Kasir memakai left-16.
  return (
    <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col border-r bg-sidebar lg:w-60">
      <div className="flex h-14 items-center justify-center gap-3 border-b px-2 lg:h-auto lg:justify-start lg:border-b-0 lg:px-4 lg:py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:size-10">
          <Store aria-hidden className="size-5" />
        </span>
        <div className="hidden min-w-0 lg:block">
          {/* Nama toko boleh dua baris agar tidak terpotong. */}
          <p className="text-base leading-tight font-semibold">{APP_NAME}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Kasir & Inventaris</p>
        </div>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 space-y-1 overflow-y-auto px-1.5 py-3 lg:px-3 lg:py-2">
        <p className="hidden px-3 pt-1 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:block">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            isActive={item.href === activeHref}
            badgeCount={item.href === "/notifikasi" ? unreadCount : 0}
          />
        ))}
      </nav>

      <div className="hidden border-t px-6 py-4 text-xs text-muted-foreground lg:block">
        Prinsip stok: <span className="font-medium text-foreground">FEFO</span>
        <br />
        First Expired, First Out
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  isActive: boolean;
  badgeCount: number;
}

function SidebarLink({ item, isActive, badgeCount }: SidebarLinkProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-[42px] items-center justify-center gap-2.5 rounded-lg px-2 font-medium transition-colors lg:justify-start lg:px-3 lg:text-[15px]",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground/85 hover:bg-muted hover:text-foreground"
      )}
    >
      {isActive && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary" />
      )}
      <Icon aria-hidden className="size-[18px] shrink-0" />
      <span className="hidden flex-1 truncate leading-tight lg:inline">{item.title}</span>

      {item.comingSoon && (
        <span className="hidden shrink-0 rounded-md border border-dashed px-1.5 py-px text-[10px] font-medium text-muted-foreground lg:inline">
          Segera
        </span>
      )}
      {badgeCount > 0 && (
        <span
          className="numeric absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-danger-foreground lg:static"
          aria-label={`${badgeCount} belum dibaca`}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );

  // Tooltip hanya berguna saat sidebar dalam mode ikon (layar < lg).
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" className="lg:hidden">
        {item.title}
        {item.comingSoon && " (Segera)"}
      </TooltipContent>
    </Tooltip>
  );
}
