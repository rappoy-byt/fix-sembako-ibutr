import {
  Bell,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Sparkles,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/** Kelompok menu di sidebar; "cta" = tombol utama di bawah (Buka Kasir). */
export type NavSection = "Ringkasan" | "Inventaris" | "Lainnya" | "cta";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  section: NavSection;
  /** Modul belum tersedia → tampil dengan label "Segera". */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    section: "Ringkasan",
    icon: LayoutDashboard,
    description: "Ringkasan penjualan dan kondisi stok",
  },
  {
    title: "Kasir",
    href: "/kasir",
    section: "cta",
    icon: ShoppingCart,
    description: "Transaksi penjualan (POS)",
  },
  {
    title: "Barang",
    href: "/barang",
    section: "Inventaris",
    icon: Package,
    description: "Data produk dan kategori",
  },
  {
    title: "Stok",
    href: "/stok",
    section: "Inventaris",
    icon: Warehouse,
    description: "Batch stok, barang masuk, dan FEFO",
  },
  {
    title: "Notifikasi",
    href: "/notifikasi",
    section: "Lainnya",
    icon: Bell,
    description: "Peringatan kedaluwarsa dan stok menipis",
  },
  {
    title: "AI Analytics",
    href: "/ai-analytics",
    section: "Lainnya",
    icon: Sparkles,
    description: "Analisis tren dan rekomendasi restock",
    comingSoon: true,
  },
];

/** Urutan kelompok menu di sidebar. */
export const NAV_SECTIONS: Exclude<NavSection, "cta">[] = ["Ringkasan", "Inventaris", "Lainnya"];

/** Halaman Kasir = mode kasir (sidebar dikunci, tanpa header). */
export function isCashierPath(pathname: string) {
  return pathname === "/kasir" || pathname.startsWith("/kasir/");
}

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}
