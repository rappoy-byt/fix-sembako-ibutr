/**
 * Tipe domain aplikasi, diturunkan dari skema database aktual (types/database.ts).
 */
import type { Enums, Tables } from "./database";

export type NotificationType = Enums<"notification_type">;
export type PaymentMethod = Enums<"payment_method">;
export type StockBatchStatus = Enums<"stock_batch_status">;
export type StockMovementType = Enums<"stock_movement_type">;

export type Category = Tables<"categories">;
export type Product = Tables<"products">;
export type StockBatch = Tables<"stock_batches">;
export type StockMovement = Tables<"stock_movements">;
export type NotificationRow = Tables<"notifications">;

/** Notifikasi siap tampil (baris `notifications` + nama produk). */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  productId: string | null;
  productName: string;
  batchId: string | null;
  createdAt: string;
  isRead: boolean;
}

/** Hasil query yang bisa gagal; error berupa pesan siap tampil. */
export type QueryResult<T> = { data: T; error: null } | { data: null; error: string };
