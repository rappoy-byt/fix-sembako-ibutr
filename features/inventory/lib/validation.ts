/**
 * Validasi input form Barang & Batch. Murni (tanpa I/O): dipakai server action
 * sebagai pemeriksaan utama, dan bisa dipakai klien untuk umpan balik cepat.
 * Database tetap menjaga aturan yang sama lewat constraint (unique, check).
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ParseResult<T, K extends string> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: FieldErrors<K> };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Batas kolom int4 di Postgres. */
const INT4_MAX = 2_147_483_647;

export function isUuid(value: string) {
  return UUID.test(value);
}

export function isValidIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** SKU disimpan tanpa spasi di ujung dan huruf besar, agar "abc-01" = "ABC-01". */
export function normalizeSku(value: string) {
  return value.trim().toUpperCase();
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseMoney(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseInteger(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

// ---------------------------------------------------------------- Barang

export type ProductField =
  | "name"
  | "sku"
  | "category_id"
  | "unit"
  | "purchase_price"
  | "selling_price"
  | "minimum_stock"
  | "image_url";

export interface ProductInput {
  name: string;
  sku: string;
  category_id: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  image_url: string | null;
}

export function parseProductForm(formData: FormData): ParseResult<ProductInput, ProductField> {
  const errors: FieldErrors<ProductField> = {};

  const name = text(formData, "name");
  if (!name) errors.name = "Nama barang wajib diisi.";
  else if (name.length > 120) errors.name = "Nama barang maksimal 120 karakter.";

  const sku = normalizeSku(text(formData, "sku"));
  if (!sku) errors.sku = "SKU wajib diisi.";
  else if (sku.length > 50) errors.sku = "SKU maksimal 50 karakter.";

  const categoryId = text(formData, "category_id");
  if (!categoryId || !isUuid(categoryId)) errors.category_id = "Kategori wajib dipilih.";

  const unit = text(formData, "unit");
  if (!unit) errors.unit = "Satuan wajib diisi.";
  else if (unit.length > 20) errors.unit = "Satuan maksimal 20 karakter.";

  const purchasePrice = parseMoney(text(formData, "purchase_price"));
  if (purchasePrice === null) errors.purchase_price = "Harga beli wajib diisi dengan angka.";
  else if (purchasePrice < 0) errors.purchase_price = "Harga beli tidak boleh negatif.";

  const sellingPrice = parseMoney(text(formData, "selling_price"));
  if (sellingPrice === null) errors.selling_price = "Harga jual wajib diisi dengan angka.";
  else if (sellingPrice < 0) errors.selling_price = "Harga jual tidak boleh negatif.";

  const minimumStock = parseInteger(text(formData, "minimum_stock"));
  if (minimumStock === null) errors.minimum_stock = "Stok minimum wajib diisi dengan bilangan bulat.";
  else if (minimumStock < 0) errors.minimum_stock = "Stok minimum tidak boleh negatif.";
  else if (minimumStock > INT4_MAX) errors.minimum_stock = "Stok minimum terlalu besar.";

  const imageUrl = text(formData, "image_url");
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
    errors.image_url = "URL gambar harus diawali http:// atau https://.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    data: {
      name,
      sku,
      category_id: categoryId,
      unit,
      purchase_price: purchasePrice ?? 0,
      selling_price: sellingPrice ?? 0,
      minimum_stock: minimumStock ?? 0,
      image_url: imageUrl || null,
    },
  };
}

// ---------------------------------------------------------------- Batch

export type BatchField =
  | "batch_number"
  | "incoming_date"
  | "quantity"
  | "expiry_date"
  | "purchase_price";

export interface BatchInput {
  product_id: string;
  batch_number: string;
  incoming_date: string;
  quantity: number;
  expiry_date: string | null;
  purchase_price: number;
}

/** Validasi bentuk input batch. Aturan tanggal yang butuh konteks ada di validateBatchDates. */
export function parseBatchForm(
  formData: FormData
): ParseResult<BatchInput, BatchField | "product_id"> {
  const errors: FieldErrors<BatchField | "product_id"> = {};

  const productId = text(formData, "product_id");
  if (!isUuid(productId)) errors.product_id = "Barang tidak valid.";

  const batchNumber = text(formData, "batch_number");
  if (!batchNumber) errors.batch_number = "Nomor batch wajib diisi.";
  else if (batchNumber.length > 50) errors.batch_number = "Nomor batch maksimal 50 karakter.";

  const incomingDate = text(formData, "incoming_date");
  if (!isValidIsoDate(incomingDate)) errors.incoming_date = "Tanggal masuk wajib diisi.";

  const quantity = parseInteger(text(formData, "quantity"));
  if (quantity === null) errors.quantity = "Jumlah wajib diisi dengan bilangan bulat.";
  else if (quantity <= 0) errors.quantity = "Jumlah harus lebih dari 0.";
  else if (quantity > INT4_MAX) errors.quantity = "Jumlah terlalu besar.";

  const expiryRaw = text(formData, "expiry_date");
  if (expiryRaw && !isValidIsoDate(expiryRaw)) errors.expiry_date = "Tanggal kedaluwarsa tidak valid.";

  const purchasePrice = parseMoney(text(formData, "purchase_price"));
  if (purchasePrice === null) errors.purchase_price = "Harga beli wajib diisi dengan angka.";
  else if (purchasePrice < 0) errors.purchase_price = "Harga beli tidak boleh negatif.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    data: {
      product_id: productId,
      batch_number: batchNumber,
      incoming_date: incomingDate,
      quantity: quantity ?? 0,
      expiry_date: expiryRaw || null,
      purchase_price: purchasePrice ?? 0,
    },
  };
}

/**
 * Aturan tanggal batch (tanggal bisnis WIB):
 * - tanggal masuk tidak boleh di masa depan;
 * - kedaluwarsa wajib jika kategori punya default_expiry_days;
 * - kedaluwarsa tidak boleh sebelum tanggal masuk;
 * - kedaluwarsa tidak boleh sudah lewat (batch expired tidak boleh masuk sebagai stok jual).
 *   Kedaluwarsa HARI INI masih diperbolehkan karena masih layak jual hari ini.
 */
export function validateBatchDates(input: {
  incomingDate: string;
  expiryDate: string | null;
  today: string;
  requiresExpiry: boolean;
}): FieldErrors<"incoming_date" | "expiry_date"> {
  const errors: FieldErrors<"incoming_date" | "expiry_date"> = {};
  const { incomingDate, expiryDate, today, requiresExpiry } = input;

  if (incomingDate > today) errors.incoming_date = "Tanggal masuk tidak boleh melewati hari ini.";

  if (!expiryDate) {
    if (requiresExpiry) {
      errors.expiry_date = "Tanggal kedaluwarsa wajib diisi untuk kategori ini.";
    }
  } else if (expiryDate < incomingDate) {
    errors.expiry_date = "Tanggal kedaluwarsa tidak boleh sebelum tanggal masuk.";
  } else if (expiryDate < today) {
    errors.expiry_date = "Tanggal kedaluwarsa sudah lewat — batch expired tidak boleh dijual.";
  }

  return errors;
}
