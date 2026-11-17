-- =============================================================================
-- Data contoh untuk pameran: ±90 barang sembako lengkap dengan batch stok.
--
-- Cara pakai: Supabase Dashboard → SQL Editor → tempel seluruh isi file → Run.
--
-- Aman dijalankan ulang:
--   * kategori yang namanya sudah ada tidak ditimpa;
--   * barang yang SKU-nya sudah ada dilewati (beserta batch-nya);
--   * data lama tidak diubah sama sekali.
--
-- Tanggal masuk & kedaluwarsa dihitung relatif terhadap hari ini, sehingga
-- skenario demo (stok menipis, hampir expired, sudah expired, habis) tetap
-- terlihat kapan pun script dijalankan. Status batch expired dan notifikasi
-- dibuat otomatis oleh aplikasi saat halaman dibuka (sinkronisasi notifikasi).
-- =============================================================================

BEGIN;

-- 1. Kategori ----------------------------------------------------------------
INSERT INTO categories (name, default_expiry_days) VALUES
  ('Beras & Tepung',       365),
  ('Minyak & Mentega',     365),
  ('Gula, Garam & Bumbu',  540),
  ('Mi Instan',            240),
  ('Telur & Susu',         180),
  ('Minuman',              365),
  ('Makanan Ringan',       180),
  ('Perlengkapan Mandi',   730),
  ('Kebersihan Rumah',     730),
  ('Kebutuhan Lain',       NULL)
ON CONFLICT (name) DO NOTHING;

-- 2. Daftar barang -----------------------------------------------------------
-- q1/e1 = batch lama (masuk 20 hari lalu), q2/e2 = batch baru (masuk 4 hari lalu).
-- e = kedaluwarsa dalam N hari dari hari ini (negatif = sudah lewat, NULL = tanpa expired).
-- q1 NULL = barang tanpa stok (demo "Stok habis").
CREATE TEMP TABLE seed_items (
  sku        text,
  name       text,
  category   text,
  unit       text,
  buy        numeric,
  sell       numeric,
  min_stock  integer,
  q1         integer,
  e1         integer,
  q2         integer,
  e2         integer
) ON COMMIT DROP;

