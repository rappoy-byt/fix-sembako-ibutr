import {
  Bell,
  Boxes,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Modul belum tersedia → tampil dengan label "Segera". */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Ringkasan penjualan dan kondisi stok",
  },
  {
    title: "Kasir",
    href: "/kasir",
    icon: ShoppingCart,
    description: "Transaksi penjualan (POS)",
  },
  {
    title: "Barang",
    href: "/barang",
    icon: Package,
    description: "Data produk dan kategori",
  },
  {
    title: "Stok",
    href: "/stok",
    icon: Boxes,
    description: "Batch stok, barang masuk, dan FEFO",
  },
  {
    title: "Notifikasi",
    href: "/notifikasi",
    icon: Bell,
    description: "Peringatan kedaluwarsa dan stok menipis",
  },
  {
    title: "AI Analytics",
    href: "/ai-analytics",
    icon: Sparkles,
    description: "Analisis tren dan rekomendasi restock",
    comingSoon: true,
  },
];

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}
