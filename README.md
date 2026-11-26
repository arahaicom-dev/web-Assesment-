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

## Tampilan "Galaksi" (v5)
- **Halaman utama** bertema malam galaksi: latar gelap berbintang, judul tebal huruf besar, tombol pil, mockup laptop & HP, serta maskot orisinal **Kubi** (robot kubus) dan objek 3D melayang.
- **Aplikasi guru** memakai tata letak tiga kolom:
  - **rel ikon bulat** di kiri untuk berpindah bagian (Utama, Asesmen, Kuis Seru, Bank Soal, Nilai Akhir, Lainnya),
  - **daftar menu** dari bagian yang dipilih,
  - **panel pengguna** di bawah.
  Di HP, rel dan menu tampil sebagai panel geser lewat tombol ☰.
- Tema bawaan adalah **Galaksi** (gelap). Tema lain, mode terang, dan warna bebas tetap bisa dipilih di *Pengaturan & Tema*.
- Font yang dipakai **Unbounded** (judul) dan **Plus Jakarta Sans** (teks), keduanya berlisensi SIL Open Font License. File font disimpan lokal di `public/fonts/` beserta lisensinya.
- Semua ilustrasi dan maskot adalah buatan sendiri (SVG di `public/js/art.js`), bukan aset merek lain.

## Tampilan HP seperti aplikasi (PWA)
- **Bisa dipasang ke layar utama HP**: ikon Kubi, terbuka layar penuh tanpa bilah alamat, dan layar pembuka bertema galaksi.
  - Di Android, muncul ajakan **"Pasang aplikasi"**.
  - Di iPhone, ditampilkan petunjuk *Bagikan → Tambah ke Layar Utama*.
  - Ada dua aplikasi: **Asesmen** (guru, `app.html`) dan **Kuis Seru** (murid, `kuis.html`).
- Di HP, navigasi memakai **bilah tab bawah**: Beranda · Asesmen · Kuis · Soal · Lainnya. Tab *Asesmen* dan *Lainnya* membuka **lembar menu** dari bawah, yang bisa digeser ke bawah untuk menutup.
- Jendela isian tampil sebagai lembar dari bawah. Kolom isian berukuran 16px sehingga iPhone tidak zoom otomatis, dan area aman (notch) diperhitungkan.
- **Service worker** (`sw.js`) menyimpan kerangka aplikasi supaya tetap terbuka saat sinyal lemah. Data dari `/api/` tidak pernah disimpan di cache dan selalu diambil langsung dari server. Kalau tidak ada koneksi, tampil `offline.html`.
- PWA membutuhkan **HTTPS**. Di cPanel biasanya sudah otomatis lewat AutoSSL.

## Mode Siang & Malam
- **Tombol ☀️/🌙** ada di aplikasi guru (pojok kanan atas dan layar masuk), halaman utama, halaman Kuis Seru, dan halaman ujian murid.
- **Mode Siang**: langit biru dengan matahari dan awan, kartu putih, teks gelap. **Mode Malam**: galaksi berbintang.
- **🌗 Otomatis** di *Pengaturan & Tema* mengikuti pengaturan terang/gelap HP atau laptop.
- Pilihan diingat di perangkat (`localStorage`). Untuk guru, pilihan juga **tersimpan di akun**, jadi ikut terpakai saat login di perangkat lain. Akun yang belum pernah memilih memakai pilihan yang dibuat di layar masuk.
- Ada preset tema baru **Langit Siang**.

## Musik & suara (Kuis Seru / Mode Ujian)
- **9 musik latar orisinal** yang dibangkitkan langsung di browser (Web Audio, `public/js/music.js`). Tidak ada file musik dan tidak memakai lagu pihak lain.
  - **Cocok untuk ujian**: 🧘 Fokus Tenang · 🎧 Lo-fi Belajar · 🎹 Piano Pagi · 🌧️ Hujan Rintik · 🌿 Pagi di Hutan · 🪐 Luar Angkasa.
  - **Untuk permainan**: 🏆 Semangat Juara · 🕹️ Arkade Ceria · 🎸 Santai Ceria.
