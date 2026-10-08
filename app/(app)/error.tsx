"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Halaman gagal dimuat"
      message={error.message || "Terjadi kesalahan yang tidak terduga."}
      action={
        <Button variant="outline" onClick={reset}>
          <RotateCcw />
          Coba lagi
        </Button>
      }
    />
  );
}
