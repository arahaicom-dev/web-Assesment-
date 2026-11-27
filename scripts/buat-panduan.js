/* Membuat docs/PANDUAN-JENIS-SOAL.md dari public/js/panduan.js. Jalankan: node scripts/buat-panduan.js */
const fs = require('fs'), path = require('path');
const G = require('../public/js/panduan.js'), QT = require('../public/js/qtypes.js'), P = require('../public/js/parser.js');
const md = h => String(h).replace(/<span class="kbd">(.*?)<\/span>/g, '`$1`').replace(/<\/?b>/g, '**').replace(/<\/?i>/g, '_').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const manual = t => P.MANUAL_TYPES.includes(t), none = t => t === 'polling' || t === 'slide';
let o = '# Panduan Jenis Soal — Asesmen Merdeka\n\nPanduan ini juga tersedia di aplikasi (menu **📘 Panduan Jenis Soal**) lengkap dengan contoh yang bisa dicoba.\n\n';
o += '## Cara cepat\n\n1. **Buat soal** di Bank Soal: klik jenis soal di kotak "Buat Soal Langsung", atau unggah PDF/tempel teks.\n2. **Lengkapi kunci** (soal yang belum lengkap bertanda merah), cek dengan **👁 Pratinjau Murid**, lalu **💾 Simpan**.\n3. **Pakai** di Kuis Seru (🎮 Permainan / 📝 Ujian) atau pasang di asesmen sebagai ujian dengan token.\n4. **Koreksi**: soal otomatis langsung bernilai; uraian, gambar, dan rekaman dinilai di tombol 📝 Koreksi. Nilai = poin diperoleh ÷ total poin × 100.\n\n';
o += '| Jenis | Penilaian | Dipakai di |\n|---|---|---|\n' + QT.ORDER.map(t => `| ${QT.TYPES[t].icon} [${QT.TYPES[t].label}](#${t}) | ${manual(t) ? 'Dikoreksi guru' : none(t) ? 'Tidak dinilai' : 'Otomatis'} | ${QT.TYPES[t].game ? 'Permainan & Ujian' : 'Ujian'} |`).join('\n') + '\n\n';
const X = G._teks;
o += '## 📖 Teks bacaan untuk beberapa soal\n\n**Aturan penulisan di PDF / teks:**\n' + X.aturan.map((x, i) => `${i + 1}. ${md(x)}`).join('\n') + '\n\n**Bentuk baris petunjuk yang dikenali:**\n' + X.bentuk.map(x => '- `' + x + '`').join('\n') + '\n\n**Contoh:**\n\n```\n' + X.contoh + '\n```\n\n**Hasilnya di web:**\n' + X.hasil.map(x => '- ' + md(x)).join('\n') + '\n\n';
QT.ORDER.forEach(t => {
  const g = G[t];
  o += `<a id="${t}"></a>\n## ${QT.TYPES[t].icon} ${QT.TYPES[t].label}\n\n**Kapan dipakai:** ${md(g.kapan)}\n\n**Cara membuat (guru):**\n${g.buat.map((x, i) => `${i + 1}. ${md(x)}`).join('\n')}\n\n**Cara murid menjawab:** ${md(g.murid)}\n\n**Penilaian:** ${md(g.nilai)}\n\n`;
  o += g.pdf ? '**Contoh format di PDF / teks:**\n\n```\n' + g.pdf + '\n```\n\n' : '**Dari PDF:** dibuat langsung di editor (soal hasil unggah PDF bisa diubah ke jenis ini).\n\n';
  if (g.tips && g.tips.length) o += '**Tips:**\n' + g.tips.map(x => '- ' + md(x)).join('\n') + '\n\n';
});
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'PANDUAN-JENIS-SOAL.md'), o);
console.log('docs/PANDUAN-JENIS-SOAL.md dibuat');
