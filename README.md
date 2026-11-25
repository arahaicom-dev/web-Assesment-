# Asesmen Merdeka 🎓

Aplikasi web untuk mengelola **semua jenis asesmen sekolah sesuai Kurikulum Merdeka**: input nilai, ujian online dari soal PDF, sampai **nilai rapor yang dihitung otomatis**. Tampilannya 3D dan warnanya bisa diganti.

## Fitur

| Menu | Istilah lama | Keterangan |
|---|---|---|
| Asesmen Diagnostik (AD) | Pretest / Tes Awal | Kognitif (nilai, dipetakan ke Paham Utuh / Sebagian / Belum Paham) atau non-kognitif (kategori, mis. gaya belajar). Tidak masuk rapor. |
| Asesmen Formatif (AF) | Kuis / Latihan | Nilai + catatan umpan balik. Bisa dihitung ke rapor atau tidak (diatur di Pengaturan). |
| Sumatif Lingkup Materi (SLM) | Ulangan Harian / PH | Bisa banyak per semester, ditandai Tujuan Pembelajaran (TP). |
| Sumatif Tengah Semester (STS) | UTS / PTS | |
| Sumatif Akhir Semester (SAS) | UAS / PAS | Untuk semester ganjil. |
| Sumatif Akhir Tahun (SAT) | PAT / UKK | Untuk semester genap. |
| **Rekap Nilai Rapor (Total)** | | Semua komponen dalam satu tabel: nilai akhir, predikat, ketercapaian KKTP, peringkat, dan deskripsi capaian otomatis. Ada tab Rapor Tengah Semester dan Akhir Semester. |
| Leger Semua Mapel | | Nilai akhir semua mapel per murid, beserta jumlah, rata-rata, dan peringkat. |
| Bank Soal & Unggah PDF | | Soal di PDF diubah otomatis ke format web, lalu bisa dikerjakan murid secara online dan dinilai otomatis. |

### Penghitungan nilai (bisa diubah di Pengaturan)
- **Nilai Akhir Semester** = 50% rata-rata SLM + 25% STS + 25% SAS/SAT (Formatif bisa ikut dihitung kalau diaktifkan)
- **Nilai Tengah Semester** = 50% rata-rata SLM + 50% STS
- Kalau ada komponen yang belum diisi, bobotnya dibagi ulang ke komponen yang ada, dan nilainya ditandai **⚠ sementara**.
- Ketuntasan memakai **KKTP** (bawaan 75). Di bawah KKTP → *Remedial*, nilai ≥ 90 → *Pengayaan*.
- Nilai remedial dibatasi paling tinggi sama dengan KKTP (bisa dimatikan).
- Predikat A/B/C/D dan batas nilainya bisa diubah.
- **Deskripsi capaian** disusun dari nilai per TP, misalnya: *"Ananda Budi menunjukkan penguasaan yang baik dalam … Perlu bimbingan dalam …"*

### Unggah soal PDF, format apa pun
Pengenal soal menerima berbagai gaya penulisan:
- Penomoran `1.` `1)` `(1)` `No. 1` `Soal 1:`
- Pilihan `A.` `a)` `(A)`, satu per baris maupun sebaris (`A. 3  B. 4  C. 5`)
- Bagian `I. PILIHAN GANDA`, `II. ISIAN`, `III. URAIAN`, `Benar atau Salah`
- Kunci jawaban: `Jawaban: B`, `Kunci: C`, pilihan bertanda `*`, atau bagian **KUNCI JAWABAN** di akhir (juga per bagian `I. 1. b 2. c …`)
- Skor per soal: `(skor 10)`, `[5 poin]`
- PDF dua kolom, kop sekolah, nomor halaman, serta sub-pernyataan `1) 2) 3)` di dalam soal
- PDF hasil scan dibaca dengan OCR (Tesseract.js, perlu internet)

Setelah diunggah, hasilnya tampil di editor **berdampingan dengan halaman PDF aslinya**. Jenis soal, kunci, poin, dan gambar bisa diperiksa dan diubah sebelum disimpan.

Penilaian otomatis: pilihan ganda dan benar/salah dicocokkan langsung. Isian singkat tidak membedakan huruf besar/kecil, menerima beberapa jawaban (`Jakarta / Nusantara`), dan memaafkan salah ketik ringan. Untuk uraian, aplikasi memberi saran skor dari kata kunci, lalu guru mengoreksinya.

### Tampilan
- Kartu 3D yang miring mengikuti kursor, tombol timbul, kubus berputar, grafik batang 3D, dan latar dengan bentuk 3D yang melayang
- 8 pilihan warna siap pakai, warna bebas lewat penggeser, mode terang/gelap, pengatur kedalaman efek 3D, dan opsi mematikan animasi
- Semua warna diturunkan dari satu warna dasar, jadi tetap serasi dan nyaman dilihat
- Responsif (HP/tablet), dan tabel bisa dicetak atau diekspor ke Excel/CSV

