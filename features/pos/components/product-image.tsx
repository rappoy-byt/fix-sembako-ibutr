"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ProductImageProps {
  imageUrl: string | null;
  name: string;
  className?: string;
  /** Ukuran teks inisial; menyesuaikan besar kotak. */
  initialsClassName?: string;
}

/** Foto barang; bila kosong atau gagal dimuat, tampil inisial nama di latar netral. */
export function ProductImage({ imageUrl, name, className, initialsClassName }: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && failedUrl !== imageUrl;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className
      )}
    >
      {showImage ? (
        // URL gambar bebas domain (input pemilik), jadi tidak memakai next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span aria-hidden className={cn("font-semibold tracking-wide select-none", initialsClassName)}>
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}

/** "Beras Premium 5 kg" → "BP"; satu kata → dua huruf pertama. */
export function getInitials(name: string) {
  const [first, second] = name.match(/\p{L}+/gu) ?? [];
  if (!first) return name.slice(0, 2).toUpperCase();
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first[0] + second[0]).toUpperCase();
}
