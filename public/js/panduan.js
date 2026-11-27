/* Panduan penggunaan setiap jenis soal (dipakai di halaman "Panduan Jenis Soal" dan README). */
(function () {
  'use strict';
  const L = (l, t) => ({ label: l, text: t });
  const G = {
    pg: {
      kapan: 'Mengukur pemahaman konsep dengan satu jawaban paling tepat. Paling cepat dikoreksi dan paling cocok untuk kuis permainan.',
      buat: ['Pilih jenis <b>Pilihan Ganda</b>.', 'Tulis pertanyaan di kotak teks.', 'Isi teks setiap pilihan (A, B, C, …). Tambah/hapus pilihan dengan <b>+ Pilihan</b> / ✕.', '<b>Klik huruf</b> pilihan yang benar sampai berwarna — itulah kuncinya.'],
      murid: 'Mengetuk satu pilihan. Bisa diganti selama belum dikumpulkan.',
      nilai: 'Otomatis. Benar = poin penuh, salah/kosong = 0.',
      pdf: '1. Ibu kota Indonesia adalah …\nA. Bandung\nB. Jakarta\nC. Surabaya\nKunci: B',
      tips: ['Buat pengecoh yang masuk akal, bukan asal salah.', 'Urutan pilihan bisa diacak per murid saat membuat kuis/ujian.'],
      contoh: { type: 'pg', text: 'Planet terdekat dengan Matahari adalah …', options: [L('A', 'Venus'), L('B', 'Merkurius'), L('C', 'Mars'), L('D', 'Bumi')], answer: 'B', points: 1 }
    },
    pgk: {
      kapan: 'Saat jawaban benar lebih dari satu (sering dipakai di AKM). Mendorong murid memeriksa setiap pilihan.',
      buat: ['Pilih jenis <b>Pilihan Ganda Kompleks</b>.', 'Tulis pertanyaan dan isi semua pilihan.', '<b>Klik SEMUA huruf</b> yang benar — boleh dua, tiga, atau lebih.', 'Sebutkan di soal bahwa jawaban bisa lebih dari satu.'],
      murid: 'Mencentang semua pilihan yang dianggap benar (tanda ✓).',
      nilai: 'Otomatis dengan <b>nilai sebagian</b>: (jumlah benar − jumlah salah pilih) ÷ jumlah kunci. Contoh kunci A,C: pilih A saja = ½ poin; pilih A,B = 0.',
      pdf: '2. Bilangan prima di bawah ini adalah … (jawaban lebih dari satu)\nA. 2\nB. 4\nC. 5\nD. 9\nKunci: A, C',
      tips: ['Di PDF, tulis kunci seperti "A, C" atau "A dan C" — otomatis dikenali sebagai PG Kompleks.', 'Pengurangan untuk pilihan salah mencegah murid asal centang semua.'],
      contoh: { type: 'pgk', text: 'Manakah yang termasuk hewan mamalia? (jawaban lebih dari satu)', options: [L('A', 'Kucing'), L('B', 'Ayam'), L('C', 'Paus'), L('D', 'Katak')], answer: 'A,C', points: 2 }
    },
    bs: {
      kapan: 'Mengecek fakta atau miskonsepsi dengan cepat, cocok untuk pemanasan atau asesmen diagnostik.',
      buat: ['Pilih jenis <b>Benar / Salah</b>.', 'Tulis pernyataan (bukan pertanyaan).', 'Klik tombol <b>Benar</b> atau <b>Salah</b> sebagai kunci.'],
      murid: 'Mengetuk Benar atau Salah.',
      nilai: 'Otomatis. Kunci boleh ditulis B/S, Benar/Salah, atau T/F.',
      pdf: '3. Matahari terbit dari arah barat. (B/S)\nKunci: S',
      tips: ['Hindari kata "selalu/tidak pernah" yang membuat jawaban mudah ditebak.'],
      contoh: { type: 'bs', text: 'Air membeku pada suhu 0 °C.', answer: 'B', points: 1 }
    },
    isian: {
      kapan: 'Jawaban berupa satu kata/frasa pendek: istilah, nama tokoh, hasil singkat.',
      buat: ['Pilih jenis <b>Isian Singkat</b>.', 'Tulis pertanyaan.', 'Isi kunci jawaban. Jawaban lain yang juga benar dipisah dengan <b>/</b> (mis. <span class="kbd">Jakarta/DKI Jakarta</span>).'],
      murid: 'Mengetik jawaban singkat.',
      nilai: 'Otomatis. Huruf besar/kecil, spasi, dan salah ketik kecil (±15%) tetap dianggap benar.',
      pdf: '4. Ibu kota Indonesia adalah ….\nKunci: Jakarta',
      tips: ['Tulis semua variasi jawaban yang benar sebagai alternatif.', 'Untuk jawaban berupa bilangan, lebih baik pakai jenis <b>Jawaban Angka</b>.'],
      contoh: { type: 'isian', text: 'Proses tumbuhan membuat makanan sendiri disebut …', answer: 'fotosintesis', points: 2 }
    },
    angka: {
      kapan: 'Soal hitungan matematika/IPA yang jawabannya bilangan, termasuk desimal.',
      buat: ['Pilih jenis <b>Jawaban Angka</b>.', 'Tulis soal hitungan.', 'Isi <b>Jawaban angka</b> (koma atau titik sama saja, mis. 12,5).', 'Isi <b>Toleransi (±)</b> bila pembulatan diperbolehkan, mis. 0,01 untuk π ≈ 3,14.'],
      murid: 'Mengetik angka (keyboard angka muncul di HP).',
      nilai: 'Otomatis. Benar bila selisih dengan kunci ≤ toleransi. "12,50" = "12.5".',
      pdf: null,
      tips: ['Sebutkan satuan di soal agar murid hanya menulis angkanya.'],
      contoh: { type: 'angka', text: 'Sebuah persegi panjang berukuran 7 cm × 8 cm. Berapa luasnya (cm²)?', answer: '56', tol: 0, points: 2 }
    },
    jodoh: {
      kapan: 'Menghubungkan pasangan: istilah–arti, tokoh–peristiwa, negara–ibu kota, gambar–nama.',
      buat: ['Pilih jenis <b>Menjodohkan</b>.', 'Tulis perintah, mis. "Pasangkan hewan dengan suaranya".', 'Isi setiap baris <b>Kiri ↔ Kanan</b> dengan pasangan yang BENAR. Tambah dengan <b>+ Pasangan</b>.', 'Tidak perlu mengacak — kolom kanan diacak otomatis untuk murid.'],
      murid: 'Mengetuk item kiri lalu mengetuk pasangannya di kanan. Pasangan diberi warna & nomor sama. Ketuk lagi untuk melepas.',
      nilai: 'Otomatis, <b>per pasangan</b>. Mis. 3 dari 4 pasangan benar = ¾ poin.',
      pdf: 'II. Jodohkanlah!\n1. Ibu kota Jawa Barat   a. Surabaya\n2. Ibu kota Jawa Timur   b. Bandung\nKUNCI JAWABAN\nII. 1. b  2. a',
      tips: ['Idealnya 3–6 pasangan agar tidak terlalu panjang di layar HP.', 'Dari PDF, bagian berjudul "Jodohkan/Pasangkan" otomatis digabung menjadi satu soal.'],
      contoh: { type: 'jodoh', text: 'Pasangkan hewan dengan suaranya!', pairs: [{ l: 'Kucing', r: 'Mengeong' }, { l: 'Sapi', r: 'Melenguh' }, { l: 'Ayam', r: 'Berkokok' }], points: 3 }
    },
    urut: {
      kapan: 'Urutan langkah, kronologi peristiwa, siklus, atau mengurutkan bilangan.',
      buat: ['Pilih jenis <b>Mengurutkan</b>.', 'Tulis perintah, mis. "Urutkan tahap daur air".', 'Isi item dalam <b>URUTAN YANG BENAR</b> dari atas ke bawah. Tambah dengan <b>+ Item</b>.', 'Urutan otomatis diacak untuk murid.'],
      murid: 'Memindahkan item dengan tombol ▲ ▼ sampai urutannya benar.',
      nilai: 'Otomatis, <b>per posisi</b> yang tepat. Mis. 2 dari 4 posisi benar = ½ poin.',
      pdf: null,
      tips: ['3–6 item paling nyaman untuk HP.', 'Hindari item yang urutannya bisa diperdebatkan.'],
      contoh: { type: 'urut', text: 'Urutkan tahap daur air!', items: ['Penguapan', 'Pengembunan', 'Hujan', 'Peresapan'], points: 3 }
    },
    kelompok: {
      kapan: 'Mengklasifikasi: benda padat/cair/gas, hewan herbivora/karnivora, kalimat fakta/opini.',
      buat: ['Pilih jenis <b>Mengelompokkan</b>.', 'Tulis perintah.', 'Isi <b>nama kategori</b> (minimal 2) dan item milik kategori itu, <b>satu item per baris</b>. Tambah dengan <b>+ Kategori</b>.'],
      murid: 'Mengetuk item, lalu mengetuk kotak kategori tujuannya. Ketuk item di kotak untuk mengembalikannya.',
      nilai: 'Otomatis, <b>per item</b> yang masuk kategori benar.',
      pdf: null,
      tips: ['2–4 kategori dengan total 4–10 item ideal untuk HP.'],
      contoh: { type: 'kelompok', text: 'Kelompokkan benda berikut menurut wujudnya!', cats: [{ name: 'Padat', items: ['Batu', 'Kayu'] }, { name: 'Cair', items: ['Air', 'Minyak'] }], points: 4 }
    },
    seret: {
      kapan: 'Melengkapi kalimat/paragraf dengan kata dari bank kata — cocok untuk kosakata, rumus, atau teks rumpang.',
      buat: ['Pilih jenis <b>Seret ke Kalimat</b>.', 'Tulis kalimat di kotak pertanyaan dan apit jawaban dengan kurung siku ganda: <span class="kbd">Ibu kota Indonesia adalah [[Jakarta]].</span>', 'Boleh lebih dari satu bagian kosong. Alternatif jawaban: <span class="kbd">[[Jakarta/Nusantara]]</span>.', 'Isi <b>Kata pengecoh</b> (dipisah koma) agar tidak terlalu mudah.'],
      murid: 'Mengetuk kata di bank kata, lalu mengetuk bagian kosong. Ketuk bagian kosong yang terisi untuk menghapus.',
      nilai: 'Otomatis, <b>per bagian kosong</b>.',
      pdf: null,
      tips: ['Tambahkan 1–3 pengecoh.', 'Pastikan setiap bagian kosong hanya punya satu jawaban yang masuk akal.'],
      contoh: { type: 'seret', text: 'Tumbuhan membuat makanan melalui [[fotosintesis]] dengan bantuan cahaya [[matahari]].', extra: 'bulan, respirasi', points: 2 }
    },
    dropdown: {
      kapan: 'Memilih kata yang tepat di dalam kalimat: tata bahasa, imbuhan, konsep yang mirip.',
      buat: ['Pilih jenis <b>Pilihan dalam Kalimat</b>.', 'Tulis kalimat dan di bagian pilihan tulis <span class="kbd">[[benar|salah1|salah2]]</span>. Pilihan <b>pertama</b> selalu jawaban benar.', 'Contoh: <span class="kbd">Air [[mendidih|membeku|mencair]] pada suhu 100 °C.</span> Urutan pilihan diacak untuk murid.'],
      murid: 'Memilih kata dari kotak pilihan di dalam kalimat.',
      nilai: 'Otomatis, <b>per kotak pilihan</b>.',
      pdf: null,
      tips: ['Bisa lebih dari satu kotak dalam satu kalimat.'],
      contoh: { type: 'dropdown', text: 'Kata dasar dari "membaca" adalah [[baca|membaca|bacaan]].', points: 1 }
    },
    titik: {
      kapan: 'Menunjuk lokasi pada gambar: peta, organ tubuh, bagian tumbuhan, titik pada grafik.',
      buat: ['Pilih jenis <b>Titik pada Gambar</b>.', 'Tulis perintah, mis. "Ketuk letak jantung".', 'Tambahkan gambar dengan tombol <b>🖼</b> (unggah) atau <b>✂️ Dari PDF</b>.', '<b>Klik gambar</b> pada bagian yang benar — muncul lingkaran hijau.', 'Atur <b>Besar area benar</b> dengan penggeser.'],
      murid: 'Mengetuk satu titik pada gambar (titik merah). Boleh diulang.',
      nilai: 'Otomatis. Benar bila titik murid berada di dalam area hijau.',
      pdf: null,
      tips: ['Gunakan gambar yang jelas dan cukup besar.', 'Area jangan terlalu kecil agar murid di HP tidak kesulitan.'],
      contoh: null
    },
    label: {
      kapan: 'Memberi nama bagian pada gambar: bagian bunga, peta pulau, alat musik, organ.',
      buat: ['Pilih jenis <b>Label Gambar</b>.', 'Tambahkan gambar (🖼 atau ✂️ Dari PDF).', '<b>Klik gambar</b> di setiap bagian yang ingin diberi label — muncul penanda bernomor.', 'Isi <b>label yang benar</b> untuk setiap penanda.'],
      murid: 'Memilih label dari daftar untuk setiap penanda bernomor.',
      nilai: 'Otomatis, <b>per penanda</b>.',
      pdf: null,
      tips: ['3–6 penanda sudah cukup.', 'Hapus penanda yang salah dengan tombol ✕.'],
      contoh: null
    },
    uraian: {
      kapan: 'Menjelaskan, menganalisis, berpendapat — keterampilan berpikir tingkat tinggi.',
      buat: ['Pilih jenis <b>Uraian</b>.', 'Tulis pertanyaan.', 'Isi <b>kunci/pedoman penskoran</b> berisi kata-kata kunci jawaban ideal.'],
      murid: 'Mengetik jawaban panjang.',
      nilai: 'Aplikasi memberi <b>saran skor</b> dari kecocokan kata kunci, lalu guru menetapkan nilai di halaman <b>Koreksi</b>.',
      pdf: '5. Jelaskan pengertian fotosintesis!\nKunci: proses tumbuhan membuat makanan dengan bantuan cahaya matahari',
      tips: ['Hanya untuk mode Ujian (tidak dipakai di Kuis Permainan).', 'Nilai murid bisa berubah setelah dikoreksi — murid diberi tahu.'],
      contoh: { type: 'uraian', text: 'Mengapa kita perlu menjaga kebersihan lingkungan?', answer: 'mencegah penyakit, lingkungan sehat, nyaman', points: 4 }
    },
    gambar: {
      kapan: 'Jawaban yang lebih mudah digambar: bangun datar, peta pikiran, langkah hitungan tulisan tangan, sketsa.',
      buat: ['Pilih jenis <b>Menggambar</b>.', 'Tulis perintah, mis. "Gambarlah segitiga siku-siku".', 'Opsional: tambahkan gambar — akan menjadi <b>latar kanvas</b> (mis. peta kosong untuk diwarnai).', 'Isi pedoman penilaian bila perlu.'],
      murid: 'Menggambar/menulis dengan jari atau stylus. Ada 4 warna, penghapus, dan tombol hapus semua. Gambar tersimpan otomatis.',
      nilai: 'Dikoreksi guru. Gambar murid tampil di halaman <b>Koreksi</b>.',
      pdf: null,
      tips: ['Hanya untuk mode Ujian.'],
      contoh: { type: 'gambar', text: 'Gambarlah sebuah segitiga.', points: 5 }
    },
    suara: {
      kapan: 'Kemampuan berbicara: membaca nyaring, pelafalan bahasa Inggris/Arab, hafalan, presentasi singkat.',
      buat: ['Pilih jenis <b>Rekam Suara</b>.', 'Tulis perintah, mis. "Bacakan pantun berikut".', 'Pilih <b>durasi rekaman maksimal</b> (30–120 detik).'],
      murid: 'Menekan <b>Mulai Rekam</b>, berbicara, lalu <b>Berhenti</b>. Bisa diputar ulang dan direkam ulang. Browser akan meminta izin mikrofon.',
      nilai: 'Dikoreksi guru dengan mendengarkan rekaman di halaman <b>Koreksi</b>.',
      pdf: null,
      tips: ['Hanya untuk mode Ujian.', 'Butuh situs HTTPS dan izin mikrofon di HP murid.', 'Minta murid mengerjakan di tempat yang tidak terlalu ramai.'],
      contoh: { type: 'suara', text: 'Ucapkan salam perkenalan singkat.', maxSec: 30, points: 5 }
    },
    polling: {
      kapan: 'Menanyakan pendapat/minat tanpa jawaban benar: survei awal (diagnostik non-kognitif), refleksi, voting.',
      buat: ['Pilih jenis <b>Polling / Survei</b>.', 'Tulis pertanyaan dan pilihan-pilihannya. Tidak perlu kunci.'],
      murid: 'Mengetuk satu pilihan. Di kuis permainan muncul "Pilihanmu tercatat!".',
      nilai: 'Tidak dinilai dan tidak memengaruhi skor. Jawaban murid bisa dilihat guru di halaman koreksi.',
      pdf: null,
      tips: ['Cocok di awal pembelajaran untuk Asesmen Diagnostik non-kognitif.'],
      contoh: { type: 'polling', text: 'Bagaimana perasaanmu belajar hari ini?', options: [L('A', '😀 Senang'), L('B', '😐 Biasa'), L('C', '😟 Bingung')], points: 0 }
    },
    slide: {
      kapan: 'Menyisipkan penjelasan, petunjuk, bacaan, atau gambar di antara soal — mis. teks bacaan sebelum soal literasi.',
      buat: ['Pilih jenis <b>Slide Materi</b>.', 'Tulis materi/penjelasan di kotak teks. Tambahkan gambar bila perlu.'],
      murid: 'Membaca, lalu lanjut ke soal berikutnya.',
      nilai: 'Tidak dinilai.',
      pdf: null,
      tips: ['Matikan "Acak urutan soal" agar slide tetap muncul sebelum soal yang berhubungan.'],
      contoh: { type: 'slide', text: 'Bacalah teks berikut dengan saksama sebelum menjawab soal nomor 2–4.', points: 0 }
    }
  };
  /* Aturan teks bacaan (stimulus) yang dipakai beberapa soal */
  G._teks = {
    aturan: [
      'Tulis <b>baris petunjuk</b> tepat sebelum teks, yang menyebut <b>nomor soal</b> pemakainya.',
      'Baris berikutnya boleh berisi <b>judul teks</b> (opsional), mis. <span class="kbd">Teks 2: Penerapan Nilai-Nilai Pancasila di Sekolah</span>.',
      'Lalu tulis <b>isi teks</b> (boleh beberapa paragraf, boleh ada gambar/tabel).',
      'Setelah teks, langsung tulis <b>soal dengan nomor pertama yang disebut</b> (mis. <span class="kbd">6. …</span>).',
      'Bila baris petunjuk <b>tidak menyebut nomor</b> (mis. <span class="kbd">Bacalah teks berikut!</span>), teks hanya dipakai untuk <b>1 soal</b> sesudahnya.',
      'Judul bagian bernomor seperti <span class="kbd">PILIHAN GANDA / NOMOR 1–5</span> yang diikuti cerita/kasus juga dikenali: kasus itu menjadi teks bacaan <b>hanya untuk nomor 1–5</b>. Bagian yang hanya berisi perintah (mis. <span class="kbd">Pilihlah jawaban yang tepat!</span>) tidak dijadikan teks bacaan.',
      'Petunjuk umum di awal (mis. <span class="kbd">Bacalah setiap kasus … untuk soal nomor 1–40</span>) masuk ke <b>halaman Petunjuk</b>, bukan ke setiap soal.',
      'Daftar bernomor <b>di dalam</b> teks sebaiknya memakai <span class="kbd">a)</span> <span class="kbd">b)</span> atau tanda <span class="kbd">•</span> agar tidak dikira nomor soal.'
    ],
    bentuk: ['Bacalah teks berikut untuk menjawab soal nomor 6–10!', 'Perhatikan teks berikut untuk soal no. 6 s.d. 10.', 'Cermatilah wacana berikut untuk menjawab soal nomor 6, 7, dan 8.', 'Teks berikut untuk menjawab soal 11-13', 'Perhatikan gambar berikut untuk menjawab soal nomor 4 dan 5!'],
    contoh: 'Bacalah teks berikut untuk menjawab soal nomor 6–8!\nTeks 2: Penerapan Nilai-Nilai Pancasila di Sekolah\nSMP Negeri Satap Ratte melaksanakan kerja bakti setiap hari Jumat. Semua siswa bekerja sama membersihkan halaman sekolah.\nKetika ada teman yang kesulitan, siswa lain membantu tanpa membedakan suku dan agama.\n6. Kegiatan kerja bakti mencerminkan sila ke ....\nA. 1\nB. 3\nC. 4\nD. 5\n7. …\n8. …',
    hasil: [
      'Teks tampil di <b>atas setiap soal</b> yang memakainya (murid bisa menyembunyikan/menampilkan kembali).',
      'Saat urutan soal <b>diacak</b>, soal-soal dengan teks yang sama tetap <b>berdekatan dan berurutan</b>.',
      'Di editor, teks bacaan bisa diubah sekali untuk semua soalnya; tombol <b>📖</b> pada soal untuk menambah teks bacaan atau mengatur nomor soal pemakainya.'
    ]
  };
  if (typeof window !== 'undefined') window.PANDUAN = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})();