INSERT INTO seed_items VALUES
  -- Beras & Tepung
  ('BRS-001', 'Beras Pandan Wangi 5 kg',             'Beras & Tepung', 'karung', 72000, 80000,  5,  20, 300,   10,  330),
  ('BRS-002', 'Beras Rojolele 5 kg',                 'Beras & Tepung', 'karung', 68000, 76000,  5,  15, 300, NULL, NULL),
  ('BRS-003', 'Beras Setra Ramos 5 kg',              'Beras & Tepung', 'karung', 70000, 78000,  5,   4, 280, NULL, NULL),
  ('BRS-004', 'Beras Curah Medium per kg',           'Beras & Tepung', 'kg',     13000, 14500, 20,  60, 200,   40,  240),
  ('TPG-001', 'Tepung Terigu Segitiga Biru 1 kg',    'Beras & Tepung', 'bks',    12500, 14000, 10,  30, 180, NULL, NULL),
  ('TPG-002', 'Tepung Terigu Cakra Kembar 1 kg',     'Beras & Tepung', 'bks',    13000, 15000,  6,  15, 200, NULL, NULL),
  ('TPG-003', 'Tepung Beras Rose Brand 500 g',       'Beras & Tepung', 'bks',     7500,  9000,  6,  10, -10, NULL, NULL),
  ('TPG-004', 'Tepung Tapioka Rose Brand 500 g',     'Beras & Tepung', 'bks',     6500,  8000,  6,  12, 210, NULL, NULL),

  -- Minyak & Mentega
  ('MYK-001', 'Minyak Goreng Bimoli 2 L',            'Minyak & Mentega', 'pouch', 38000, 42000,  6,   3, 240, NULL, NULL),
  ('MYK-002', 'Minyak Goreng Sunco 2 L',             'Minyak & Mentega', 'pouch', 36000, 40000,  6,  12, 260,    8,  300),
  ('MYK-003', 'Minyak Goreng Filma 2 L',             'Minyak & Mentega', 'pouch', 37000, 41000,  6,  10, 250, NULL, NULL),
  ('MYK-004', 'Minyakita 1 L',                       'Minyak & Mentega', 'botol', 15700, 17000, 12,  36, 270, NULL, NULL),
  ('MYK-005', 'Minyak Goreng Sania 2 L',             'Minyak & Mentega', 'pouch', 36500, 40500,  6, NULL, NULL, NULL, NULL),
  ('MTG-001', 'Blue Band Serbaguna 200 g',           'Minyak & Mentega', 'pcs',    9500, 11000,  6,  18, 150, NULL, NULL),
  ('MTG-002', 'Margarin Palmia 200 g',               'Minyak & Mentega', 'pcs',    7000,  8500,  6,  12, 160, NULL, NULL),

  -- Gula, Garam & Bumbu
  ('GUL-001', 'Gulaku Premium 1 kg',                 'Gula, Garam & Bumbu', 'bks',     17500, 19500, 10,   4, 360, NULL, NULL),
  ('GUL-002', 'Gula Pasir Curah per kg',             'Gula, Garam & Bumbu', 'kg',      16500, 18500, 10,  25, 360, NULL, NULL),
  ('GRM-001', 'Garam Refina 250 g',                  'Gula, Garam & Bumbu', 'bks',      3500,  4500, 10,  30, 700, NULL, NULL),
  ('BMB-001', 'Royco Kaldu Ayam 9 g',                'Gula, Garam & Bumbu', 'sachet',    800,  1000, 50, 200, 400, NULL, NULL),
  ('BMB-002', 'Masako Rasa Sapi 9 g',                'Gula, Garam & Bumbu', 'sachet',    800,  1000, 50, 200, 380, NULL, NULL),
  ('BMB-003', 'Ladaku Merica Bubuk 4 g',             'Gula, Garam & Bumbu', 'sachet',    800,  1000, 30, 100, 500, NULL, NULL),
  ('BMB-004', 'Kecap Manis Bango 220 ml',            'Gula, Garam & Bumbu', 'pouch',   10500, 12000,  6,  20, 300, NULL, NULL),
  ('BMB-005', 'Kecap Manis ABC 135 ml',              'Gula, Garam & Bumbu', 'pouch',    6500,  7500,  6,  15, 280, NULL, NULL),
  ('BMB-006', 'Saus Sambal ABC 335 ml',              'Gula, Garam & Bumbu', 'botol',   11000, 13000,  4,  10, 220, NULL, NULL),
  ('BMB-007', 'Bumbu Racik Nasi Goreng Indofood',    'Gula, Garam & Bumbu', 'sachet',   2500,  3000, 20,  40,  25, NULL, NULL),
  ('BMB-008', 'Sasa MSG 250 g',                      'Gula, Garam & Bumbu', 'bks',     11500, 13500,  5,  12, 600, NULL, NULL),
  ('BMB-009', 'Santan Kara 65 ml',                   'Gula, Garam & Bumbu', 'pcs',      3300,  4000, 12,  36,  18,   24,  200),

  -- Mi Instan
  ('MIE-001', 'Indomie Goreng',                      'Mi Instan', 'bks',   3000,   3500, 40, 120, 200,   80,  230),
  ('MIE-002', 'Indomie Soto',                        'Mi Instan', 'bks',   2900,   3500, 30,  80, 210, NULL, NULL),
  ('MIE-003', 'Indomie Ayam Bawang',                 'Mi Instan', 'bks',   2900,   3500, 30,  60, 210, NULL, NULL),
  ('MIE-004', 'Indomie Goreng Rendang',              'Mi Instan', 'bks',   3200,   4000, 20,  40, 200, NULL, NULL),
  ('MIE-005', 'Mie Sedaap Goreng',                   'Mi Instan', 'bks',   2900,   3500, 30,  70, 190, NULL, NULL),
  ('MIE-006', 'Mie Sedaap Kari Spesial',             'Mi Instan', 'bks',   2900,   3500, 20,  15, 190, NULL, NULL),
  ('MIE-007', 'Supermi Ayam Bawang',                 'Mi Instan', 'bks',   2600,   3000, 20,  40, 180, NULL, NULL),
  ('MIE-008', 'Pop Mie Rasa Ayam',                   'Mi Instan', 'cup',   4500,   5500, 12,  24, 160, NULL, NULL),
  ('MIE-009', 'Sarimi Isi 2 Ayam Kecap',             'Mi Instan', 'bks',   3500,   4500, 15,  30, 170, NULL, NULL),
  ('MIE-010', 'Indomie Goreng 1 Dus (40 bks)',       'Mi Instan', 'dus', 115000, 125000,  2,   6, 220, NULL, NULL),

  -- Telur & Susu
  ('TLR-001', 'Telur Ayam Ras per kg',               'Telur & Susu', 'kg',     27000, 30000, 10,  25,  10,   20,   21),
  ('TLR-002', 'Telur Ayam Ras per butir',            'Telur & Susu', 'butir',   1800,  2000, 30,  90,  12, NULL, NULL),
  ('SUS-001', 'SKM Frisian Flag Putih 370 g',        'Telur & Susu', 'kaleng', 12000, 13500,  6,  18, 270, NULL, NULL),
  ('SUS-002', 'SKM Indomilk Cokelat Sachet 40 g',    'Telur & Susu', 'sachet',  1500,  2000, 30,  80, 200, NULL, NULL),
  ('SUS-003', 'Ultra Milk Cokelat 200 ml',           'Telur & Susu', 'kotak',   5000,  6000, 24,  30,  12,   24,  120),
  ('SUS-004', 'Indomilk UHT Plain 190 ml',           'Telur & Susu', 'kotak',   4500,  5500, 24,  12,  -3,   36,  110),
  ('SUS-005', 'Dancow Fortigro Instant 400 g',       'Telur & Susu', 'pcs',    48000, 53000,  3,   6, 330, NULL, NULL),
  ('SUS-006', 'Bear Brand 189 ml',                   'Telur & Susu', 'kaleng',  9500, 11000, 12,  24, 400, NULL, NULL),

  -- Minuman
  ('MNM-001', 'Aqua Air Mineral 600 ml',             'Minuman', 'botol',  3000,  4000, 24, 48, 360, NULL, NULL),
  ('MNM-002', 'Le Minerale 600 ml',                  'Minuman', 'botol',  2800,  3500, 24, 48, 360, NULL, NULL),
  ('MNM-003', 'Aqua Galon Isi Ulang 19 L',           'Minuman', 'galon', 19000, 22000,  3,  8,  90, NULL, NULL),
  ('MNM-004', 'Teh Pucuk Harum 350 ml',              'Minuman', 'botol',  3200,  4000, 24, 36, 240, NULL, NULL),
  ('MNM-005', 'Teh Celup Sariwangi isi 25',          'Minuman', 'kotak',  6500,  8000,  6, 15, 500, NULL, NULL),
  ('MNM-006', 'Kopi Kapal Api Special Mix',          'Minuman', 'sachet', 1200,  1500, 40, 120, 300, NULL, NULL),
  ('MNM-007', 'Kopi Good Day Cappuccino',            'Minuman', 'sachet', 1800,  2500, 30, 60, 280, NULL, NULL),
  ('MNM-008', 'Kopi Kapal Api Bubuk 165 g',          'Minuman', 'bks',   13500, 15500,  6,  4, 360, NULL, NULL),
  ('MNM-009', 'Nutrisari Jeruk Peras',               'Minuman', 'sachet', 1500,  2000, 30, 50, 250, NULL, NULL),
  ('MNM-010', 'Coca-Cola 390 ml',                    'Minuman', 'botol',  4500,  6000, 12, 24, 200, NULL, NULL),
  ('MNM-011', 'Teh Botol Sosro Kotak 250 ml',        'Minuman', 'kotak',  3200,  4000, 24, 36,  22, NULL, NULL),
  ('MNM-012', 'Milo Activ-Go Sachet 22 g',           'Minuman', 'sachet', 1800,  2500, 30, 60, 300, NULL, NULL),

  -- Makanan Ringan
  ('SNK-001', 'Chitato Sapi Panggang 68 g',          'Makanan Ringan', 'bks',  9500, 11000,  6,  6,  -5,   12,  120),
  ('SNK-002', 'Taro Net Seaweed 65 g',               'Makanan Ringan', 'bks',  7000,  8500,  6, 15, 140, NULL, NULL),
  ('SNK-003', 'Biskuit Roma Kelapa 300 g',           'Makanan Ringan', 'bks',  9000, 10500,  6, 12,  20, NULL, NULL),
  ('SNK-004', 'Good Time Chocochips 72 g',           'Makanan Ringan', 'bks',  8000,  9500,  6, 15, 150, NULL, NULL),
  ('SNK-005', 'Beng-Beng 20 g',                      'Makanan Ringan', 'pcs',  2000,  2500, 24, 48, 160, NULL, NULL),
  ('SNK-006', 'Oreo Vanila 119 g',                   'Makanan Ringan', 'bks',  8500, 10000,  6, 18, 200, NULL, NULL),
  ('SNK-007', 'Qtela Keripik Tempe 55 g',            'Makanan Ringan', 'bks',  5500,  7000,  6,  4, 120, NULL, NULL),
  ('SNK-008', 'Kacang Garuda Rosta 100 g',           'Makanan Ringan', 'bks',  9500, 11000,  6, 10, 180, NULL, NULL),
  ('SNK-009', 'Sari Roti Tawar Kupas',               'Makanan Ringan', 'bks', 16500, 18500,  3,  6,   3, NULL, NULL),
  ('SNK-010', 'Tango Wafer Cokelat 130 g',           'Makanan Ringan', 'bks',  8500, 10000,  6, 12, 240, NULL, NULL),

  -- Perlengkapan Mandi
  ('MND-001', 'Sabun Batang Lifebuoy 75 g',          'Perlengkapan Mandi', 'pcs',     3800,  4500, 12,  36, 700, NULL, NULL),
  ('MND-002', 'Sabun Cair Lifebuoy Refill 400 ml',   'Perlengkapan Mandi', 'pouch',  19000, 22000,  4,  10, 700, NULL, NULL),
  ('MND-003', 'Pasta Gigi Pepsodent 190 g',          'Perlengkapan Mandi', 'pcs',    12500, 14500,  6,  18, 700, NULL, NULL),
  ('MND-004', 'Sikat Gigi Formula',                  'Perlengkapan Mandi', 'pcs',     4500,  6000,  6,  15, NULL, NULL, NULL),
  ('MND-005', 'Shampo Sunsilk Hitam Sachet 10 ml',   'Perlengkapan Mandi', 'sachet',   800,  1000, 48, 120, 600, NULL, NULL),
  ('MND-006', 'Shampo Clear Men 160 ml',             'Perlengkapan Mandi', 'botol',  24000, 27000,  3,   6, 700, NULL, NULL),
  ('MND-007', 'Biore Body Foam Refill 450 ml',       'Perlengkapan Mandi', 'pouch',  21000, 24000,  3,   2, 700, NULL, NULL),
  ('MND-008', 'Pembalut Charm Extra Maxi 8 pcs',     'Perlengkapan Mandi', 'bks',     9500, 11000,  6,  12, NULL, NULL, NULL),

  -- Kebersihan Rumah
  ('KBR-001', 'Deterjen Rinso Anti Noda 770 g',      'Kebersihan Rumah', 'bks',    21000, 24000,  6, 15, 700, NULL, NULL),
  ('KBR-002', 'Deterjen Daia 850 g',                 'Kebersihan Rumah', 'bks',    17000, 19500,  6, 12, 700, NULL, NULL),
  ('KBR-003', 'Sunlight Jeruk Nipis Refill 755 ml',  'Kebersihan Rumah', 'pouch',  15500, 17500,  6, 20, 700, NULL, NULL),
  ('KBR-004', 'So Klin Pewangi Refill 900 ml',       'Kebersihan Rumah', 'pouch',  12000, 14000,  6, 10, 700, NULL, NULL),
  ('KBR-005', 'Wipol Karbol Cemara 780 ml',          'Kebersihan Rumah', 'pouch',  13500, 15500,  4,  8, 700, NULL, NULL),
  ('KBR-006', 'Baygon Aerosol 600 ml',               'Kebersihan Rumah', 'kaleng', 38000, 42000,  2,  4, 700, NULL, NULL),
  ('KBR-007', 'Bayclin Reguler 500 ml',              'Kebersihan Rumah', 'botol',   8500, 10000,  4, 10, 700, NULL, NULL),
  ('KBR-008', 'Obat Nyamuk Bakar Baygon isi 10',     'Kebersihan Rumah', 'kotak',   6000,  7500,  6, 20, 700, NULL, NULL),

  -- Kebutuhan Lain
  ('LNL-001', 'Gas Elpiji 3 kg (Isi Ulang)',         'Kebutuhan Lain', 'tabung', 19000, 22000,  5,  2, NULL, NULL, NULL),
  ('LNL-002', 'Korek Api Tokai',                     'Kebutuhan Lain', 'pcs',     2000,  3000, 12, 30, NULL, NULL, NULL),
  ('LNL-003', 'Baterai ABC AA isi 2',                'Kebutuhan Lain', 'pak',     6000,  7500,  6, 12, NULL, NULL, NULL),
  ('LNL-004', 'Tisu Paseo 250 Sheet',                'Kebutuhan Lain', 'bks',    13000, 15000,  4, 10, NULL, NULL, NULL),
  ('LNL-005', 'Kantong Plastik Kresek Sedang',       'Kebutuhan Lain', 'pak',     9000, 11000,  4, 15, NULL, NULL, NULL),
  ('LNL-006', 'Lilin Batang isi 10',                 'Kebutuhan Lain', 'pak',     7000,  8500,  2,  6, NULL, NULL, NULL);