## Fitur versi server (Node.js + MySQL)
- **Login guru**. Akun pertama otomatis menjadi admin, dan admin bisa menambah akun guru lain. Semua guru memakai data sekolah yang sama.
- **Data tersimpan di MySQL** dan bisa dibuka dari laptop, HP, atau komputer sekolah mana pun. Setiap perubahan tersimpan otomatis (indikator *Tersimpan di server* ada di pojok kiri bawah).
- **Ujian online dari HP murid masing-masing**: guru menekan *Buka Ujian* dan mendapat **token** 6 huruf. Murid membuka `/ujian.html`, memasukkan token, memilih nama, dan mengisi NIS.
  - Nilai dihitung di server (kunci jawaban tidak pernah dikirim ke HP murid) dan langsung masuk ke daftar nilai guru.
  - Ada pilihan timer, acak urutan soal per murid, dan sembunyikan nilai dari murid.
  - Murid tidak bisa mengumpulkan dua kali. Jawaban tersimpan sementara di HP murid kalau halamannya tertutup.
- Kalau aplikasi dibuka tanpa server (hosting statis biasa), aplikasi tetap jalan dalam **mode lokal** seperti sebelumnya, dengan data tersimpan di browser.

## Mode SaaS (versi PHP): banyak sekolah berlangganan

Versi PHP berjalan sebagai layanan berlangganan:
- **Halaman utama** (`index.html`) berisi fitur, harga (diambil dari server), FAQ, serta tombol *Coba Gratis* dan *Masuk*. Aplikasi guru ada di `app.html`.
- **Akun pertama** yang dibuat saat pemasangan adalah **pemilik platform**. Sekolahnya sendiri tanpa batas waktu, dan menu **👑 Panel Pemilik** tersedia untuk:
  - melihat semua sekolah (kontak, jumlah guru/murid/asesmen, status, pendapatan),
  - memperpanjang, mengatur tanggal berakhir, menonaktifkan sekolah, atau mengatur ulang password admin sekolah,
  - memverifikasi **bukti transfer** (Setujui/Tolak). Masa aktif sekolah bertambah otomatis saat pembayaran disetujui,
  - mengatur **harga paket**, lama masa coba, info rekening, WhatsApp, dan email.
- **Sekolah lain mendaftar sendiri** lewat *Daftar Sekolah* dan langsung mendapat masa coba gratis (bawaan 14 hari). Data setiap sekolah terpisah.
- Menu **💳 Langganan** di akun sekolah: pilih paket, transfer sesuai nominal (harga + kode unik), lalu unggah foto bukti transfer.
- Kalau masa aktif habis, aplikasi sekolah terkunci (data tetap aman) dan token ujian sekolah itu tidak bisa dipakai sampai diperpanjang.
- Memperbarui dari versi PHP 3.x tidak menghapus data. Data lama otomatis menjadi milik sekolah pemilik platform.

## Pasang di hosting biasa (PHP + MySQL) — paling mudah, tanpa Node.js

Cara ini cocok untuk hosting cPanel pada umumnya. Tidak perlu Setup Node.js App dan tidak mengganggu situs lain di `public_html`. Butuh PHP 7.2+ (dengan PDO MySQL) dan MySQL/MariaDB.

1. **cPanel → MySQL® Databases**: buat database dan user, lalu tambahkan user ke database dengan **ALL PRIVILEGES**. Catat nama lengkapnya (biasanya diawali nama akun, mis. `akunanda_asesmen`).
2. **File Manager → `public_html`**: unggah `asesmen-merdeka-php.zip`, lalu **Extract**. Akan terbentuk folder `public_html/asesmen`.
3. Buka `https://domainanda.com/asesmen/app.html`. Isi formulir **pengaturan database**, lalu buat **akun pemilik**. Halaman utama untuk calon pelanggan ada di `https://domainanda.com/asesmen/`.

Catatan:
- Pengaturan database disimpan di `asesmen/api/config.php`, dan file ini tidak bisa dibuka dari browser. Untuk mengisi ulang, hapus file itu lalu buka aplikasinya lagi.
- Folder bisa diberi nama lain, atau isinya diletakkan langsung di `public_html` kalau ingin dipakai di domain utama.
- Untuk memperbarui aplikasi, extract versi baru ke folder yang sama dan timpa file lama. Data tetap aman di database.

## Pasang di hosting (cPanel dengan Node.js & MySQL)

**Kebutuhan:** Node.js 14 atau lebih baru (disarankan 18+) dan MySQL 5.7+ atau MariaDB 10.3+.

