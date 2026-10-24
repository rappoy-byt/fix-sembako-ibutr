"use client";

import { CalendarDays, Lock, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STORE_TIME_ZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, NAV_SECTIONS, findNavItem, isCashierPath, type NavItem } from "./nav-config";
import { useGuardedNavigate } from "./pos-navigation-guard";

interface AppSidebarProps {
  /** Jumlah notifikasi belum dibaca, ditampilkan di menu Notifikasi. */
  unreadCount: number;
}

const todayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: STORE_TIME_ZONE,
});

const CASHIER_ITEM = NAV_ITEMS.find((item) => item.section === "cta");

/** Tujuan tombol Keluar di mode kasir. */
const CASHIER_EXIT_HREF = "/dashboard";

/**
 * Sidebar navigasi. Di layar >= lg tampil penuh dengan menu berkelompok;
 * di layar lebih kecil menyusut menjadi kolom ikon (label lewat tooltip).
 * Kasir tidak ada di daftar menu, tetapi menjadi tombol utama di bawah.
 * Selama halaman Kasir dibuka, sidebar berganti ke mode kasir (lihat CashierModeRail).
 */
export function AppSidebar({ unreadCount }: AppSidebarProps) {
  const pathname = usePathname();
  const activeHref = findNavItem(pathname)?.href;

  if (isCashierPath(pathname)) return <CashierModeRail />;

  // Mode ikon (< lg) memakai w-16; halaman Kasir memakai CashierModeRail (w-26).
  return (
    <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-64">
      <div className="hidden shrink-0 px-5 pt-5 pb-4 lg:block">
        <p className="truncate leading-tight font-semibold tracking-wide text-foreground">SEMBAKO IBU TR</p>
      </div>

      <div className="mx-4 hidden items-center gap-3 rounded-xl border border-sidebar-border px-3 py-2.5 lg:flex">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <CalendarDays aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Hari ini</p>
          <p className="truncate text-sm font-semibold text-foreground" suppressHydrationWarning>
            {todayFormatter.format(new Date())}
          </p>
        </div>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-2 py-2 lg:px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section} className="mt-1 space-y-0.5 lg:mt-3">
            <p className="hidden px-3 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase lg:block">
              {section}
            </p>
            {NAV_ITEMS.filter((item) => item.section === section).map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                isActive={item.href === activeHref}
                badgeCount={item.href === "/notifikasi" ? unreadCount : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      {CASHIER_ITEM && <CashierButton item={CASHIER_ITEM} isActive={CASHIER_ITEM.href === activeHref} />}
    </aside>
  );
}

/**
 * Mode kasir: sidebar menyusut menjadi kolom ikon yang diburamkan dan tidak bisa
 * diklik. Satu-satunya jalan keluar adalah tombol Keluar di bawah, yang tetap
 * lewat penjaga navigasi kasir (konfirmasi bila transaksi belum selesai).
 */
function CashierModeRail() {
  const guardedNavigate = useGuardedNavigate();

  // Lebar w-26 (104px) dipakai juga oleh bilah keranjang mobile Kasir (left-26).
  return (
    <aside
      aria-label="Mode kasir"
      className="sticky top-0 flex h-svh w-26 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Menu asli diburamkan sebagai latar; inert = tidak bisa difokus atau diklik. */}
      <div inert aria-hidden className="pointer-events-none flex flex-col items-center gap-2 pt-20 opacity-40 blur-[2.5px] select-none">
        {NAV_ITEMS.filter((item) => item.section !== "cta").map(({ href, icon: Icon }) => (
          <span key={href} className="flex size-12 items-center justify-center rounded-xl text-sidebar-foreground">
            <Icon className="size-6" />
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-sidebar/20 to-sidebar/70" />

      <div className="absolute inset-x-0 top-4 flex justify-center">
        <WithTooltip label="Menu dikunci selama mode kasir" alwaysShow>
          <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock aria-hidden className="size-[22px]" />
            <span className="sr-only">Menu dikunci selama mode kasir</span>
          </span>
        </WithTooltip>
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <Link
          href={CASHIER_EXIT_HREF}
          onNavigate={guardedNavigate(CASHIER_EXIT_HREF)}
          className={cn(
            "group flex flex-col items-center gap-1.5 text-sm font-medium text-sidebar-foreground",
            "focus-visible:outline-none"
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-xs transition-colors group-hover:border-danger/40 group-hover:text-danger group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
            <LogOut aria-hidden className="size-6" />
          </span>
          Keluar
        </Link>
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
  const guardedNavigate = useGuardedNavigate();

  const link = (
    <Link
      href={item.href}
      onNavigate={guardedNavigate(item.href)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center justify-center gap-3 rounded-lg px-2 text-[15px] transition-colors lg:justify-start lg:px-3",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon aria-hidden className={cn("size-5 shrink-0", !isActive && "text-muted-foreground")} />
      <span className="hidden flex-1 truncate lg:inline">{item.title}</span>

      {item.comingSoon && (
        <span className="hidden shrink-0 rounded-md border border-dashed px-1.5 text-[11px] text-muted-foreground lg:inline">
          Segera
        </span>
      )}
      {badgeCount > 0 && (
        <>
          {/* Mode ikon: titik merah; layar lebar: angka. */}
          <span aria-hidden className="absolute top-2 right-3 size-2 rounded-full bg-danger ring-2 ring-sidebar lg:hidden" />
          <span
            className="numeric hidden h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-danger-foreground lg:flex"
            aria-label={`${badgeCount} belum dibaca`}
          >
            {badgeCount}
          </span>
        </>
      )}
    </Link>
  );

  return <WithTooltip label={`${item.title}${item.comingSoon ? " (Segera)" : ""}`}>{link}</WithTooltip>;
}

function CashierButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  const guardedNavigate = useGuardedNavigate();

  const link = (
    <Link
      href={item.href}
      onNavigate={guardedNavigate(item.href)}
      aria-current={isActive ? "page" : undefined}
      aria-label="Buka Kasir"
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-xl bg-sidebar-primary font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90",
        "focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
        isActive && "ring-2 ring-sidebar-primary/30 ring-offset-2 ring-offset-sidebar"
      )}
    >
      <Icon aria-hidden className="size-5" />
      <span className="hidden lg:inline">Buka Kasir</span>
    </Link>
  );

  return (
    <div className="shrink-0 border-t border-sidebar-border p-2 lg:p-4">
      <WithTooltip label="Buka Kasir">{link}</WithTooltip>
    </div>
  );
}

/**
 * Tooltip label di kanan. Bawaannya hanya untuk mode ikon (layar < lg);
 * alwaysShow = tampil di semua ukuran (kolom mode kasir selalu berupa ikon).
 */
function WithTooltip({
  label,
  alwaysShow = false,
  children,
}: {
  label: string;
  alwaysShow?: boolean;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" className={cn(!alwaysShow && "lg:hidden")}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