-- 3. Barang + batch + riwayat stok -------------------------------------------
-- Hanya barang yang benar-benar baru dimasukkan yang mendapat batch & riwayat,
-- sehingga menjalankan ulang script tidak menggandakan stok.
WITH new_products AS (
  INSERT INTO products (category_id, sku, name, unit, purchase_price, selling_price, minimum_stock)
  SELECT c.id, s.sku, s.name, s.unit, s.buy, s.sell, s.min_stock
  FROM seed_items s
  JOIN categories c ON c.name = s.category
  ON CONFLICT (sku) DO NOTHING
  RETURNING id, sku
),
batch_rows AS (
  SELECT np.id AS product_id, 'PMR-' || s.sku || '-A' AS batch_number,
         CURRENT_DATE - 20 AS incoming_date, s.q1 AS qty, CURRENT_DATE + s.e1 AS expiry_date, s.buy
  FROM new_products np JOIN seed_items s USING (sku)
  WHERE s.q1 IS NOT NULL
  UNION ALL
  SELECT np.id, 'PMR-' || s.sku || '-B',
         CURRENT_DATE - 4, s.q2, CURRENT_DATE + s.e2, s.buy
  FROM new_products np JOIN seed_items s USING (sku)
  WHERE s.q2 IS NOT NULL
),
new_batches AS (
  INSERT INTO stock_batches
    (product_id, batch_number, incoming_date, initial_quantity, remaining_quantity, expiry_date, purchase_price)
  SELECT product_id, batch_number, incoming_date, qty, qty, expiry_date, buy
  FROM batch_rows
  RETURNING id, product_id, batch_number, initial_quantity
)
INSERT INTO stock_movements (product_id, batch_id, movement_type, quantity, note)
SELECT product_id, id, 'IN', initial_quantity, 'Barang masuk, batch ' || batch_number
FROM new_batches;

COMMIT;

-- 4. Ringkasan ---------------------------------------------------------------
SELECT
  (SELECT count(*) FROM products WHERE sku LIKE ANY (ARRAY['BRS-%','TPG-%','MYK-%','MTG-%','GUL-%','GRM-%','BMB-%','MIE-%','TLR-%','SUS-%','MNM-%','SNK-%','MND-%','KBR-%','LNL-%'])) AS barang_pameran,
  (SELECT count(*) FROM stock_batches WHERE batch_number LIKE 'PMR-%') AS batch_pameran,
  (SELECT count(*) FROM products) AS total_barang;
