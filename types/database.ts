/**
 * Tipe skema Supabase `public`.
 *
 * Ditulis tangan dari hasil dump katalog database (schema-dump.json, 2026-10-08)
 * mengikuti format `supabase gen types`. Jika skema berubah, perbarui file ini
 * (atau ganti dengan hasil `npx supabase gen types typescript`).
 *
 * Catatan: kolom `numeric` dikirim PostgREST sebagai number di JSON.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          default_expiry_days: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          default_expiry_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          default_expiry_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          sku: string;
          name: string;
          unit: string;
          purchase_price: number;
          selling_price: number;
          minimum_stock: number;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          sku: string;
          name: string;
          unit?: string;
          purchase_price?: number;
          selling_price?: number;
          minimum_stock?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          sku?: string;
          name?: string;
          unit?: string;
          purchase_price?: number;
          selling_price?: number;
          minimum_stock?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_batches: {
        Row: {
          id: string;
          product_id: string;
          batch_number: string;
          incoming_date: string;
          initial_quantity: number;
          remaining_quantity: number;
          expiry_date: string | null;
          purchase_price: number;
          status: Database["public"]["Enums"]["stock_batch_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          batch_number: string;
          incoming_date?: string;
          initial_quantity: number;
          remaining_quantity: number;
          expiry_date?: string | null;
          purchase_price?: number;
          status?: Database["public"]["Enums"]["stock_batch_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          batch_number?: string;
          incoming_date?: string;
          initial_quantity?: number;
          remaining_quantity?: number;
          expiry_date?: string | null;
          purchase_price?: number;
          status?: Database["public"]["Enums"]["stock_batch_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_batches_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          batch_id: string | null;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          quantity: number;
          reference_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          batch_id?: string | null;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          quantity: number;
          reference_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          batch_id?: string | null;
          movement_type?: Database["public"]["Enums"]["stock_movement_type"];
          quantity?: number;
          reference_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "stock_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          transaction_number: string;
          transaction_date: string;
          subtotal: number;
          total: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          paid_amount: number;
          change_amount: number;
          status: Database["public"]["Enums"]["transaction_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_number: string;
          transaction_date?: string;
          subtotal?: number;
          total?: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          paid_amount?: number;
          change_amount?: number;
          status?: Database["public"]["Enums"]["transaction_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_number?: string;
          transaction_date?: string;
          subtotal?: number;
          total?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          paid_amount?: number;
          change_amount?: number;
          status?: Database["public"]["Enums"]["transaction_status"];
          created_at?: string;
        };
        Relationships: [];
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_batch_allocations: {
        Row: {
          id: string;
          transaction_item_id: string;
          batch_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_item_id: string;
          batch_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_item_id?: string;
          batch_id?: string;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_batch_allocations_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "stock_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_batch_allocations_transaction_item_id_fkey";
            columns: ["transaction_item_id"];
            isOneToOne: false;
            referencedRelation: "transaction_items";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          message: string;
          product_id: string | null;
          batch_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          message: string;
          product_id?: string | null;
          batch_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          title?: string;
          message?: string;
          product_id?: string | null;
          batch_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "stock_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // Ada di database, tetapi SENGAJA tidak dipakai aplikasi karena memakai
      // CURRENT_DATE (UTC). Aplikasi memakai tanggal bisnis WIB.
      get_product_available_stock: {
        Args: { p_product_id: string };
        Returns: number;
      };
      get_product_physical_stock: {
        Args: { p_product_id: string };
        Returns: number;
      };
      refresh_expired_batches: {
        Args: Record<string, never>;
        Returns: number;
      };
      // Checkout atomik Phase 3.2 (SECURITY INVOKER, tanggal bisnis WIB).
      checkout_transaction: {
        Args: {
          p_transaction_id: string;
          p_items: Json;
          p_payment_method: string;
          p_paid_amount: number | null;
          p_expected_total: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      notification_type: "EXPIRED" | "NEAR_EXPIRY" | "LOW_STOCK";
      payment_method: "CASH" | "QRIS" | "DEBIT";
      stock_batch_status: "ACTIVE" | "DEPLETED" | "EXPIRED";
      stock_movement_type:
        | "IN"
        | "SALE"
        | "ADJUSTMENT_IN"
        | "ADJUSTMENT_OUT"
        | "DAMAGE"
        | "EXPIRED";
      transaction_status: "COMPLETED" | "CANCELLED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
