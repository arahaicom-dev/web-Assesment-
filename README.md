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

## Cara menjalankan

Aplikasinya statis (HTML/CSS/JS), tanpa instalasi atau build. Agar pembaca PDF berjalan, buka lewat server web:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`. Bisa juga dipasang di **GitHub Pages**, Netlify, atau hosting statis lain.

Data disimpan di **browser perangkat itu sendiri** (localStorage). Gunakan *Pengaturan → Ekspor Cadangan* untuk membuat cadangan atau memindahkan data ke perangkat lain.

Contoh file soal untuk dicoba ada di folder `contoh-soal/`.

## Struktur

```
index.html          kerangka halaman
css/style.css       tema 3D & warna dinamis
js/calc.js          jenis asesmen, istilah, rumus nilai rapor, predikat, deskripsi
js/parser.js        konversi teks/PDF → soal, penilaian jawaban
js/store.js         penyimpanan data & data contoh
js/app.js           semua tampilan/menu
lib/pdfjs/          pdf.js (Apache-2.0) untuk membaca PDF
tests/run-tests.js  pengujian parser & penghitungan (node tests/run-tests.js)
```
