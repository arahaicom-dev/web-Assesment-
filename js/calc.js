/*
 * Penghitungan nilai (Kurikulum Merdeka).
 * Bisa dipakai di browser (window.Calc) maupun Node (require) untuk pengujian.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Jenis asesmen dengan istilah terbaru beserta istilah lamanya. */
  const TYPES = {
    diagnostik: {
      key: 'diagnostik', short: 'AD', name: 'Asesmen Diagnostik', old: 'Pretest / Tes Awal',
      desc: 'Dilakukan di awal pembelajaran untuk memetakan kemampuan awal (kognitif) dan kondisi murid (non-kognitif). Tidak masuk nilai rapor.',
      icon: '🔍', rapor: false
    },
    formatif: {
      key: 'formatif', short: 'AF', name: 'Asesmen Formatif', old: 'Kuis / Latihan / Tugas Harian',
      desc: 'Dilakukan selama proses pembelajaran sebagai umpan balik. Secara default tidak masuk rapor (bisa diaktifkan di Pengaturan).',
      icon: '📝', rapor: 'opsional'
    },
    slm: {
      key: 'slm', short: 'SLM', name: 'Sumatif Lingkup Materi', old: 'Ulangan Harian (UH) / Penilaian Harian (PH)',
      desc: 'Dilakukan setelah satu atau beberapa Tujuan Pembelajaran (TP) / lingkup materi selesai. Masuk nilai rapor.',
      icon: '📚', rapor: true
    },
    sts: {
      key: 'sts', short: 'STS', name: 'Sumatif Tengah Semester', old: 'Ujian Tengah Semester (UTS) / PTS',
      desc: 'Dilakukan di pertengahan semester untuk mengukur ketercapaian TP paruh pertama semester. Masuk nilai rapor.',
      icon: '🧭', rapor: true
    },
    sas: {
      key: 'sas', short: 'SAS', name: 'Sumatif Akhir Semester', old: 'Ujian Akhir Semester (UAS) / PAS',
      desc: 'Dilakukan di akhir semester ganjil untuk mengukur ketercapaian seluruh TP dalam satu semester. Masuk nilai rapor.',
      icon: '🏁', rapor: true
    },
    sat: {
      key: 'sat', short: 'SAT', name: 'Sumatif Akhir Tahun', old: 'Penilaian Akhir Tahun (PAT) / UKK',
      desc: 'Dilakukan di akhir semester genap untuk mengukur ketercapaian TP dalam satu tahun ajaran. Masuk nilai rapor semester genap.',
      icon: '🎓', rapor: true
    }
  };
  const TYPE_ORDER = ['diagnostik', 'formatif', 'slm', 'sts', 'sas', 'sat'];

  const GLOSSARY = [
    ['Ulangan Harian (UH) / Penilaian Harian (PH)', 'Sumatif Lingkup Materi (SLM)'],
    ['Ujian Tengah Semester (UTS) / Penilaian Tengah Semester (PTS)', 'Sumatif Tengah Semester (STS)'],
    ['Ujian Akhir Semester (UAS) / Penilaian Akhir Semester (PAS)', 'Sumatif Akhir Semester (SAS)'],
    ['Penilaian Akhir Tahun (PAT) / Ujian Kenaikan Kelas (UKK)', 'Sumatif Akhir Tahun (SAT)'],
    ['Pretest / Tes Awal', 'Asesmen Diagnostik'],
    ['Kuis / Latihan / Tugas Harian', 'Asesmen Formatif'],
    ['Kriteria Ketuntasan Minimal (KKM)', 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)'],
    ['Kompetensi Inti (KI) & Kompetensi Dasar (KD)', 'Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP)'],
    ['Kelas (I–XII)', 'Fase (A–F)'],
    ['Siswa', 'Murid / Peserta Didik']
  ];

  const DEFAULT_SETTINGS = {
    kktp: 75,
    weightsTengah: { slm: 50, formatif: 0, sts: 50 },
    weightsAkhir: { slm: 50, formatif: 0, sts: 25, akhir: 25 },
    includeFormatif: false,
    bands: [
      { min: 90, label: 'A', name: 'Sangat Baik' },
      { min: 80, label: 'B', name: 'Baik' },
      { min: 70, label: 'C', name: 'Cukup' },
      { min: 0, label: 'D', name: 'Perlu Bimbingan' }
    ],
    diagnosticBands: [
      { min: 80, name: 'Paham Utuh' },
      { min: 60, name: 'Paham Sebagian' },
      { min: 0, name: 'Belum Paham' }
    ],
    decimals: 0
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function toNum(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'object') return toNum(isNum(v.final) ? v.final : v.score);
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function mean(arr) {
    const xs = arr.map(toNum).filter(isNum);
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }
  function round(n, d) {
    if (!isNum(n)) return null;
    const f = Math.pow(10, d || 0);
    return Math.round((n + Number.EPSILON) * f) / f;
  }

  /**
   * Rata-rata tertimbang dari komponen yang ada. Komponen kosong diabaikan dan
   * bobot sisanya dinormalisasi, sehingga nilai sementara tetap bisa dilihat.
   */
  function weighted(parts) {
    let sum = 0, w = 0, missing = [];
    for (const p of parts) {
      if (!(p.weight > 0)) continue;
      if (isNum(p.value)) { sum += p.value * p.weight; w += p.weight; }
      else missing.push(p.key);
    }
    return { value: w > 0 ? sum / w : null, missing, complete: missing.length === 0 && w > 0 };
  }

  function band(score, settings) {
    if (!isNum(score)) return null;
    const bands = (settings && settings.bands) || DEFAULT_SETTINGS.bands;
    const sorted = bands.slice().sort((a, b) => b.min - a.min);
    return sorted.find(b => score >= b.min) || sorted[sorted.length - 1];
  }
  function diagnosticGroup(score, settings) {
    if (!isNum(score)) return null;
    const bands = (settings && settings.diagnosticBands) || DEFAULT_SETTINGS.diagnosticBands;
    const sorted = bands.slice().sort((a, b) => b.min - a.min);
    return (sorted.find(b => score >= b.min) || sorted[sorted.length - 1]).name;
  }
  function ketercapaian(score, settings) {
    if (!isNum(score)) return null;
    const kktp = (settings && settings.kktp) || DEFAULT_SETTINGS.kktp;
    if (score < kktp) return { tuntas: false, label: 'Belum Tercapai', tindak: 'Remedial' };
    if (score >= 90) return { tuntas: true, label: 'Tercapai', tindak: 'Pengayaan' };
    return { tuntas: true, label: 'Tercapai', tindak: '-' };
  }

  function scoreOf(scores, assessmentId, studentId) {
    const m = scores && scores[assessmentId];
    return m ? toNum(m[studentId]) : null;
  }

  /**
   * Hitung rekap satu murid untuk satu mapel.
   * @param ctx {assessments, scores, settings, tps}
   */
  function studentReport(ctx, studentId, studentName) {
    const s = Object.assign({}, DEFAULT_SETTINGS, ctx.settings || {});
    const by = t => ctx.assessments.filter(a => a.type === t);
    const vals = t => by(t).map(a => ({ a, v: scoreOf(ctx.scores, a.id, studentId) }));

    const slmList = vals('slm');
    const formatifList = vals('formatif');
    const slmAvg = mean(slmList.map(x => x.v));
    const formatifAvg = mean(formatifList.map(x => x.v));
    const sts = mean(vals('sts').map(x => x.v));
    const sas = mean(vals('sas').map(x => x.v));
    const sat = mean(vals('sat').map(x => x.v));
    // Sumatif akhir: SAS (semester ganjil) atau SAT (semester genap)
    const akhirKey = s.semester === 'genap' ? 'sat' : 'sas';
    let akhir = akhirKey === 'sat' ? (isNum(sat) ? sat : sas) : (isNum(sas) ? sas : sat);

    const useF = !!s.includeFormatif;
    const wt = s.weightsTengah || DEFAULT_SETTINGS.weightsTengah;
    const wa = s.weightsAkhir || DEFAULT_SETTINGS.weightsAkhir;

    const tengah = weighted([
      { key: 'SLM', value: slmAvg, weight: +wt.slm || 0 },
      { key: 'Formatif', value: formatifAvg, weight: useF ? (+wt.formatif || 0) : 0 },
      { key: 'STS', value: sts, weight: +wt.sts || 0 }
    ]);
    const akhirRes = weighted([
      { key: 'SLM', value: slmAvg, weight: +wa.slm || 0 },
      { key: 'Formatif', value: formatifAvg, weight: useF ? (+wa.formatif || 0) : 0 },
      { key: 'STS', value: sts, weight: +wa.sts || 0 },
      { key: akhirKey.toUpperCase(), value: akhir, weight: +wa.akhir || 0 }
    ]);

    const d = s.decimals || 0;
    const na = round(akhirRes.value, d);
    const nts = round(tengah.value, d);
    return {
      studentId,
      slm: slmList.map(x => x.v),
      slmAvg: round(slmAvg, 2),
      formatifAvg: round(formatifAvg, 2),
      sts: round(sts, 2), sas: round(sas, 2), sat: round(sat, 2),
      akhir: round(akhir, 2), akhirKey,
      nilaiTengah: nts, tengahComplete: tengah.complete, tengahMissing: tengah.missing,
      nilaiAkhir: na, akhirComplete: akhirRes.complete, akhirMissing: akhirRes.missing,
      predikat: band(na, s),
      predikatTengah: band(nts, s),
      ketercapaian: ketercapaian(na, s),
      deskripsi: describe(ctx, studentId, studentName, s)
    };
  }

  /** Rata-rata per TP berdasarkan asesmen sumatif yang ditandai TP tersebut. */
  function tpAverages(ctx, studentId) {
    const res = {};
    for (const a of ctx.assessments) {
      if (!['slm', 'sts', 'sas', 'sat', 'formatif'].includes(a.type)) continue;
      if (a.type === 'formatif' && !(ctx.settings && ctx.settings.includeFormatif)) continue;
      const v = scoreOf(ctx.scores, a.id, studentId);
      if (!isNum(v)) continue;
      for (const tp of a.tpIds || []) (res[tp] = res[tp] || []).push(v);
    }
    const out = {};
    for (const k in res) out[k] = mean(res[k]);
    return out;
  }

  /** Deskripsi capaian otomatis gaya rapor Kurikulum Merdeka. */
  function describe(ctx, studentId, studentName, settings) {
    const kktp = settings.kktp || 75;
    const avgs = tpAverages(ctx, studentId);
    const tpMap = {};
    (ctx.tps || []).forEach(t => { tpMap[t.id] = t; });
    const items = Object.keys(avgs).filter(k => tpMap[k]).map(k => ({ tp: tpMap[k], v: avgs[k] }));
    if (!items.length) return '';
    items.sort((a, b) => b.v - a.v);
    const name = studentName ? 'Ananda ' + studentName.split(' ')[0] : 'Ananda';
    const txt = t => lowerFirst(t.tp.desc || t.tp.code);
    const good = items.filter(x => x.v >= kktp);
    const weak = items.filter(x => x.v < kktp).sort((a, b) => a.v - b.v);
    const parts = [];
    if (good.length) {
      const top = good.slice(0, 2);
      const level = top[0].v >= 90 ? 'sangat baik' : 'baik';
      parts.push(name + ' menunjukkan penguasaan yang ' + level + ' dalam ' + joinId(top.map(txt)) + '.');
    }
    if (weak.length) {
      parts.push((good.length ? 'Perlu bimbingan dalam ' : name + ' perlu bimbingan dalam ') + joinId(weak.slice(0, 2).map(txt)) + '.');
    } else if (items.length > 2) {
      const low = items[items.length - 1];
      parts.push('Perlu peningkatan dalam ' + txt(low) + '.');
    }
    return parts.join(' ');
  }
  function lowerFirst(s) {
    s = String(s || '').trim().replace(/[.]+$/, '');
    if (!s) return s;
    // Jangan ubah singkatan (mis. "IPA", "PPKn")
    if (/^[A-Z]{2,}/.test(s)) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  function joinId(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' dan ' + arr[arr.length - 1];
  }

  /** Statistik sederhana satu asesmen. */
  function stats(values, settings) {
    const xs = values.map(toNum).filter(isNum);
    const kktp = (settings && settings.kktp) || DEFAULT_SETTINGS.kktp;
    if (!xs.length) return { n: 0, avg: null, max: null, min: null, tuntas: 0, belum: 0, persen: null };
    const tuntas = xs.filter(v => v >= kktp).length;
    return {
      n: xs.length,
      avg: round(mean(xs), 2),
      max: Math.max.apply(null, xs),
      min: Math.min.apply(null, xs),
      tuntas, belum: xs.length - tuntas,
      persen: round(tuntas / xs.length * 100, 1)
    };
  }

  /** Peringkat (nilai sama => peringkat sama). */
  function rank(values) {
    const sorted = values.filter(isNum).slice().sort((a, b) => b - a);
    return values.map(v => isNum(v) ? sorted.indexOf(v) + 1 : null);
  }

  return {
    TYPES, TYPE_ORDER, GLOSSARY, DEFAULT_SETTINGS,
    mean, round, toNum, isNum, weighted, band, diagnosticGroup, ketercapaian,
    studentReport, tpAverages, describe, stats, rank
  };
});
