/* Impor daftar murid dari Excel/CSV/ODS dengan format apa pun.
   Mengenali baris judul (kop), baris header di mana pun, urutan kolom bebas, format Dapodik,
   header berulang, baris tanda tangan/jumlah di bawah, beberapa sheet, dan kolom kelas/rombel. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiswaImport = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cellStr = v => {
    if (v == null) return '';
    let s = String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    if (/^'/.test(s)) s = s.slice(1);
    if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
    if (/^\d(\.\d+)?e\+\d+$/i.test(s)) { const n = Number(s); if (isFinite(n)) s = n.toLocaleString('fullwide', { useGrouping: false }); }
    return s;
  };
  /* ---- pengenal kolom dari teks header ---- */
  const FIELDS = {
    name: h => /\bnama\b|\bname\b/.test(h) && !/(ayah|ibu|wali|ortu|orang tua|sekolah|kelas|rombel|guru|wali kelas|mapel|pelajaran|ibu kandung|desa|kecamatan|kabupaten|jalan|dusun|bank|rekening|panggilan)/.test(h),
    nisn: h => /\bnisn\b/.test(h),
    nis: h => /\b(nis|nipd|nis lokal|no induk|nomor induk|induk|no ind|student id|id siswa)\b/.test(h) && !/\bnisn\b/.test(h),
    kelas: h => /\b(kelas|rombel|rombongan belajar|class|rombel saat ini)\b/.test(h) && !/(wali|nama wali|tingkat pendidikan)/.test(h),
    jk: h => /^(jk|l ?\/ ?p|lp|jenis kelamin|kelamin|gender|sex|j k)$/.test(h),
    no: h => /^(no|nomor|no urut|urut|nomor urut|#)$/.test(h)
  };
  const fieldOf = h => { h = norm(h); if (!h) return null; for (const k of ['nisn', 'nis', 'jk', 'no', 'kelas', 'name']) if (FIELDS[k](h)) return k; return null; };
  const STOP = /^(mengetahui|kepala sekolah|kepala madrasah|wali kelas|guru|nip\b|jumlah|total|keterangan|catatan|dicetak|tanggal cetak|halaman|ttd|tanda tangan|laki laki|perempuan|l\s*=|p\s*=)/i;
  const looksName = s => /[A-Za-zÀ-ɏ]{2,}/.test(s) && !/^\d+$/.test(s) && s.length >= 2 && s.length <= 80 && !/@/.test(s) && !/^(l|p|lk|pr|laki-laki|perempuan)$/i.test(s);
  const looksId = s => /^\d{3,20}$/.test(s.replace(/[\s.\-/]/g, ''));

  function headerScan(rows) {
    let best = null;
    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      const tryRow = (cells, span) => {
        const map = {}; let score = 0;
        cells.forEach((c, i) => { const f = fieldOf(c); if (f && map[f] === undefined) { map[f] = i; score += f === 'name' ? 3 : 1; } });
        if (map.name === undefined) return;
        if (!best || score > best.score) best = { row: r, span, map, score };
      };
      tryRow(rows[r], 1);
      if (rows[r + 1]) tryRow(rows[r].map((c, i) => (cellStr(c) + ' ' + cellStr(rows[r + 1][i])).trim()), 2);
    }
    return best;
  }
  /** Tebak kolom dari isi bila tidak ada header. */
  function inferColumns(rows) {
    const width = Math.max(0, ...rows.map(r => r.length));
    const sample = rows.filter(r => r.some(c => cellStr(c))).slice(0, 60);
    const st = [];
    for (let c = 0; c < width; c++) {
      const vals = sample.map(r => cellStr(r[c])).filter(Boolean);
      const n = vals.length || 1;
      const nameFrac = vals.filter(v => looksName(v) && /\s/.test(v)).length / n + vals.filter(v => looksName(v)).length / n * 0.5;
      const ids = vals.filter(looksId);
      const seq = +vals[0] <= 3 && vals.every((v, i) => +v === +vals[0] + i);
      const avgLen = ids.length ? ids.reduce((t, v) => t + v.replace(/\D/g, '').length, 0) / ids.length : 0;
      st.push({ c, n: vals.length, nameFrac, idFrac: ids.length / n, seq: vals.length > 2 && seq, avgLen, jk: vals.filter(v => /^(l|p)$/i.test(v)).length / n });
    }
    const map = {};
    const nm = st.filter(x => x.n).sort((a, b) => b.nameFrac - a.nameFrac)[0];
    if (nm && nm.nameFrac > 0.5 && nm.n >= 2) map.name = nm.c;
    st.filter(x => x.idFrac > 0.6 && !x.seq && x.c !== map.name).forEach(x => {
      if (Math.round(x.avgLen) === 10 && map.nisn === undefined) map.nisn = x.c;
      else if (map.nis === undefined) map.nis = x.c;
    });
    const jk = st.find(x => x.jk > 0.7); if (jk) map.jk = jk.c;
    const no = st.find(x => x.seq && x.c !== map.name); if (no) map.no = no.c;
    return map;
  }
  /** Huruf kapital semua → Huruf Awal Kapital (gelar & singkatan dipertahankan). */
  function titleCase(name) {
    if (name !== name.toUpperCase() || !/[A-Z]/.test(name)) return name;
    return name.toLowerCase().replace(/(^|[\s\-'(.])([a-zà-ɏ])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(S\.pd|S\.ag|M\.pd)\b/gi, x => x.replace(/\.(\w+)/, (m, w) => '.' + w.charAt(0).toUpperCase() + w.slice(1)));
  }
  /** Nama kelas → fase Kurikulum Merdeka. */
  function faseOf(cls) {
    const s = String(cls || '').toUpperCase();
    const rom = { XII: 12, XI: 11, X: 10, IX: 9, VIII: 8, VII: 7, VI: 6, V: 5, IV: 4, III: 3, II: 2, I: 1 };
    let g = null;
    const m = s.match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/); if (m) g = rom[m[1]];
    if (g == null) { const d = s.match(/\b(1[0-2]|[1-9])\b/) || s.match(/(1[0-2]|[1-9])/); if (d) g = +d[1]; }
    if (g == null) return null;
    return g <= 2 ? 'A' : g <= 4 ? 'B' : g <= 6 ? 'C' : g <= 9 ? 'D' : g === 10 ? 'E' : 'F';
  }
  /** Rapikan nama kelas: "VII-A" / "7 A" / "Kelas VII A" → "VII A" */
  function cleanClass(c) { return cellStr(c).replace(/^kelas\s+/i, '').replace(/\s*[-_]\s*/g, ' ').replace(/\s+/g, ' ').trim(); }

  /**
   * Baca satu sheet (array baris berisi sel).
   * @returns {{ map, headerRow, rows:[{no,nis,nisn,name,jk,kelas,src}], warnings, headers }}
   */
  function parseSheet(rows, opts) {
    opts = opts || {};
    rows = (rows || []).map(r => (r || []).map(cellStr));
    const warnings = [];
    let hs = opts.map ? { row: opts.headerRow == null ? -1 : opts.headerRow, span: 1, map: opts.map } : headerScan(rows);
    let map, start;
    if (hs) { map = Object.assign({}, hs.map); start = hs.row + hs.span; }
    else { map = inferColumns(rows); start = 0; if (map.name === undefined) return { map, headerRow: -1, rows: [], warnings: ['Kolom nama murid tidak ditemukan.'], headers: [] }; warnings.push('Tidak ada baris judul kolom — kolom ditebak dari isinya.'); }
    // Bila header tidak punya kolom NIS, cari kolom angka yang belum terpakai
    if (hs && map.nis === undefined && map.nisn === undefined && !opts.map) {
      const inf = inferColumns(rows.slice(start));
      if (inf.nis !== undefined && Object.values(map).indexOf(inf.nis) < 0) map.nis = inf.nis;
      if (inf.nisn !== undefined && Object.values(map).indexOf(inf.nisn) < 0) map.nisn = inf.nisn;
    }
    const headers = hs && hs.row >= 0 ? rows[hs.row].map((c, i) => hs.span === 2 ? (c + ' ' + ((rows[hs.row + 1] || [])[i] || '')).trim() : c) : [];
    const out = []; let blank = 0, skipped = 0;
    for (let r = start; r < rows.length; r++) {
      const row = rows[r];
      const get = f => map[f] === undefined ? '' : cellStr(row[map[f]]);
      let name = get('name').replace(/^\d+\s*[.)]\s+/, '').trim();
      if (!row.some(Boolean)) { blank++; continue; }
      if (!name) { continue; }
      if (fieldOf(name) === 'name' || STOP.test(name)) { skipped++; if (STOP.test(name) && blank) break; continue; }
      if (!looksName(name)) { skipped++; continue; }
      blank = 0;
      out.push({ no: get('no'), nis: get('nis').replace(/\s/g, ''), nisn: get('nisn').replace(/\s/g, ''), name: name.replace(/\s+/g, ' '), jk: (get('jk').match(/^[lp]/i) || [''])[0].toUpperCase(), kelas: cleanClass(get('kelas')), src: r + 1 });
    }
    if (skipped > 3) warnings.push(skipped + ' baris dilewati (judul, header berulang, atau bukan nama).');
    return { map, headerRow: hs ? hs.row : -1, rows: out, warnings, headers };
  }

  /**
   * Baca semua sheet. sheets = [{ name, rows }]
   * @returns {{ sheets:[{name, ...parseSheet}], total, classes:[...], suggest:'one'|'column'|'sheets' }}
   */
  function parseWorkbook(sheets, opts) {
    const res = sheets.map(sh => Object.assign({ name: sh.name }, parseSheet(sh.rows, opts && opts[sh.name])));
    const used = res.filter(x => x.rows.length);
    const all = [].concat(...used.map(x => x.rows));
    const classes = []; all.forEach(s => { if (s.kelas && classes.indexOf(s.kelas) < 0) classes.push(s.kelas); });
    let suggest = 'one';
    if (classes.length > 1) suggest = 'column';
    else if (used.length > 1 && used.every(x => /\d|\b[IVX]+\b/i.test(x.name))) suggest = 'sheets';
    return { sheets: res, used, total: all.length, classes, suggest };
  }

  /** Teks hasil tempel/CSV → baris sel. */
  function textToRows(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const sep = /\t/.test(text) ? '\t' : (lines.filter(l => l.split(';').length > 1).length >= lines.filter(l => l.split(',').length > 1).length ? ';' : ',');
    return lines.map(l => l.split(sep));
  }

  return { parseSheet, parseWorkbook, textToRows, titleCase, faseOf, cleanClass, fieldOf, cellStr };
});
