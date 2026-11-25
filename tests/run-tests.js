/* Jalankan: node tests/run-tests.js */
const assert = require('assert');
const P = require('../public/js/parser.js');
const C = require('../public/js/calc.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}

console.log('Parser soal');

t('format standar: nomor titik, opsi per baris, kunci di akhir', () => {
  const r = P.parse(`
SUMATIF TENGAH SEMESTER GANJIL
Mata Pelajaran : IPA
I. PILIHAN GANDA
Pilihlah jawaban yang paling tepat!
1. Planet terdekat dengan matahari adalah ....
A. Venus
B. Merkurius
C. Bumi
D. Mars
2. Air mendidih pada suhu ... °C
a. 50
b. 75
c. 100
d. 125
II. ISIAN
1. Ibu kota Indonesia adalah ....
2. Rumus kimia air adalah ....
III. URAIAN
1. Jelaskan proses fotosintesis!
KUNCI JAWABAN
Pilihan Ganda
1. B 2. C
Isian
1. Jakarta / Nusantara
2. H2O
Uraian
1. Proses tumbuhan membuat makanan dengan bantuan cahaya matahari, air, dan karbon dioksida.
`);
  assert.strictEqual(r.stats.total, 5);
  assert.deepStrictEqual(r.questions.map(q => q.type), ['pg', 'pg', 'isian', 'isian', 'uraian']);
  assert.strictEqual(r.questions[0].answer, 'B');
  assert.strictEqual(r.questions[1].answer, 'C');
  assert.strictEqual(r.questions[1].options.length, 4);
  assert.strictEqual(r.questions[2].answer, 'Jakarta / Nusantara');
  assert.strictEqual(r.questions[3].answer, 'H2O');
  assert.ok(/tumbuhan/.test(r.questions[4].answer));
});

t('opsi sebaris & kurung, kunci inline', () => {
  const r = P.parse(`1) Hasil dari 12 x 3 = .... (A) 36 (B) 38 (C) 40 (D) 42
Jawaban: A
2) 3/4 jika dijadikan persen adalah ...
A. 25%   B. 50%   C. 75%   D. 80%
Kunci: C`);
  assert.strictEqual(r.stats.total, 2);
  assert.strictEqual(r.questions[0].options.length, 4);
  assert.strictEqual(r.questions[0].text, 'Hasil dari 12 x 3 = ....');
  assert.strictEqual(r.questions[0].answer, 'A');
  assert.deepStrictEqual(r.questions[1].options.map(o => o.text), ['25%', '50%', '75%', '80%']);
  assert.strictEqual(r.questions[1].answer, 'C');
});

t('kunci berupa angka tetap dianggap kunci sebaris', () => {
  const r = P.parse('1. 5 + 7 = ....\nKunci: 12\n2. 3 x 4 = ....\nJawaban: 12,5');
  assert.strictEqual(r.stats.total, 2);
  assert.strictEqual(r.questions[0].answer, '12');
  assert.strictEqual(r.questions[1].answer, '12,5');
});

t('pilihan berupa gambar (baris huruf saja)', () => {
  const r = P.parse('1. Bangun yang berbentuk segitiga adalah ....\nA.   B.   C.   D.\nKunci: B');
  assert.strictEqual(r.questions[0].type, 'pg');
  assert.strictEqual(r.questions[0].options.length, 4);
  assert.strictEqual(r.questions[0].answer, 'B');
});

t('gambar dipetakan ke soal di atasnya, kop sekolah dilewati', () => {
  const qs = [{ line: 2 }, { line: 5 }];
  const meta = [{ page: 1, group: 0, y: 800 }, { page: 1, group: 0, y: 780 }, { page: 1, group: 0, y: 700 }, { page: 1, group: 0, y: 500 }, null, { page: 2, group: 0, y: 760 }];
  const imgs = [{ page: 1, group: 0, x1: 50, x2: 100, y1: 805, y2: 840 }, { page: 1, group: 0, x1: 60, x2: 300, y1: 520, y2: 690 }, { page: 2, group: 0, x1: 60, x2: 300, y1: 600, y2: 750 }];
  const m = P.assignImages(qs, meta, imgs, -1);
  assert.deepStrictEqual(Object.keys(m), ['0', '1']);
  assert.strictEqual(m[0].length, 1); assert.strictEqual(m[1].length, 1);
});

t('pilihan ganda kompleks dari kunci "A, C"', () => {
  const r = P.parse('1. Bilangan prima di bawah ini adalah ... (jawaban lebih dari satu)\nA. 2\nB. 4\nC. 5\nD. 9\nKunci: A, C\n2. Pilih buah!\nA. apel\nB. batu\nC. jeruk\nKunci Jawaban\n2. A dan C');
  assert.strictEqual(r.questions[0].type, 'pgk'); assert.strictEqual(r.questions[0].answer, 'A,C');
  assert.strictEqual(r.questions[1].type, 'pgk'); assert.strictEqual(r.questions[1].answer, 'A,C');
});

t('bagian Jodohkan digabung jadi satu soal menjodohkan', () => {
  const r = P.parse('I. PILIHAN GANDA\n1. 2+2 = ...\nA. 3\nB. 4\nKunci: B\nII. Jodohkanlah pernyataan berikut!\n1. Ibu kota Jawa Barat   a. Surabaya\n2. Ibu kota Jawa Timur   b. Bandung\n3. Ibu kota Jawa Tengah   c. Semarang\nKUNCI JAWABAN\nI. 1. B\nII. 1. b 2. a 3. c');
  const j = r.questions.find(q => q.type === 'jodoh');
  assert.ok(j, JSON.stringify(r.questions.map(q => q.type)));
  assert.strictEqual(r.questions.length, 2);
  assert.deepStrictEqual(j.pairs, [{ l: 'Ibu kota Jawa Barat', r: 'Bandung' }, { l: 'Ibu kota Jawa Timur', r: 'Surabaya' }, { l: 'Ibu kota Jawa Tengah', r: 'Semarang' }]);
});

t('penilaian jenis soal baru (nilai sebagian)', () => {
  const g = P.gradeOne;
  assert.strictEqual(g({ type: 'pgk', answer: 'A,C' }, 'A,C'), 1);
  assert.strictEqual(g({ type: 'pgk', answer: 'A,C' }, 'A'), 0.5);
  assert.strictEqual(g({ type: 'pgk', answer: 'A,C' }, 'A,B'), 0);
  assert.strictEqual(g({ type: 'angka', answer: '3,14', tol: 0.01 }, '3.141'), 1);
  assert.strictEqual(g({ type: 'angka', answer: '12' }, '13'), 0);
  assert.strictEqual(g({ type: 'jodoh', pairs: [{}, {}, {}, {}] }, '[0,1,3,2]'), 0.5);
  assert.strictEqual(g({ type: 'urut', items: ['a', 'b', 'c'] }, '[0,1,2]'), 1);
  assert.strictEqual(g({ type: 'kelompok', cats: [{ items: ['x', 'y'] }, { items: ['z'] }] }, '{"0-0":0,"0-1":1,"1-0":1}'), 2 / 3);
  assert.strictEqual(g({ type: 'seret', text: 'Ibu kota [[Jakarta/Nusantara]] di pulau [[Jawa]]' }, '["nusantara","Sumatra"]'), 0.5);
  assert.strictEqual(g({ type: 'dropdown', text: 'Air [[mendidih|membeku]] pada 100°C' }, '["mendidih"]'), 1);
  assert.strictEqual(g({ type: 'titik', spot: { x: 0.5, y: 0.5, r: 0.1, ar: 1 } }, '0.55,0.52'), 1);
  assert.strictEqual(g({ type: 'titik', spot: { x: 0.5, y: 0.5, r: 0.1, ar: 1 } }, '0.9,0.9'), 0);
  assert.strictEqual(g({ type: 'label', marks: [{ label: 'Akar' }, { label: 'Daun' }] }, '["akar","Batang"]'), 0.5);
  assert.strictEqual(g({ type: 'polling' }, 'A'), undefined);
  assert.strictEqual(g({ type: 'gambar' }, 'data:...'), null);
  const r = P.grade([{ id: 'a', type: 'pg', answer: 'A', points: 2 }, { id: 'b', type: 'polling', points: 5 }, { id: 'c', type: 'jodoh', pairs: [{}, {}], points: 2 }], { a: 'A', b: 'B', c: '[0,0]' });
  assert.strictEqual(r.total, 4); assert.strictEqual(r.earned, 3); assert.strictEqual(r.score, 75);
});

t('sub-daftar pernyataan tidak dianggap soal baru', () => {
  const r = P.parse(`1. Perhatikan pernyataan berikut!
1) Matahari terbit dari timur
2) Bulan memancarkan cahaya sendiri
3) Bumi berotasi
Pernyataan yang benar adalah ....
A. 1 dan 2
B. 1 dan 3
C. 2 dan 3
D. semua benar
2. Hewan pemakan tumbuhan disebut ....
A. karnivora
B. herbivora
C. omnivora
D. insektivora
Kunci Jawaban
1. B
2. B`);
  assert.strictEqual(r.stats.total, 2);
  assert.ok(/Bumi berotasi/.test(r.questions[0].text));
  assert.strictEqual(r.questions[0].options.length, 4);
  assert.strictEqual(r.questions[0].answer, 'B');
  assert.strictEqual(r.questions[1].answer, 'B');
});

t('opsi bertanda bintang sebagai kunci, skor dalam kurung', () => {
  const r = P.parse(`Soal 1: Lambang negara Indonesia adalah ... (skor 2)
A. Garuda Pancasila*
B. Elang Jawa
C. Merpati
2. Sebutkan tiga sila Pancasila! [6 poin]`);
  assert.strictEqual(r.questions[0].answer, 'A');
  assert.strictEqual(r.questions[0].points, 2);
  assert.strictEqual(r.questions[0].options[0].text, 'Garuda Pancasila');
  assert.strictEqual(r.questions[1].type, 'uraian');
  assert.strictEqual(r.questions[1].points, 6);
});

t('benar/salah', () => {
  const r = P.parse(`C. Tentukan Benar atau Salah pernyataan berikut!
1. Indonesia merdeka tahun 1945.
2. Matahari mengelilingi bumi.
Kunci jawaban: 1. B 2. S`);
  assert.deepStrictEqual(r.questions.map(q => q.type), ['bs', 'bs']);
  assert.deepStrictEqual(r.questions.map(q => q.answer), ['B', 'S']);
});

t('angka desimal tidak dianggap nomor soal', () => {
  const r = P.parse(`1. Sebuah benda bermassa
2.5 kg bergerak dengan kecepatan tetap. Besar energi kinetiknya ...
A. 10 J
B. 20 J
2. Nilai pi kira-kira ...
A. 3.14
B. 2.71`);
  assert.strictEqual(r.stats.total, 2);
  assert.ok(/2\.5 kg/.test(r.questions[0].text));
});

t('baris kop surat sebelum soal diabaikan', () => {
  const r = P.parse(`PEMERINTAH KABUPATEN CONTOH
SMP NEGERI 1 CONTOH
Nama : ........  Kelas: ......
1. Ibukota Jawa Barat adalah ....
Halaman 1 dari 2
2. Gunung tertinggi di Jawa adalah ....`);
  assert.strictEqual(r.stats.total, 2);
  assert.strictEqual(r.questions[0].type, 'isian');
});

t('penilaian otomatis', () => {
  const qs = [
    { id: 'a', type: 'pg', answer: 'B', points: 1 },
    { id: 'b', type: 'bs', answer: 'S', points: 1 },
    { id: 'c', type: 'isian', answer: 'Jakarta / Nusantara', points: 2 },
    { id: 'd', type: 'uraian', answer: 'fotosintesis cahaya matahari klorofil', points: 4 }
  ];
  const g = P.grade(qs, { a: 'b', b: 'Salah', c: 'nusantara', d: 'tumbuhan butuh cahaya matahari dan klorofil' });
  assert.strictEqual(g.detail[0].got, 1);
  assert.strictEqual(g.detail[1].got, 1);
  assert.strictEqual(g.detail[2].got, 2);
  assert.ok(g.detail[3].got > 0);
  const g2 = P.grade(qs, { a: 'b', b: 'Salah', c: 'nusantara', d: 'x' }, { d: 4 });
  assert.strictEqual(g2.score, 100);
  assert.ok(P.matchShort('Jakrta', 'Jakarta'));
  assert.ok(P.matchShort('0,5', '0.5'));
  assert.ok(!P.matchShort('Bandung', 'Jakarta'));
});

t('susun baris dari item PDF (dua kolom)', () => {
  const items = [
    { str: '1. Soal kiri', x: 40, y: 700, w: 150, h: 10 },
    { str: 'A. satu', x: 40, y: 685, w: 60, h: 10 },
    { str: '3. Soal kanan', x: 320, y: 700, w: 150, h: 10 },
    { str: 'A. tiga', x: 320, y: 685, w: 60, h: 10 },
    { str: '2. Soal kiri dua', x: 40, y: 600, w: 150, h: 10 },
    { str: '4. Soal kanan dua', x: 320, y: 600, w: 150, h: 10 }
  ];
  const lines = P.itemsToLines(items, 595);
  assert.deepStrictEqual(lines, ['1. Soal kiri', 'A. satu', '2. Soal kiri dua', '3. Soal kanan', 'A. tiga', '4. Soal kanan dua']);
});

console.log('Penghitungan nilai');

const ctx = {
  settings: Object.assign({}, C.DEFAULT_SETTINGS, { semester: 'ganjil' }),
  tps: [{ id: 't1', code: 'TP1', desc: 'Mengidentifikasi ciri makhluk hidup' }, { id: 't2', code: 'TP2', desc: 'Menjelaskan klasifikasi makhluk hidup' }],
  assessments: [
    { id: 's1', type: 'slm', tpIds: ['t1'] }, { id: 's2', type: 'slm', tpIds: ['t2'] },
    { id: 'm', type: 'sts', tpIds: [] }, { id: 'e', type: 'sas', tpIds: [] }, { id: 'f', type: 'formatif', tpIds: ['t1'] }
  ],
  scores: { s1: { u: 80 }, s2: { u: 90 }, m: { u: 70 }, e: { u: 90 }, f: { u: 10 } }
};

t('nilai akhir semester = 50% SLM + 25% STS + 25% SAS', () => {
  const r = C.studentReport(ctx, 'u', 'Budi Santoso');
  assert.strictEqual(r.slmAvg, 85);
  assert.strictEqual(r.nilaiTengah, 78); // (85*50+70*50)/100 = 77.5 -> 78
  assert.strictEqual(r.nilaiAkhir, 83);  // 42.5+17.5+22.5 = 82.5 -> 83
  assert.strictEqual(r.predikat.label, 'B');
  assert.ok(r.akhirComplete);
  assert.ok(/Ananda Budi menunjukkan penguasaan yang (sangat )?baik/.test(r.deskripsi), r.deskripsi);
});

t('formatif tidak dihitung kecuali diaktifkan', () => {
  const s = Object.assign({}, ctx.settings, { includeFormatif: true, weightsAkhir: { slm: 40, formatif: 10, sts: 25, akhir: 25 } });
  const r = C.studentReport(Object.assign({}, ctx, { settings: s }), 'u', 'Budi');
  assert.strictEqual(r.nilaiAkhir, Math.round(85 * .4 + 10 * .1 + 70 * .25 + 90 * .25));
});

t('komponen kosong dinormalisasi & ditandai belum lengkap', () => {
  const r = C.studentReport(Object.assign({}, ctx, { scores: { s1: { u: 80 } } }), 'u', 'Budi');
  assert.strictEqual(r.nilaiAkhir, 80);
  assert.ok(!r.akhirComplete);
  assert.deepStrictEqual(r.akhirMissing, ['STS', 'SAS']);
});

t('semester genap memakai SAT', () => {
  const c2 = JSON.parse(JSON.stringify(ctx));
  c2.settings.semester = 'genap';
  c2.assessments.push({ id: 'y', type: 'sat', tpIds: [] });
  c2.scores.y = { u: 50 };
  const r = C.studentReport(c2, 'u', 'Budi');
  assert.strictEqual(r.akhirKey, 'sat');
  assert.strictEqual(r.nilaiAkhir, Math.round(85 * .5 + 70 * .25 + 50 * .25));
});

t('peringkat & statistik', () => {
  assert.deepStrictEqual(C.rank([80, 90, null, 80]), [2, 1, null, 2]);
  const s = C.stats([80, 60, 100], { kktp: 75 });
  assert.strictEqual(s.tuntas, 2); assert.strictEqual(s.avg, 80);
});

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
