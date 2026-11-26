# Cara memasang Asesmen Merdeka di hosting (cPanel)

File: **asesmen-siap-unggah.zip** (selalu versi terbaru).

1. cPanel → File Manager → buka folder **public_html**.
2. Upload `asesmen-siap-unggah.zip` ke **public_html**.
3. Klik kanan zip → **Extract** → tujuan `/public_html`. Hasilnya folder **public_html/asesmen** berisi `app.html`, `api/`, `css/`, `js/`, dst. Jangan pindahkan file setelah diekstrak.
4. Bila sebelumnya sudah punya `api/config.php` (pengaturan database), letakkan di `public_html/asesmen/api/`. Bila belum, aplikasi akan meminta data database saat dibuka.
5. Cek `https://domain-anda/asesmen/api/health` → harus memuat `"mode":"server"`.
6. Buka `https://domain-anda/asesmen/app.html`.

Data (sekolah, murid, soal, nilai) tersimpan di database MySQL, jadi memperbarui file tidak menghapus data.
