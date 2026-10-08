"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOwner } from "@/features/auth/queries";
import { describeDbError, PG_ERROR } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";

import { getStoreToday } from "./lib/business-rules";
import {
  isUuid,
  parseBatchForm,
  parseProductForm,
  validateBatchDates,
  type BatchField,
  type FieldErrors,
  type ProductField,
} from "./lib/validation";

export type ActionResult<K extends string = string> =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors<K> };

const SESSION_EXPIRED = "Sesi login berakhir. Silakan masuk kembali.";

function revalidateInventory(productId?: string) {
  revalidatePath("/barang");
  if (productId) revalidatePath(`/barang/${productId}`);
}

// ---------------------------------------------------------------- Barang

export async function createProduct(formData: FormData): Promise<ActionResult<ProductField>> {
  if (!(await getCurrentOwner())) return { ok: false, message: SESSION_EXPIRED };

  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "Periksa kembali isian form.", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...parsed.data, is_active: true })
    .select("id")
    .single();

  if (error) return productWriteError(error, "Gagal menambah barang");

  revalidateInventory();
  return { ok: true, message: `Barang "${parsed.data.name}" berhasil ditambahkan.`, id: data.id };
}

export async function updateProduct(
  productId: string,
  formData: FormData
): Promise<ActionResult<ProductField>> {
  if (!(await getCurrentOwner())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(productId)) return { ok: false, message: "Barang tidak valid." };

  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "Periksa kembali isian form.", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId)
    .select("id");

  if (error) return productWriteError(error, "Gagal menyimpan perubahan barang");
  if (data.length === 0) return { ok: false, message: "Barang tidak ditemukan." };

  revalidateInventory(productId);
  return { ok: true, message: `Perubahan "${parsed.data.name}" tersimpan.`, id: productId };
}

/** Tidak ada hard delete: barang dinonaktifkan dengan is_active = false. */
export async function setProductActive(
  productId: string,
  isActive: boolean
): Promise<ActionResult> {
  if (!(await getCurrentOwner())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(productId)) return { ok: false, message: "Barang tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("id, name");

  if (error) {
    return {
      ok: false,
      message: describeDbError(error, isActive ? "Gagal mengaktifkan barang" : "Gagal menonaktifkan barang"),
    };
  }
  if (data.length === 0) return { ok: false, message: "Barang tidak ditemukan." };

  revalidateInventory(productId);
  return {
    ok: true,
    message: isActive
      ? `"${data[0].name}" diaktifkan kembali.`
      : `"${data[0].name}" dinonaktifkan dan tidak akan muncul di kasir.`,
    id: productId,
  };
}

function productWriteError(
  error: Parameters<typeof describeDbError>[0],
  context: string
): ActionResult<ProductField> {
  if (error.code === PG_ERROR.UNIQUE_VIOLATION) {
    return {
      ok: false,
      message: "SKU sudah dipakai barang lain.",
      fieldErrors: { sku: "SKU sudah dipakai barang lain." },
    };
  }
  if (error.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
    return {
      ok: false,
      message: "Kategori tidak ditemukan.",
      fieldErrors: { category_id: "Kategori tidak ditemukan. Muat ulang halaman." },
    };
  }
  return { ok: false, message: describeDbError(error, context) };
}

// ---------------------------------------------------------------- Batch

/**
 * Menambah batch stok baru + mencatat stock movement 'IN'.
 *
 * Catatan atomisitas: tanpa fungsi database, dua insert ini tidak bisa dalam
 * satu transaksi. Jika pencatatan movement gagal, batch sudah tersimpan —
 * aplikasi melaporkannya dengan jelas (bukan pura-pura berhasil).
 */
export async function createStockBatch(
  formData: FormData
): Promise<ActionResult<BatchField | "product_id">> {
  if (!(await getCurrentOwner())) return { ok: false, message: SESSION_EXPIRED };

  const parsed = parseBatchForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "Periksa kembali isian form.", fieldErrors: parsed.fieldErrors };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, category:categories(default_expiry_days)")
    .eq("id", input.product_id)
    .maybeSingle();

  if (productError) return { ok: false, message: describeDbError(productError, "Gagal memuat barang") };
  if (!product) return { ok: false, message: "Barang tidak ditemukan." };

  const dateErrors = validateBatchDates({
    incomingDate: input.incoming_date,
    expiryDate: input.expiry_date,
    today: getStoreToday(),
    requiresExpiry: product.category?.default_expiry_days != null,
  });
  if (Object.keys(dateErrors).length > 0) {
    return { ok: false, message: "Periksa kembali tanggal batch.", fieldErrors: dateErrors };
  }

  const { data: batch, error: batchError } = await supabase
    .from("stock_batches")
    .insert({
      product_id: input.product_id,
      batch_number: input.batch_number,
      // Selalu dikirim eksplisit (tanggal WIB) — jangan andalkan default CURRENT_DATE (UTC).
      incoming_date: input.incoming_date,
      initial_quantity: input.quantity,
      remaining_quantity: input.quantity,
      expiry_date: input.expiry_date,
      purchase_price: input.purchase_price,
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (batchError) {
    if (batchError.code === PG_ERROR.UNIQUE_VIOLATION) {
      return {
        ok: false,
        message: "Nomor batch sudah dipakai untuk barang ini.",
        fieldErrors: { batch_number: "Nomor batch sudah dipakai untuk barang ini." },
      };
    }
    return { ok: false, message: describeDbError(batchError, "Gagal menyimpan batch") };
  }

  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: input.product_id,
    batch_id: batch.id,
    movement_type: "IN",
    quantity: input.quantity,
    note: `Barang masuk — batch ${input.batch_number}`,
  });

  revalidateInventory(input.product_id);

  if (movementError) {
    const detail = describeDbError(movementError, "Pencatatan stock movement gagal");
    return {
      ok: false,
      message:
        `Batch ${input.batch_number} TERSIMPAN dan stoknya sudah terhitung, tetapi riwayat ` +
        `pergerakan stok (stock movement) gagal dicatat. ${detail}`,
    };
  }

  return {
    ok: true,
    message: `Batch ${input.batch_number} (${input.quantity} unit) ditambahkan ke ${product.name}.`,
    id: batch.id,
  };
}
