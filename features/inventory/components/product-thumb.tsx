"use client";

import { Package } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ProductThumbProps {
  imageUrl: string | null;
  name: string;
  size?: "sm" | "lg";
  className?: string;
}

/** Gambar produk dari image_url, dengan ikon cadangan jika kosong atau gagal dimuat. */
export function ProductThumb({ imageUrl, name, size = "sm", className }: ProductThumbProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && failedUrl !== imageUrl;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground",
        size === "sm" ? "size-10" : "size-20",
        className
      )}
    >
      {showImage ? (
        // URL gambar berasal dari input bebas pemilik (domain apa pun), sehingga
        // next/image (yang butuh daftar domain tetap) tidak cocok di sini.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <Package aria-hidden className={size === "sm" ? "size-5" : "size-8"} />
      )}
    </span>
  );
}