- **Musik otomatis menyala.** Di jendela pembuatan kuis/ujian ada sakelar **🎵 Musik latar di HP murid** yang bawaannya **NYALA**. Kalau tidak dimatikan, musik langsung berbunyi di HP murid begitu murid masuk. Bawaannya *Fokus Tenang* untuk ujian dan *Semangat Juara* untuk permainan, dan bisa dipilih dengan contoh suara.
- Sakelar **🔊 Putar juga di layar guru** (bawaannya nyala untuk permainan dan mati untuk ujian) langsung memutar musik di laptop/proyektor saat layar kuis terbuka.
- Pilihan terakhir guru diingat untuk kuis berikutnya.
- **Murid** bisa mengganti musik, mengatur volume, atau mematikannya lewat tombol **🎵** di HP-nya. Pilihan itu berlaku untuk kuis tersebut saja, dan kuis berikutnya kembali mengikuti pengaturan guru. Volume diingat. Efek suara benar/salah (mode permainan) juga bisa dimatikan.
- **Layar guru/proyektor**: tombol **🎵 Musik** memutar musik dari laptop guru, misalnya saat menunggu murid bergabung.
- Musik mulai setelah murid menekan tombol (aturan browser) dan berhenti otomatis saat kuis/ujian selesai.

## 17 jenis soal (v5.5)

📘 Panduan lengkap setiap jenis soal: menu **Panduan Jenis Soal** di aplikasi (dengan contoh yang bisa dicoba) atau [docs/PANDUAN-JENIS-SOAL.md](docs/PANDUAN-JENIS-SOAL.md).

Soal bisa diunggah dari PDF **atau dibuat langsung** di Bank Soal → **＋ Tambah Soal (17 jenis)**.

| Jenis | Cara murid menjawab (dioptimalkan untuk HP) | Penilaian | Kuis Permainan |
|---|---|---|---|
| Pilihan Ganda | ketuk satu pilihan | otomatis | ✓ |
| Pilihan Ganda Kompleks | ketuk semua yang benar | otomatis, nilai sebagian | ✓ |
| Benar / Salah | ketuk Benar/Salah | otomatis | ✓ |
| Isian Singkat | ketik jawaban (alternatif `a/b`, toleran salah ketik) | otomatis | ✓ |
| Jawaban Angka | ketik angka, bisa ada toleransi ± | otomatis | ✓ |
| Menjodohkan | ketuk kiri lalu pasangan kanan | otomatis, per pasangan | ✓ |
| Mengurutkan | susun dengan ▲ ▼ | otomatis, per posisi | ✓ |
| Mengelompokkan | ketuk item lalu ketuk kategorinya | otomatis, per item | ✓ |
| Seret ke Kalimat | ketuk kata lalu bagian kosong — tulis `[[jawaban]]` di soal | otomatis, per bagian | ✓ |
| Pilihan dalam Kalimat | pilih kata di kotak — tulis `[[benar\|salah\|salah]]` | otomatis, per kotak | ✓ |
| Titik pada Gambar | ketuk bagian gambar (guru menandai area benar) | otomatis | ✓ |
| Label Gambar | pilih label untuk tiap penanda bernomor | otomatis, per label | ✓ |
| Uraian | ketik jawaban panjang | saran skor + koreksi guru | – |
| Menggambar | gambar/tulis tangan di kanvas | koreksi guru | – |
| Rekam Suara | rekam jawaban lisan (maks. 30–120 detik) | koreksi guru | – |
| Polling / Survei | pilih salah satu | tidak dinilai | ✓ |
| Slide Materi | membaca materi | tidak dinilai | ✓ |

- Semua jenis dipakai di **Mode Ujian** (Kuis Seru), **ujian token** (ujian.html), dan **ujian di perangkat guru**.
- Dari PDF otomatis dikenali: pilihan ganda kompleks (kunci `A, C` atau tulisan "jawaban lebih dari satu") dan bagian **Jodohkan** (butir `1. Kiri   a. Kanan` digabung jadi satu soal menjodohkan).
- Penilaian dihitung **di server** (PHP & Node) dengan aturan yang sama seperti di browser, kunci tidak pernah dikirim ke HP murid, dan urutan pilihan/pasangan diacak per murid.
- Gambar & rekaman jawaban murid disimpan di tabel `media` (dibuat otomatis) dan hanya bisa dibuka guru sekolah tersebut di halaman Koreksi.

## Impor murid dari Excel, format apa pun (v5.7)

Menu **Kelas, Murid & Mapel** → **📥 Unggah Excel** (ke kelas yang dibuka) atau **📥 Impor Kelas & Murid dari Excel** (sekaligus membuat kelas). File juga bisa diseret ke halaman. **📋 Tempel Daftar** memakai pendeteksi yang sama.

