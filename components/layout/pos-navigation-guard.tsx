"use client";

import { ShoppingCart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canLeaveAfterConfirm,
  getLeaveDialogCopy,
  needsLeaveConfirmation,
  shouldBlockUnload,
  type LeaveIntent,
  type PosGuardLevel,
  type PosGuardStatus,
} from "@/features/pos/lib/navigation-guard";

interface PosNavigationGuardValue {
  /** Dipanggil kasir untuk melaporkan statusnya; null = kasir tidak aktif. */
  reportPosState: (status: PosGuardStatus) => void;
  /**
   * Minta izin meninggalkan halaman. true = kasir tidak aktif, boleh langsung
   * (pemanggil lanjut sendiri). false = ditahan; dialog dibuka dan `proceed` hanya dijalankan
   * bila pengguna mengonfirmasi dan statusnya memang boleh ditinggalkan.
   */
  requestLeave: (intent: LeaveIntent, proceed: () => void) => boolean;
}

const PosNavigationGuardContext = createContext<PosNavigationGuardValue | null>(null);

interface PendingLeave {
  level: PosGuardLevel;
  intent: LeaveIntent;
  proceed: () => void;
}

/**
 * POS Focus Mode: menjaga transaksi kasir yang belum selesai dari navigasi
 * sidebar, link notifikasi, logout, serta refresh/tutup tab (beforeunload).
 * Mengikuti pola "Blocking navigation" di dokumentasi next/link (Context + onNavigate).
 *
 * Catatan: tombol Back/Forward browser tidak bisa diblokir dengan andal di App Router.
 */
export function PosNavigationGuardProvider({ children }: { children: React.ReactNode }) {
  // Ref (bukan state): handler membaca nilai terbaru saat klik tanpa re-render seluruh shell.
  const levelRef = useRef<PosGuardStatus>(null);
  const [pending, setPending] = useState<PendingLeave | null>(null);

  const reportPosState = useCallback((status: PosGuardStatus) => {
    levelRef.current = status;
  }, []);

  const requestLeave = useCallback((intent: LeaveIntent, proceed: () => void) => {
    const level = levelRef.current;
    if (!needsLeaveConfirmation(level)) return true;
    // Satu dialog saja: permintaan baru menggantikan yang lama.
    setPending({ level, intent, proceed });
    return false;
  }, []);

  // Refresh / tutup tab / ketik URL baru saat transaksi belum selesai.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!shouldBlockUnload(levelRef.current)) return;
      event.preventDefault();
      // Browser lama butuh returnValue terisi; teks dialognya tetap bawaan browser.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function stayOnPos() {
    setPending(null);
  }

  function confirmLeave() {
    if (!pending) return;
    const { proceed } = pending;
    setPending(null);
    // Cek ulang status terkini: bisa saja berubah selama dialog terbuka.
    // null = kasir sudah tidak aktif (mis. sesi berakhir) → tetap boleh lanjut.
    const current = levelRef.current;
    if (current === null || canLeaveAfterConfirm(current)) proceed();
  }

  const value = useMemo(() => ({ reportPosState, requestLeave }), [reportPosState, requestLeave]);
  const copy = pending ? getLeaveDialogCopy(pending.level, pending.intent) : null;

  return (
    <PosNavigationGuardContext.Provider value={value}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && stayOnPos()}>
        <DialogContent className="sm:max-w-md">
          {copy && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">{copy.title}</DialogTitle>
                <DialogDescription>{copy.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                {copy.confirmLabel && (
                  <Button variant="destructive" onClick={confirmLeave}>
                    {copy.confirmLabel}
                  </Button>
                )}
                <Button onClick={stayOnPos} autoFocus>
                  <ShoppingCart />
                  Lanjutkan POS
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PosNavigationGuardContext.Provider>
  );
}

/** Tanpa provider (mis. di luar shell aplikasi), navigasi tidak pernah ditahan. */
const ALWAYS_ALLOW: PosNavigationGuardValue = {
  reportPosState: () => {},
  requestLeave: () => true,
};

export function usePosNavigationGuard() {
  return useContext(PosNavigationGuardContext) ?? ALWAYS_ALLOW;
}

/**
 * Handler `onNavigate` untuk next/link. Navigasi SPA dibatalkan selama kasir
 * aktif (dialog konfirmasi muncul, juga saat keranjang kosong); setelah konfirmasi,
 * navigasi dilanjutkan dengan router.push (router.push tidak memicu onNavigate lagi, jadi tidak berulang).
 */
export function useGuardedNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const { requestLeave } = usePosNavigationGuard();
  return useCallback(
    (href: string) => (event: { preventDefault: () => void }) => {
      // Menuju halaman yang sedang dibuka (mis. menu Kasir saat di /kasir) bukan "meninggalkan".
      if (href === pathname) return;
      if (!requestLeave("navigate", () => router.push(href))) event.preventDefault();
    },
    [pathname, requestLeave, router]
  );
}
