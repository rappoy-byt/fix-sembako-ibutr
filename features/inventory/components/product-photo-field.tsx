"use client";

import { Camera, ImageIcon, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/** Bucket Supabase Storage (publik untuk dibaca). Dibuat sekali oleh pemilik proyek Supabase. */
const BUCKET = "product-images";
/** Sisi terpanjang foto setelah diperkecil, dalam piksel. */
const MAX_SIDE = 800;
const JPEG_QUALITY = 0.82;

/** Perkecil foto di browser agar unggahan ringan (± 100 KB) dan halaman cepat dimuat. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung pengolahan gambar.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Foto gagal diproses."))), "image/jpeg", JPEG_QUALITY)
  );
}

interface ProductPhotoFieldProps {
  /** URL foto saat ini; dikirim ke server lewat input tersembunyi `image_url`. */
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/** Foto barang: ambil dari kamera/galeri lalu unggah ke Storage, atau tempel link gambar. */
export function ProductPhotoField({ value, onChange, onUploadingChange, error, disabled }: ProductPhotoFieldProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [useLink, setUseLink] = useState(false);

  const busy = disabled || isUploading;
  const showImage = value !== "" && failedUrl !== value;
  const message = uploadError ?? error;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    onUploadingChange(true);
    try {
      const blob = await shrinkImage(file);
      const supabase = createClient();
      const path = `products/${crypto.randomUUID()}.jpg`;
      const { error: uploadFailed } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadFailed) {
        console.error("[foto barang] unggah gagal:", uploadFailed);
        setUploadError("Foto gagal diunggah. Pastikan penyimpanan foto sudah disiapkan, atau pakai link gambar.");
        return;
      }
      onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      setUseLink(false);
    } catch (err) {
      console.error("[foto barang] proses gagal:", err);
      setUploadError("Foto gagal diproses. Coba foto lain.");
    } finally {
      setIsUploading(false);
      onUploadingChange(false);
    }
  }

  const fileInputProps = {
    type: "file",
    accept: "image/*",
    className: "sr-only",
    tabIndex: -1,
    "aria-hidden": true,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      void handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
  } as const;

  return (
    <div className="space-y-2.5 sm:col-span-2">
      <p className="text-sm font-medium">
        Foto barang <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
      </p>
      <input type="hidden" name="image_url" value={value} />
      <input ref={cameraRef} {...fileInputProps} capture="environment" />
      <input ref={galleryRef} {...fileInputProps} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-muted-foreground">
          {isUploading ? (
            <span className="flex flex-col items-center gap-1.5 text-xs">
              <Loader2 aria-hidden className="size-6 animate-spin" />
              Mengunggah…
            </span>
          ) : showImage ? (
            // URL bisa dari domain mana pun (link bebas), sehingga next/image tidak cocok di sini.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Foto barang" className="size-full object-cover" onError={() => setFailedUrl(value)} />
          ) : (
            <ImageIcon aria-hidden className="size-8" />
          )}
        </div>

        <div className="min-w-52 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {value ? (
              <>
                <Button type="button" variant="outline" className="h-10" onClick={() => galleryRef.current?.click()} disabled={busy}>
                  <RefreshCw />
                  Ganti foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-danger"
                  onClick={() => {
                    onChange("");
                    setUploadError(null);
                  }}
                  disabled={busy}
                >
                  <Trash2 />
                  Hapus
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" className="h-10" onClick={() => cameraRef.current?.click()} disabled={busy}>
                  <Camera />
                  Ambil foto
                </Button>
                <Button type="button" variant="outline" className="h-10" onClick={() => galleryRef.current?.click()} disabled={busy}>
                  <Upload />
                  Pilih dari galeri
                </Button>
              </>
            )}
          </div>
          {message ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Foto dari kamera HP atau galeri. Otomatis diperkecil supaya cepat dimuat.
            </p>
          )}
          <button
            type="button"
            onClick={() => setUseLink((v) => !v)}
            disabled={busy}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {useLink ? "Tutup link gambar" : "Pakai link gambar saja"}
          </button>
          {useLink && (
            <Input
              type="url"
              inputMode="url"
              aria-label="Link gambar"
              placeholder="https://"
              value={value}
              onChange={(e) => onChange(e.target.value.trim())}
              disabled={busy}
              className="h-9"
            />
          )}
        </div>
      </div>
    </div>
  );
}