- File: `.xlsx`, `.xls` (Excel lama), `.xlsm`, `.ods`, `.csv`, `.txt`.
- Otomatis mengenali: kop/judul di atas tabel, baris judul kolom di baris mana pun (termasuk judul 2 baris & sel gabungan), urutan kolom bebas, ekspor **Dapodik** (Nama, NIPD, NISN, JK, Rombel), judul kolom yang berulang, baris tanda tangan/"Mengetahui"/jumlah di bawah, kolom nama ayah/ibu/wali (tidak tertukar), NIS yang tersimpan sebagai angka (termasuk `1,23E+09`) dan nol di depan NISN. Tanpa judul kolom pun, kolom nama & NIS ditebak dari isinya.
- Murid bisa dimasukkan ke kelas yang dibuka, **dibagi per kolom Kelas/Rombel** (kelas yang belum ada dibuat otomatis, lengkap dengan fasenya), atau **satu kelas per sheet**.
- Pratinjau sebelum impor; kolom bisa diganti manual bila ada yang tertukar; NAMA KAPITAL bisa dirapikan; murid yang sudah ada dilewati (dan NIS yang masih kosong dilengkapi).
- Pembaca Excel: SheetJS Community 0.18.5 (Apache-2.0, `public/lib/xlsx/`), hanya dimuat saat mengunggah dan diproses di browser — file tidak dikirim ke server.

## Lupa password lewat email (v5.6, versi PHP)

- Di halaman masuk ada tautan **🔑 Lupa password?**. Pengguna menulis email/username, lalu menerima email berisi tombol **Buat Password Baru**. Tautannya berlaku **60 menit** dan hanya bisa dipakai **sekali**.
- Setelah password diganti, **email konfirmasi** dikirim dan semua perangkat lain otomatis dikeluarkan. Email konfirmasi juga dikirim bila password diganti dari menu Akun Guru.
- Email tujuan: kolom **Email** akun (diatur di **Akun Guru**, atau oleh admin sekolah lewat tombol ✉️ di daftar guru); bila kosong dan username berupa email, username yang dipakai. Akun tanpa email diminta menghubungi admin sekolah.
- Pengirim email diatur di **Panel Pemilik → Harga & Rekening → Pengiriman Email**. Tanpa SMTP, aplikasi memakai `mail()` bawaan hosting (sering masuk Spam). Disarankan: buat akun email `no-reply@domain-anda` di cPanel → Email Accounts, lalu isi host/port/username/password SMTP-nya, dan tekan **Kirim Email Uji**. Password SMTP disimpan di database dan tidak pernah dikirim ke browser.
- Keamanan: token acak 256-bit disimpan dalam bentuk hash, pembatasan permintaan per IP & per akun, dan pesan yang sama untuk akun yang tidak terdaftar.

## Soal bergambar
- Saat PDF diunggah, **gambar di dalam soal ikut diambil otomatis**. Gambar dipotong langsung dari halaman PDF dalam resolusi tinggi sehingga utuh dan tajam, lalu ditempel ke soal tempat gambar itu berada. Kop/logo sekolah di atas soal pertama dilewati.
- Soal yang **pilihan jawabannya berupa gambar** (baris hanya berisi `A. B. C. D.`) dikenali sebagai pilihan ganda, dan gambar pilihannya diambil sekaligus.
- Gambar yang tidak terambil otomatis (mis. grafik atau tabel yang digambar dengan garis) bisa dipotong manual dengan **✂️ Dari PDF**: seret di atas halaman PDF. Untuk paket soal yang sudah tersimpan, buka PDF-nya lewat **📄 Buka PDF (ambil gambar)** di editor.
- Murid bisa **mengetuk gambar untuk memperbesar** di halaman ujian dan Kuis Seru.
- Contoh: `contoh-soal/contoh-soal-bergambar.pdf`.

## Hak edit soal (versi server)
- Setiap paket soal mencatat **pembuatnya**.
- **Guru** hanya bisa mengedit atau menghapus paket soal miliknya. Paket soal guru lain bisa dilihat, dipakai untuk asesmen/kuis, atau **diduplikat** menjadi salinan milik sendiri.
- **Admin sekolah** bisa mengedit dan menghapus semua paket soal di sekolahnya.
- Aturan ini dijaga di server: perubahan yang tidak berhak ditolak.

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