### 1. Buat database
Di cPanel buka **MySQL® Databases**:
1. Buat database, misalnya `namaakun_asesmen`.
2. Buat user database beserta password-nya.
3. Tambahkan user tersebut ke database dengan hak **ALL PRIVILEGES**.

Tabel akan dibuat otomatis saat aplikasi pertama kali jalan. Kalau gagal, impor `schema.sql` lewat **phpMyAdmin**.

### 2. Unggah file aplikasi
Unggah seluruh isi repositori **kecuali** `node_modules/` ke folder di luar `public_html`, misalnya `/home/namaakun/asesmen`. Bisa lewat File Manager (unggah zip lalu *Extract*) atau `git clone` dari Terminal.

### 3. Buat file `.env`
Salin `.env.example` menjadi `.env` di folder yang sama, lalu isi:
```
DB_HOST=localhost
DB_USER=namaakun_userdb
DB_PASSWORD=password_database
DB_NAME=namaakun_asesmen
```

### 4. Setup Node.js App
Di cPanel buka **Setup Node.js App** → **Create Application**:

| Isian | Nilai |
|---|---|
| Node.js version | versi terbaru yang tersedia (≥ 18 disarankan) |
| Application mode | Production |
| Application root | `asesmen` (folder dari langkah 2) |
| Application URL | domain atau subdomain, misalnya `asesmen.sekolahanda.sch.id` |
| Application startup file | `server.js` |

Klik **Create**, lalu **Run NPM Install**, kemudian **Restart**.

> Sebaiknya pakai **subdomain sendiri** (misalnya `asesmen.domain.sch.id`), bukan sub-folder, supaya alamat `/api` tidak bentrok.

### 5. Mulai pakai
1. Buka alamat aplikasi. Muncul layar **Pemasangan pertama** untuk membuat akun admin (nama sekolah, nama Anda, username, password).
2. Isi data kelas/murid/mapel, atau klik **Muat Data Contoh** untuk mencoba.
3. Kalau sebelumnya memakai versi lokal, buka *Pengaturan → Data*. Ekspor cadangan dari browser lama, lalu **Pulihkan dari Cadangan** di versi server.
4. Untuk ujian: buat asesmen yang terhubung ke paket soal, tekan **▶ Buka Ujian**, lalu bagikan token atau tautannya ke murid.

### Di VPS (tanpa cPanel)
Jalankan perintah-perintah ini:
```bash
git clone <repo> asesmen
```
```bash
cd asesmen
```
```bash
npm install --omit=dev
```
```bash
cp .env.example .env
```
Isi `.env` dengan data database, lalu jalankan aplikasi dengan pm2:
```bash
npx pm2 start server.js --name asesmen
```
Setelah itu pasang reverse proxy Nginx ke `http://127.0.0.1:3000` dan aktifkan HTTPS (misalnya dengan certbot).

## Menjalankan di komputer sendiri
Perintahnya:
```bash
npm install
```
```bash
cp .env.example .env
```
Isi `.env`, lalu:
```bash
npm start
```
Buka `http://localhost:3000`.

Tanpa database, folder `public/` juga bisa dibuka sebagai situs statis (mode lokal):
```bash
cd public && python3 -m http.server 8000
```

## Struktur

```
public/api/index.php API versi PHP (hosting biasa, tanpa Node.js)
server.js            server Express (API + file statis dari public/)
server/db.js         koneksi MySQL & pembuatan tabel otomatis
server/api.js        login, akun guru, sinkronisasi data, ujian murid
schema.sql           struktur tabel (opsional, untuk phpMyAdmin)
.env.example         contoh konfigurasi database
public/index.html    halaman utama (landing page)
public/app.html      aplikasi guru
public/ujian.html    halaman ujian murid
public/css/style.css tema 3D & warna dinamis
public/js/calc.js    jenis asesmen, istilah, rumus nilai rapor, predikat, deskripsi
public/js/parser.js  konversi teks/PDF → soal, penilaian jawaban (dipakai juga oleh server)
public/js/store.js   penyimpanan data (lokal atau server) & data contoh
public/js/app.js     semua tampilan/menu guru
public/js/student.js halaman ujian murid
public/lib/pdfjs/    pdf.js (Apache-2.0) untuk membaca PDF
public/contoh-soal/  contoh file PDF soal untuk dicoba
tests/run-tests.js   pengujian parser & penghitungan (npm test)
```

## Keamanan
- Password guru disimpan dalam bentuk hash (scrypt), dan login dibatasi setelah banyak percobaan gagal.
- File `.env`, `server/`, dan `node_modules/` tidak bisa diakses dari browser. Hanya isi folder `public/` yang disajikan.
- Kunci jawaban tidak pernah dikirim ke perangkat murid.
- Isi **NIS** untuk setiap murid supaya murid tidak bisa masuk dengan nama temannya.
- Pakai HTTPS (di cPanel biasanya otomatis lewat AutoSSL).
