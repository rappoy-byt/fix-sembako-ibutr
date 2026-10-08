# Warung Sembako Ibu TR — Kasir & Inventaris

Aplikasi POS dan manajemen stok (FEFO) untuk satu pemilik toko.
Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · Supabase.

## Menjalankan

```bash
cp .env.example .env.local   # isi URL & publishable key Supabase
npm install
npm run dev                  # http://localhost:3000
```

### Akun pemilik

Tidak ada halaman registrasi. Buat satu akun di **Supabase Dashboard → Authentication → Users → Add user**
(email + password), lalu disarankan menonaktifkan **Allow new users to sign up**.

### Tipe database

`types/database.ts` ditulis dari dump katalog skema yang sebenarnya (format `supabase gen types`).
`types/domain.ts` menurunkan tipe domain dari sana. Jika skema berubah, perbarui keduanya.

### Tanggal bisnis

Database berjalan di UTC; tanggal bisnis toko adalah **Asia/Jakarta (WIB)**. Aplikasi tidak memakai
`CURRENT_DATE` database (termasuk `get_product_available_stock()` dan `refresh_expired_batches()`);
"hari ini" selalu dari `getStoreToday()` dan dikirim eksplisit ke query.

## Struktur

```
app/
  login/                 halaman masuk (publik)
  (app)/                 semua halaman terproteksi + layout shell
    dashboard/ kasir/ barang/ stok/ notifikasi/ ai-analytics/
components/
  ui/                    primitif shadcn/ui
  shared/                komponen desain bersama (StatusBadge, EmptyState, StatCard, …)
  layout/                sidebar, header, menu notifikasi & pemilik
features/
  auth/                  server actions login/logout, query sesi
  inventory/             aturan bisnis (FEFO, kedaluwarsa, stok menipis) + badge
  dashboard/ pos/ notifications/   data layer + komponen per modul
  analytics/             kontrak modul AI (belum diimplementasikan)
lib/
  supabase/              client browser, server, dan proxy (refresh sesi)
  format.ts status.ts constants.ts
types/                   tipe domain
proxy.ts                 proteksi rute (Next.js 16: pengganti middleware)
```

## Konvensi data

Semua halaman membaca data asli Supabase dengan sesi owner (RLS berlaku). Fungsi query
mengembalikan `QueryResult<T>` = `{ data, error }`; halaman menampilkan `ErrorState` bila gagal.
Tidak ada data contoh di aplikasi.

## Aturan bisnis (features/inventory/lib/business-rules.ts)

- **FEFO**: batch dengan tanggal kedaluwarsa paling awal dijual lebih dulu.
- **Stok tersedia**: batch `ACTIVE`, `remaining_quantity > 0`, dan `expiry_date` kosong atau `>= hari ini WIB`.
- **Kedaluwarsa**: `expiry_date < hari ini WIB` → tidak boleh dijual. Kedaluwarsa hari ini masih boleh dijual.
- **Sinkronisasi expired**: saat aplikasi dibuka, batch expired diubah ke `EXPIRED` dan dibuatkan satu
  notifikasi per batch (dijamin oleh constraint `UNIQUE (batch_id, type)`).
- **Hampir kedaluwarsa**: kedaluwarsa dalam ≤ 30 hari.
- **Stok menipis**: stok tersedia ≤ `minimum_stock`. **Habis**: stok tersedia = 0.