## Kuis Seru (kuis live bergaya permainan, versi PHP)

Menu **🎮 Kuis Seru (Live)** di aplikasi guru:
1. Guru memilih paket soal (pilihan ganda, benar/salah, isian), waktu per soal, dan kelas. Kelas boleh dikosongkan, maka murid cukup mengetik nama panggilan.
2. Layar guru (bisa layar penuh untuk proyektor) menampilkan **kode 6 angka** serta tombol Salin Link/WhatsApp. Murid membuka `kuis.html`, memasukkan kode, lalu memilih avatar dan nama (+ NIS bila diisi).
3. Guru menekan **Mulai**. Setiap murid menjawab dengan timer per soal dan langsung tahu benar/salah:
   - poin = 500 + bonus kecepatan (maks. 500) + bonus beruntun (100/soal, maks. 500),
   - semua poin dihitung di server.
4. Layar guru menampilkan **papan peringkat langsung** dan progres tiap murid. Setelah **Akhiri**, tampil **podium juara**, hasil per murid, dan ketercapaian per soal.
5. **Simpan sebagai Nilai** membuat asesmen baru (mis. Formatif) dengan nilai = benar ÷ jumlah soal × 100.

### Mode Ujian
Saat membuat Kuis Seru, pilih **📝 Ujian** (bukan 🎮 Permainan):
- **Timer total** (15–120 menit, atau tanpa batas), dihitung sejak murid menekan *Mulai Ujian*.
- Murid bebas pindah soal, mengganti jawaban, dan menandai **ragu-ragu**. Peta nomor soal diberi warna (dijawab / ragu / belum).
- Soal **uraian ikut dipakai**. Guru mengoreksinya lewat tombol **📝 Koreksi**, dengan saran skor dari kata kunci.
- Jawaban **tersimpan otomatis** ke server, dengan cadangan di HP. Murid bisa melanjutkan setelah refresh atau HP mati.
- **Pengawasan**: keluar dari halaman ujian (pindah aplikasi/tab) tercatat sebagai pelanggaran. Bisa diatur supaya ujian **dikumpulkan otomatis** setelah 1/3/5 pelanggaran. Memuat ulang halaman tidak dihitung.
- **Layar pemantauan guru**: status, progres, jumlah ragu, pelanggaran, sisa waktu, dan nilai tiap peserta, diperbarui setiap 2 detik. Tombol ↻ mengulang ujian satu peserta.
- **Akhiri Ujian** mengumpulkan otomatis lembar jawaban yang belum dikirim. Setelah itu tampil hasil, rata-rata, ketercapaian KKTP, dan ketercapaian per soal.
- **Simpan sebagai Nilai** memakai nilai ujian (poin diperoleh ÷ total poin × 100, termasuk hasil koreksi uraian).

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
public/ujian.html    halaman ujian murid (token)
public/kuis.html     halaman pemain Kuis Seru
public/css/style.css tema 3D & warna dinamis
public/js/calc.js    jenis asesmen, istilah, rumus nilai rapor, predikat, deskripsi
public/js/parser.js  konversi teks/PDF → soal, penilaian jawaban (dipakai juga oleh server)
public/js/store.js   penyimpanan data (lokal atau server) & data contoh
public/js/app.js     semua tampilan/menu guru
public/js/student.js halaman ujian murid
public/js/art.js     ilustrasi SVG orisinal (maskot Kubi, objek 3D)
public/fonts/        font Unbounded & Plus Jakarta Sans (OFL)
public/lib/pdfjs/    pdf.js (Apache-2.0) untuk membaca PDF
public/lib/xlsx/     SheetJS 0.18.5 (Apache-2.0) untuk membaca Excel/ODS/CSV
public/contoh-soal/  contoh file PDF soal untuk dicoba
tests/run-tests.js   pengujian parser & penghitungan (npm test)
```

## Keamanan
- Password guru disimpan dalam bentuk hash (scrypt), dan login dibatasi setelah banyak percobaan gagal.
- File `.env`, `server/`, dan `node_modules/` tidak bisa diakses dari browser. Hanya isi folder `public/` yang disajikan.
- Kunci jawaban tidak pernah dikirim ke perangkat murid.
- Isi **NIS** untuk setiap murid supaya murid tidak bisa masuk dengan nama temannya.
- Pakai HTTPS (di cPanel biasanya otomatis lewat AutoSSL).
