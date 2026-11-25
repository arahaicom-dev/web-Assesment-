/*
 * Parser soal: mengubah teks bebas (hasil ekstrak PDF / tempelan) menjadi
 * soal terstruktur sesuai format web, walaupun format aslinya berbeda-beda.
 *
 * Mengenali:
 *  - Penomoran: "1.", "1)", "(1)", "1 -", "No. 1", "Soal 1:", nomor sendirian di satu baris
 *  - Opsi: "A.", "a)", "(A)", "A " — per baris maupun sebaris ("A. 3  B. 4  C. 5")
 *  - Bagian: "I. PILIHAN GANDA", "B. Isilah titik-titik ...", "Uraian/Esai", "Benar atau Salah"
 *  - Kunci: "Jawaban: B", "Kunci: C", opsi bertanda * / ✓, atau bagian "KUNCI JAWABAN" di akhir
 *  - Skor: "(skor 10)", "[5 poin]", "(bobot 3)"
 *  - Sub-daftar di dalam soal (pernyataan 1), 2), 3) ...) tidak dianggap soal baru
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SoalParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_POINTS = { pg: 1, bs: 1, isian: 2, uraian: 4 };
  const LETTERS = 'ABCDEFGH';

  const SECTION_KEYWORDS = [
    { type: 'bs', re: /benar\s*(atau|\/|-|dan)\s*salah|true\s*(or|\/)\s*false|\(\s*B\s*\/\s*S\s*\)/i },
    { type: 'pg', re: /pilihan\s*ganda|pilihlah|berilah\s+tanda\s+silang|tanda\s+silang|multiple\s*choice|jawaban\s+yang\s+(paling\s+)?(benar|tepat)\s*!?\s*$/i },
    { type: 'isian', re: /\bisian\b|isilah|lengkapilah|titik[\s-]*titik|jawaban\s+singkat|menjodohkan|jodohkan/i },
    { type: 'uraian', re: /\buraian\b|\besa[iy]\b|\bessay\b|jawablah\s+(pertanyaan|soal)|jawablah\s+dengan\s+(benar|tepat|jelas|singkat)/i }
  ];

  const KEY_HEADING = /^\s*(?:[IVX]{1,4}\s*[.)]\s*)?(?:kunci\s*(?:jawaban)?|answer\s*key|pembahasan\s+dan\s+kunci)\b.{0,40}$/i;
  const INLINE_ANSWER = /^\s*(?:kunci(?:\s*jawaban)?|jawaban(?:nya)?|jawab|answer|ans|key)\s*[:=]\s*(.*)$/i;
  const POINTS_RE = /[([]\s*(?:skor|bobot|poin|point|nilai)\s*[:=]?\s*(\d{1,3})\s*(?:poin|point|pts)?\s*[)\]]|[([]\s*(\d{1,3})\s*(?:poin|point|pts)\s*[)\]]/i;
  const BLANK_RE = /(\.{3,}|…{1,}|_{3,}|-{4,})/;
  const URAIAN_HINT = /^(jelaskan|uraikan|sebutkan|mengapa|bagaimana|apa\s+(yang\s+)?(dimaksud|perbedaan)|bandingkan|analisislah|analisislah|tuliskan|deskripsikan|berikan\s+contoh|buatlah|hitunglah|tentukan)/i;

  function uid() { return 'q' + Math.random().toString(36).slice(2, 10); }

  function normalizeText(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[   \t]/g, ' ')
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”‟]/g, '"')
      .replace(/[‐-–]/g, '-')
      .replace(/—/g, ' - ')
      .replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
      .replace(/[​-‍﻿]/g, '')
      .replace(/[•▪●◦]/g, '-');
  }

  function isNoiseLine(l) {
    return /^\s*(halaman|hal\.?|page)\s*\d+(\s*(dari|of|\/)\s*\d+)?\s*$/i.test(l) ||
      /^\s*-\s*\d+\s*-\s*$/.test(l) ||
      /^\s*\d+\s*\/\s*\d+\s*$/.test(l) ||
      /^\s*[=_*~]{3,}\s*$/.test(l) ||
      /^\s*(selamat\s+mengerjakan|semoga\s+sukses|good\s+luck)\W*$/i.test(l);
  }

  function sectionTypeOf(line) {
    const l = line.trim();
    if (!l || l.length > 170) return null;
    if (/^\(?\d{1,3}\s*[.)\]:]/.test(l)) return null; // baris soal bernomor
    if (/\?\s*$/.test(l)) return null;
    const prefixed = /^(?:[IVX]{1,4}|[A-H]|bagian\s+\w+|soal|part\s+\w+)\s*[.):\-]\s*/i.test(l);
    const caps = l.replace(/[^A-Za-z]/g, '').length >= 5 && l === l.toUpperCase();
    const imperative = /^(pilihlah|isilah|jawablah|berilah|lengkapilah|tentukan(lah)?\s+(benar|apakah)|tulislah|jodohkan(lah)?|pasangkan(lah)?)/i.test(l);
    if (!(prefixed || caps || imperative)) return null;
    for (const k of SECTION_KEYWORDS) if (k.re.test(l)) return k.type;
    return null;
  }

  /** Cari opsi sebaris. Mengembalikan {head, options:[{label,text}]} atau null. */
  function splitInlineOptions(str, startIndex, minCount) {
    const re = /(^|[\s;,])\(?([A-Ha-h])\s*[.)\]]\s+/g;
    const hits = [];
    let m, expect = startIndex;
    while ((m = re.exec(str))) {
      const lab = m[2].toUpperCase();
      if (lab === LETTERS[expect]) {
        hits.push({ idx: m.index + m[1].length, end: re.lastIndex, label: lab });
        expect++;
      }
    }
    if (hits.length < (minCount || 1)) return null;
    // Opsi pertama di tengah kalimat harus diikuti opsi berikutnya agar tidak salah tangkap.
    const options = hits.map((h, i) => ({
      label: h.label,
      text: str.slice(h.end, i + 1 < hits.length ? hits[i + 1].idx : str.length).trim()
    }));
    if (options.some(o => !o.text)) return null;
    return { head: str.slice(0, hits[0].idx).trim(), options };
  }

  function extractPoints(q) {
    const m = q.text.match(POINTS_RE);
    if (m) {
      q.points = parseInt(m[1] || m[2], 10);
      q.text = q.text.replace(POINTS_RE, ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }

  function markAnswerInOptions(q) {
    for (const o of q.options) {
      let t = o.text, marked = false;
      if (/^\*\s*/.test(t) || /\s*\*$/.test(t)) { marked = true; t = t.replace(/^\*\s*|\s*\*$/g, ''); }
      if (/[✓✔]|\((benar|kunci|jawaban)\)\s*$/i.test(t)) { marked = true; t = t.replace(/[✓✔]|\((benar|kunci|jawaban)\)\s*$/ig, '').trim(); }
      o.text = t.trim();
      if (marked && !q.answer) q.answer = o.label;
    }
  }

  function normBS(v) {
    const s = String(v || '').trim().toLowerCase().replace(/[^a-z]/g, '');
    if (/^(b|benar|t|true|betul|ya)$/.test(s)) return 'B';
    if (/^(s|salah|f|false|tidak)$/.test(s)) return 'S';
    return null;
  }
  function isBlankAnswer(v) { return !String(v || '').replace(/[\s._\-…]/g, ''); }

  function finalizeQuestion(q) {
    q.text = q.text.replace(/\s{2,}/g, ' ').trim();
    q.options.forEach(o => { o.text = o.text.replace(/\s{2,}/g, ' ').trim(); });
    // Opsi yang mungkin masih menempel di teks soal (mis. dari PDF yang satu baris)
    if (q.options.length === 0) {
      const sp = splitInlineOptions(q.text, 0, 2);
      if (sp && sp.head) { q.text = sp.head; q.options = sp.options; }
    }
    // Opsi terakhir kadang ikut membawa opsi berikutnya sebaris
    if (q.options.length) {
      const last = q.options[q.options.length - 1];
      const sp = splitInlineOptions(' ' + last.text, q.options.length, 1);
      if (sp && sp.head) { last.text = sp.head; q.options = q.options.concat(sp.options); }
    }
    extractPoints(q);
    markAnswerInOptions(q);

    const sec = q.section;
    const optsBS = q.options.length === 2 && q.options.every(o => normBS(o.text));
    if (optsBS) {
      q.type = 'bs';
      if (q.answer && /^[AB]$/.test(q.answer)) q.answer = normBS(q.options[q.answer === 'A' ? 0 : 1].text);
      q.options = [];
    } else if (q.options.length >= 2) {
      q.type = 'pg';
    } else {
      if (q.options.length === 1) { // satu "opsi" saja => kemungkinan bagian kalimat
        q.text += ' ' + q.options[0].label + '. ' + q.options[0].text;
        q.options = [];
      }
      const bsMarker = /\(\s*B\s*\/\s*S\s*\)|\bB\s*[-\/]\s*S\b\s*$|^\s*B\s*[-\/]\s*S\s+/;
      if (sec === 'bs' || bsMarker.test(q.text)) {
        q.type = 'bs';
        q.text = q.text.replace(/\(\s*B\s*\/\s*S\s*\)|\bB\s*[-\/]\s*S\b\s*$|^\s*B\s*[-\/]\s*S\s+/g, '').trim();
      } else if (sec === 'isian') q.type = 'isian';
      else if (sec === 'uraian') q.type = 'uraian';
      else if (BLANK_RE.test(q.text) && q.text.length < 220 && !URAIAN_HINT.test(q.text)) q.type = 'isian';
      else q.type = 'uraian';
    }
    if (q.type === 'bs' && q.answer) q.answer = normBS(q.answer) || q.answer;
    if (q.type === 'pg' && q.answer) q.answer = String(q.answer).trim().charAt(0).toUpperCase();
    if (!q.points) q.points = DEFAULT_POINTS[q.type];
    return q;
  }

  /** Parse bagian kunci jawaban. */
  function romanToInt(r) {
    const v = { I: 1, V: 5, X: 10 }; let n = 0;
    for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; n += a < b ? -a : a; }
    return n;
  }
  function parseKeyLines(lines, sectionOrder) {
    const keys = []; // {num, value, section}
    let sec = null;
    for (const raw of lines) {
      let line = raw.trim();
      if (!line) continue;
      const rm = line.match(/^([IVX]{1,4})\s*[.)]\s*(.*)$/);
      if (rm && sectionOrder && sectionOrder.length && !sectionTypeOf(line)) {
        const idx = romanToInt(rm[1]) - 1;
        if (sectionOrder[idx]) sec = sectionOrder[idx];
        line = rm[2].trim();
        if (!line) continue;
      }
      const st = sectionTypeOf(line) || (/^(pilihan\s*ganda|pg)\b/i.test(line) ? 'pg' : /^(isian)\b/i.test(line) ? 'isian' : /^(uraian|esai|essay)\b/i.test(line) ? 'uraian' : /^benar/i.test(line) ? 'bs' : null);
      if (st && !/^\d/.test(line)) { sec = st; continue; }
      // Banyak pasangan dalam satu baris: "1. A  2. C  3. D" atau "1-A, 2-B"
      const multi = [];
      const reMulti = /(\d{1,3})\s*[.)\-:=]?\s*\(?([A-Ha-h]|benar|salah|B|S)\)?(?=[\s,;|]|$)/g;
      let m;
      while ((m = reMulti.exec(line))) multi.push({ num: +m[1], value: m[2] });
      const covered = multi.reduce((n, x) => n + 1, 0);
      if (covered >= 2 || (covered === 1 && /^\s*\d{1,3}\s*[.)\-:=]?\s*\(?[A-Ha-h]\)?\s*[.]?\s*$/i.test(line))) {
        multi.forEach(x => keys.push({ num: x.num, value: x.value, section: sec }));
        continue;
      }
      const single = line.match(/^\(?(\d{1,3})\s*[.)\]:\-]\s*(.+)$/);
      if (single) { keys.push({ num: +single[1], value: single[2].trim(), section: sec }); continue; }
      // Lanjutan jawaban uraian
      if (keys.length && !/^\d/.test(line)) keys[keys.length - 1].value += ' ' + line;
    }
    return keys;
  }

  function applyKeys(questions, keys, warnings) {
    if (!keys.length) return 0;
    let applied = 0;
    const used = new Set();
    // Kelompok kunci per bagian kalau ada; jika tidak ada, urut kemunculan per nomor
    const occ = {};
    for (const k of keys) {
      let cands = questions.filter(q => q.num === k.num && !used.has(q.id));
      if (k.section) {
        const sameSec = cands.filter(q => (q.section || q.type) === k.section || q.type === k.section);
        if (sameSec.length) cands = sameSec;
      }
      const target = cands[0];
      if (!target) continue;
      used.add(target.id);
      const v = k.value.trim();
      if (target.type === 'pg') {
        const lm = v.match(/^\(?([A-Ha-h])\)?(?:[.)\s]|$)/);
        if (lm) { target.answer = lm[1].toUpperCase(); applied++; }
        else {
          // Kunci berupa teks opsi
          const opt = target.options.find(o => o.text.toLowerCase() === v.toLowerCase());
          if (opt) { target.answer = opt.label; applied++; }
        }
      } else if (target.type === 'bs') {
        const b = normBS(v); if (b) { target.answer = b; applied++; }
      } else if (!isBlankAnswer(v)) { target.answer = v; applied++; }
      occ[k.num] = (occ[k.num] || 0) + 1;
    }
    return applied;
  }

  /**
   * Parser utama.
   * @param {string|string[]} input teks atau array baris
   * @returns {{questions: Array, warnings: string[], stats: object}}
   */
  function parse(input) {
    const text = Array.isArray(input) ? input.join('\n') : input;
    const lines = normalizeText(text).split('\n').map(l => l.replace(/\s+$/, ''));
    const warnings = [];
    const questions = [];
    let cur = null;          // soal aktif
    let section = null;      // tipe bagian aktif
    let sectionChanged = false;
    let lastNum = 0;
    let mainDelim = null;    // pemisah nomor soal yang dominan
    let delimCount = {};
    let subList = null;      // {delim, last}
    let keyStart = -1, keyFirst = null;
    const sectionOrder = [];
    let lastTarget = 'text'; // ke mana baris lanjutan ditempel: 'text' | 'option'

    const push = () => { if (cur) { questions.push(cur); } };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      if (!t || isNoiseLine(t)) continue;

      if (KEY_HEADING.test(t) && !/^\(?\d/.test(t)) {
        const ia0 = t.match(INLINE_ANSWER);
        const isInline = cur && ia0 && ia0[1].trim() && !/^\(?\d{1,3}\s*[.)\-:=]\s*\S/.test(ia0[1].trim());
        if (!isInline) {
          keyStart = i + 1;
          const restKey = t.replace(/^[^:]*:\s*/, t.includes(':') ? '' : t);
          if (t.includes(':') && restKey.trim()) keyFirst = restKey;
          break;
        }
      }

      // Bagian / instruksi
      const st = sectionTypeOf(t);
      if (st && !(cur && cur.options.length && /^[A-H]\s*[.)]/.test(t) && LETTERS[cur.options.length] === t[0] && !/^[A-H]\s*[.)]\s*(pilih|isi|jawab|beri|lengkap|uraian|esai|benar)/i.test(t))) {
        push(); cur = null; section = st; sectionChanged = true; subList = null; sectionOrder.push(st);
        continue;
      }

      // Jawaban inline
      const ia = t.match(INLINE_ANSWER);
      if (ia && cur) {
        if (!isBlankAnswer(ia[1])) cur.answer = ia[1].trim();
        continue;
      }

      // Nomor soal
      const pm = t.match(/^(?:soal|no|nomor)\b\s*(?:no\b|nomor\b)?\s*\.?\s*(\d{1,3})(?!\d)\s*[.):\-]?\s*(.*)$/i);
      let qm = pm ? null : t.match(/^\(?(\d{1,3})\s*([.)\]:]|\s-)(?!\d)\s*(.*)$/);
      let num = null, delim = null, rest = '';
      if (pm) { num = +pm[1]; delim = 'no'; rest = pm[2]; }
      else if (qm) { num = +qm[1]; delim = qm[2].trim() || '-'; rest = qm[3]; if (/^\(/.test(t)) delim = '()'; }
      else {
        const bare = t.match(/^(\d{1,3})$/);
        const spaced = t.match(/^(\d{1,3})\s+([A-Z"'(].*)$/);
        if (bare && +bare[1] === lastNum + 1) { num = +bare[1]; delim = 'bare'; rest = ''; }
        else if (spaced && +spaced[1] === lastNum + 1 && !(cur && cur.options.length === 0 && section === 'pg' && cur.text)) { num = +spaced[1]; delim = 'space'; rest = spaced[2]; }
      }

      if (num !== null && num > 0) {
        let accept = false;
        const isRestart = num === 1 && questions.length + (cur ? 1 : 0) > 0;
        if (subList && delim === subList.delim && num === subList.last + 1 && (!cur || cur.options.length === 0)) {
          accept = false; subList.last = num;
        } else if (!cur && lastNum === 0) accept = true;
        else if (isRestart) {
          const looksSub = cur && cur.options.length === 0 && !sectionChanged &&
            (section === 'pg' || /[:!]\s*$|berikut/i.test(cur.text) || (mainDelim && delim !== mainDelim));
          if (sectionChanged || !looksSub) accept = true;
          else { subList = { delim, last: 1 }; }
        } else if (num === lastNum + 1) {
          accept = !(mainDelim && delim !== mainDelim && cur && cur.options.length === 0 && subList);
        } else if (num > lastNum && num - lastNum <= 5) {
          accept = !(mainDelim && delim !== mainDelim);
        }

        if (accept) {
          push();
          if (num !== lastNum + 1 && !(num === 1)) warnings.push('Nomor soal melompat dari ' + lastNum + ' ke ' + num + '.');
          cur = { id: uid(), num, type: null, section, text: rest, options: [], answer: null, points: null, line: i };
          lastNum = num; sectionChanged = false; subList = null; lastTarget = 'text';
          delimCount[delim] = (delimCount[delim] || 0) + 1;
          mainDelim = Object.keys(delimCount).sort((a, b) => delimCount[b] - delimCount[a])[0];
          // Opsi sebaris pada baris soal
          const sp = splitInlineOptions(cur.text, 0, 2);
          if (sp) { cur.text = sp.head; cur.options = sp.options; lastTarget = 'option'; }
          continue;
        }
        // tidak diterima => lanjutan teks
      }

      if (!cur) {
        // Teks sebelum soal pertama (kop, identitas) diabaikan
        continue;
      }

      // Baris berisi huruf pilihan saja (pilihan berupa gambar): "A.   B.   C.   D."
      if (/^(?:\(?[A-Ha-h]\s*[.)]\s*){2,8}$/.test(t)) {
        const labs = (t.match(/[A-Ha-h](?=\s*[.)])/g) || []).map(x => x.toUpperCase());
        if (labs.every((l, k) => l === LETTERS[cur.options.length + k])) {
          labs.forEach(l => cur.options.push({ label: l, text: '(lihat gambar)' }));
          lastTarget = 'option'; subList = null;
          continue;
        }
      }

      // Opsi
      const om = t.match(/^\(?([A-Ha-h])\s*[.)\]]\s*(.*)$/) ;
      const omSpace = t.match(/^([A-H])\s{1,4}(\S.*)$/);
      const expect = LETTERS[cur.options.length];
      let optLabel = null, optText = '';
      if (om && om[1].toUpperCase() === expect && (om[2] || /[.)]$/.test(t))) { optLabel = expect; optText = om[2]; }
      else if (omSpace && omSpace[1] === expect && (cur.options.length > 0 || (expect === 'A' && section !== 'uraian' && section !== 'isian'))) {
        // Hindari kalimat bahasa Inggris "A ..." — butuh opsi berikutnya ada di baris setelahnya
        const next = (lines[i + 1] || '').trim();
        if (cur.options.length > 0 || /^\(?B\s*[.)\]]?\s+/.test(next)) { optLabel = expect; optText = omSpace[2]; }
      }
      if (optLabel) {
        subList = null;
        const sp = splitInlineOptions(' ' + optText, cur.options.length + 1, 1);
        if (sp && sp.head !== undefined && sp.head !== '') {
          cur.options.push({ label: optLabel, text: sp.head });
          cur.options = cur.options.concat(sp.options);
        } else cur.options.push({ label: optLabel, text: optText });
        lastTarget = 'option';
        continue;
      }

      // Opsi sebaris yang dimulai di baris lanjutan (mis. "A. 2   B. 4   C. 6")
      if (cur.options.length === 0) {
        const sp = splitInlineOptions(t, 0, 2);
        if (sp && !sp.head) { cur.options = sp.options; lastTarget = 'option'; continue; }
      }

      // Lanjutan
      if (lastTarget === 'option' && cur.options.length) {
        const last = cur.options[cur.options.length - 1];
        // Baris panjang setelah opsi terakhir kemungkinan teks lain; tetap tempel ke opsi.
        last.text += ' ' + t;
      } else {
        cur.text += (cur.text ? '\n' : '') + t;
      }
    }
    push();

    questions.forEach(finalizeQuestion);

    let keysApplied = 0;
    if (keyStart >= 0) {
      const keys = parseKeyLines((keyFirst ? [keyFirst] : []).concat(lines.slice(keyStart)), sectionOrder);
      keysApplied = applyKeys(questions, keys, warnings);
    }

    questions.forEach(q => {
      if (q.type === 'pg' && !q.answer) warnings.push('Soal no. ' + q.num + ' (pilihan ganda) belum memiliki kunci jawaban.');
      if (q.type === 'pg' && q.answer && !q.options.some(o => o.label === q.answer)) warnings.push('Kunci soal no. ' + q.num + ' (' + q.answer + ') tidak ada di pilihan.');
      if (!q.text) warnings.push('Soal no. ' + q.num + ' tidak memiliki teks pertanyaan.');
      delete q.section;
    });

    const count = t => questions.filter(q => q.type === t).length;
    return {
      questions,
      warnings,
      keyLine: keyStart >= 0 ? keyStart - 1 : -1,
      stats: { total: questions.length, pg: count('pg'), bs: count('bs'), isian: count('isian'), uraian: count('uraian'), keysApplied }
    };
  }

  /* ---------------- Penilaian jawaban ---------------- */

  function normAnswer(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s.,-]/gu, ' ').replace(/[.,](?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  /** Cocokkan jawaban isian (toleran huruf besar/kecil, tanda baca, salah ketik ringan, beberapa alternatif). */
  function matchShort(given, key) {
    const g = normAnswer(given);
    if (!g || !key) return false;
    const alts = String(key).split(/\s*(?:\/|;|\||\batau\b|\bor\b)\s*/i).map(normAnswer).filter(Boolean);
    for (const a of alts) {
      if (g === a) return true;
      const gn = parseFloat(g.replace(',', '.')), an = parseFloat(a.replace(',', '.'));
      if (/^-?[\d.,]+$/.test(g) && /^-?[\d.,]+$/.test(a) && isFinite(gn) && Math.abs(gn - an) < 1e-9) return true;
      if (a.length >= 5 && levenshtein(g, a) <= Math.floor(a.length * 0.15)) return true;
    }
    return false;
  }
  /** Saran skor uraian dari kemiripan kata kunci (perlu dikoreksi guru). */
  function suggestEssay(given, key, points) {
    const stop = new Set('yang dan di ke dari untuk pada adalah dengan atau ini itu dalam oleh karena juga akan sebagai tidak bisa dapat secara'.split(' '));
    const words = s => normAnswer(s).split(' ').filter(w => w.length > 2 && !stop.has(w));
    const k = Array.from(new Set(words(key)));
    const g = new Set(words(given));
    if (!k.length || !g.size) return 0;
    const hit = k.filter(w => g.has(w) || Array.from(g).some(x => x.length > 4 && (x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))).length;
    const ratio = Math.min(1, hit / Math.max(3, Math.ceil(k.length * 0.6)));
    return Math.round(ratio * points * 2) / 2;
  }

  /**
   * Nilai satu lembar jawaban.
   * @returns {{score:number, earned:number, total:number, detail:Array, needsReview:boolean}}
   */
  function grade(questions, answers, manual) {
    manual = manual || {};
    let earned = 0, total = 0, needsReview = false;
    const detail = questions.map(q => {
      const pts = +q.points || DEFAULT_POINTS[q.type] || 1;
      total += pts;
      const ans = answers ? answers[q.id] : undefined;
      let got = 0, status = 'salah', auto = true;
      if (q.type === 'pg') { got = ans && q.answer && String(ans).toUpperCase() === String(q.answer).toUpperCase() ? pts : 0; }
      else if (q.type === 'bs') { got = ans && q.answer && normBS(ans) === normBS(q.answer) ? pts : 0; }
      else if (q.type === 'isian') { got = matchShort(ans, q.answer) ? pts : 0; }
      else { auto = false; got = suggestEssay(ans, q.answer, pts); }
      if (manual[q.id] !== undefined && manual[q.id] !== null && manual[q.id] !== '') {
        got = Math.max(0, Math.min(pts, +manual[q.id])); auto = false;
        status = 'dikoreksi';
      } else if (q.type === 'uraian') { status = 'perlu koreksi'; needsReview = needsReview || !!(ans && String(ans).trim()); }
      if (status !== 'dikoreksi' && status !== 'perlu koreksi') status = got >= pts ? 'benar' : (got > 0 ? 'sebagian' : 'salah');
      if (!ans || !String(ans).trim()) { if (status !== 'dikoreksi') status = 'kosong'; }
      earned += got;
      return { id: q.id, got, pts, status, auto };
    });
    return { score: total ? Math.round(earned / total * 10000) / 100 : 0, earned, total, detail, needsReview };
  }

  /* ---------------- Ekstraksi PDF (browser) ---------------- */

  /**
   * Susun ulang baris teks dari item pdf.js (urut posisi, deteksi dua kolom).
   * items: [{str, x, y, w, h}], pageWidth
   * Mengembalikan { lines: [{text, y, group}], gx, hasSpan } — group = urutan baca kolom.
   */
  function layoutLines(items, pageWidth) {
    items = items.filter(it => it.str && it.str.trim() !== '' || it.str === ' ');
    if (!items.length) return { lines: [], gx: null, hasSpan: false };
    // Deteksi tata letak dua kolom
    const bins = 60, cover = new Array(bins).fill(0);
    let wide = 0;
    for (const it of items) {
      const a = Math.max(0, Math.floor(it.x / pageWidth * bins)), b = Math.min(bins - 1, Math.floor((it.x + it.w) / pageWidth * bins));
      if (b - a > bins * 0.55) wide++;
      for (let k = a; k <= b; k++) cover[k]++;
    }
    let gutter = null;
    for (let k = Math.floor(bins * 0.38); k <= Math.ceil(bins * 0.62); k++) {
      if (cover[k] <= Math.max(1, items.length * 0.01)) { gutter = k; break; }
    }
    let groups = [items], gx = null, hasSpan = false;
    if (gutter !== null && wide < items.length * 0.08) {
      const g = gutter / bins * pageWidth;
      const span = items.filter(it => it.x < g - 2 && it.x + it.w > g + 2);
      const rest = items.filter(it => span.indexOf(it) < 0);
      const left = rest.filter(it => it.x + it.w / 2 < g), right = rest.filter(it => it.x + it.w / 2 >= g);
      if (left.length > items.length * 0.2 && right.length > items.length * 0.2) { groups = span.length ? [span, left, right] : [left, right]; gx = g; hasSpan = span.length > 0; }
    }
    const out = [];
    groups.forEach((g, gi) => {
      g.sort((a, b) => (b.y - a.y) || (a.x - b.x));
      const rows = [];
      for (const it of g) {
        const tol = Math.max(2, (it.h || 10) * 0.45);
        let row = rows.length ? rows[rows.length - 1] : null;
        if (row && Math.abs(row.y - it.y) <= tol) row.items.push(it);
        else rows.push({ y: it.y, items: [it] });
      }
      for (const r of rows) {
        r.items.sort((a, b) => a.x - b.x);
        let s = '', prevEnd = null;
        for (const it of r.items) {
          if (prevEnd !== null) {
            const gap = it.x - prevEnd;
            const sz = it.h || 10;
            if (gap > sz * 2.2) s += '   ';
            else if (gap > sz * 0.15 && !/\s$/.test(s) && !/^\s/.test(it.str)) s += ' ';
          }
          s += it.str;
          prevEnd = it.x + it.w;
        }
        out.push({ text: s.replace(/\s+$/, ''), y: r.y, group: gi });
      }
    });
    return { lines: out, gx, hasSpan };
  }
  function itemsToLines(items, pageWidth) { return layoutLines(items, pageWidth).lines.map(l => l.text); }

  /** Urutan baca kolom untuk sebuah kotak gambar pada halaman. */
  function groupOf(box, layout) {
    if (layout.gx === null) return 0;
    const off = layout.hasSpan ? 1 : 0;
    if (box.x1 < layout.gx - 2 && box.x2 > layout.gx + 2) return 0; // melintang kolom
    return ((box.x1 + box.x2) / 2 < layout.gx ? 0 : 1) + off;
  }

  /**
   * Tentukan pemilik setiap gambar: soal yang barisnya tepat di atas gambar (urutan baca).
   * meta: [{page, group, y}] sejajar dengan baris teks; images: [{page, group, x1,y1,x2,y2}] (koordinat PDF, y ke atas)
   * Mengembalikan peta indeks soal → daftar gambar.
   */
  function assignImages(questions, meta, images, keyLine) {
    const starts = questions.map((q, i) => ({ i, line: q.line })).filter(x => typeof x.line === 'number').sort((a, b) => a.line - b.line);
    const out = {};
    for (const im of images) {
      const top = Math.max(im.y1, im.y2);
      let L = -1;
      for (let k = 0; k < meta.length; k++) {
        const m = meta[k];
        if (!m) continue;
        const before = m.page < im.page || (m.page === im.page && (m.group < im.group || (m.group === im.group && m.y >= top - 2)));
        if (before) L = k;
      }
      if (L < 0 || (keyLine >= 0 && L >= keyLine)) continue;
      let owner = null;
      for (const st of starts) if (st.line <= L) owner = st.i;
      if (owner === null) continue;
      (out[owner] = out[owner] || []).push(im);
    }
    return out;
  }

  /** Posisi gambar raster pada halaman (dari daftar operator pdf.js). */
  async function pageImages(page, lib) {
    const OPS = lib.OPS;
    const ops = await page.getOperatorList();
    const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    let ctm = [1, 0, 0, 1, 0, 0]; const stack = []; const boxes = [];
    const imgOps = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintJpegXObject, OPS.paintImageXObjectRepeat].filter(x => x !== undefined);
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === OPS.save) stack.push(ctm.slice());
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm.slice()); if (args && args[0] && args[0].length === 6) ctm = mul(ctm, args[0]); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (imgOps.indexOf(fn) >= 0) {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        boxes.push({ x1: Math.min.apply(null, xs), x2: Math.max.apply(null, xs), y1: Math.min.apply(null, ys), y2: Math.max.apply(null, ys) });
      }
    }
    return boxes;
  }

  /** Ekstrak teks (dan posisi gambar) dari file PDF memakai pdf.js (window.pdfjsLib). */
  async function extractPdf(arrayBuffer, onProgress) {
    const lib = (typeof window !== 'undefined') && window.pdfjsLib;
    if (!lib) throw new Error('Pustaka PDF belum termuat.');
    const doc = await lib.getDocument({ data: arrayBuffer }).promise;
    const all = [], meta = [], images = [];
    let charCount = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const items = tc.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height }));
      const lay = layoutLines(items, vp.width);
      lay.lines.forEach(l => { all.push(l.text); meta.push({ page: p, group: l.group, y: l.y }); });
      charCount += lay.lines.map(l => l.text).join('').replace(/\s/g, '').length;
      all.push(''); meta.push(null);
      try {
        const area = vp.width * vp.height;
        for (const bx of await pageImages(page, lib)) {
          const a = (bx.x2 - bx.x1) * (bx.y2 - bx.y1);
          if (a < 300 || a > area * 0.85 || bx.x2 - bx.x1 < 12 || bx.y2 - bx.y1 < 12) continue; // ikon kecil / latar halaman penuh
          images.push(Object.assign({ page: p, group: groupOf(bx, lay) }, bx));
        }
      } catch (e) { /* abaikan: gambar tetap bisa diambil manual */ }
      if (onProgress) onProgress(p, doc.numPages);
    }
    return { lines: all, meta, images, pages: doc.numPages, charCount, doc };
  }

  return {
    parse, grade, matchShort, suggestEssay, normBS, itemsToLines, layoutLines, assignImages, extractPdf,
    normalizeText, splitInlineOptions, DEFAULT_POINTS
  };
});
