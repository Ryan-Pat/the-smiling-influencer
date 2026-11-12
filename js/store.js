// Opslag: instellingen en periodes in localStorage, foto's in IndexedDB.
// Alles blijft op het apparaat van de speler; er wordt niets geüpload.

const KEY = 'behind-the-smile-v1';

function defaults() {
  return { part1Done: false, reflection1: null, periodType: 'week', periods: [], currentId: null };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return { ...defaults(), ...s };
  } catch (e) { /* geen opslag beschikbaar */ }
  return defaults();
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* privémodus */ }
}

/* ---------- Periodes ---------- */

export function newPeriod() {
  const p = {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: state.periodType,
    start: Date.now(),
    closed: false,
    closedAt: null,
    reflection: '',
    draft: '',
    label: null,
  };
  state.periods.push(p);
  state.currentId = p.id;
  save();
  return p;
}

export function currentPeriod() {
  const p = state.periods.find((q) => q.id === state.currentId && !q.closed);
  return p || newPeriod();
}

export function periodEnd(p) {
  const d = new Date(p.start);
  if (p.type === 'month') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 7);
  return d.getTime();
}

export function periodWord(p) {
  return p.type === 'month' ? 'maand' : 'week';
}

export function periodLabel(p) {
  if (p.label) return p.label;
  if (p.type === 'week') {
    const n = state.periods.filter((q) => q.type === 'week' && q.start <= p.start).length;
    return 'Week ' + n;
  }
  const d = new Date(p.start);
  const m = d.toLocaleDateString('nl-NL', { month: 'long' });
  const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
  return m.charAt(0).toUpperCase() + m.slice(1) + y;
}

export function fmtRange(a, b) {
  const A = new Date(a), B = new Date(b);
  const o = { day: 'numeric', month: 'short' };
  return `${A.toLocaleDateString('nl-NL', o)} – ${B.toLocaleDateString('nl-NL', { ...o, year: 'numeric' })}`;
}

export function fmtDate(t) {
  return new Date(t).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' });
}

/* ---------- Foto's (IndexedDB) ---------- */

const mem = new Map(); // noodopslag als IndexedDB niet werkt
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('geen indexedDB'));
      const r = indexedDB.open('behind-the-smile', 1);
      r.onupgradeneeded = () => {
        const st = r.result.createObjectStore('photos', { keyPath: 'id' });
        st.createIndex('period', 'periodId');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    dbp.catch(() => {});
  }
  return dbp;
}

function txDone(t) {
  return new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export async function putPhoto(p) {
  try {
    const d = await db();
    const t = d.transaction('photos', 'readwrite');
    t.objectStore('photos').put(p);
    await txDone(t);
    return true;
  } catch (e) {
    mem.set(p.id, p);
    return false;
  }
}

export async function allPhotos() {
  let list = [];
  try {
    const d = await db();
    list = await new Promise((res, rej) => {
      const r = d.transaction('photos').objectStore('photos').getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  } catch (e) { /* alleen noodopslag */ }
  return list.concat([...mem.values()]);
}

export async function deletePhoto(id) {
  mem.delete(id);
  try {
    const d = await db();
    const t = d.transaction('photos', 'readwrite');
    t.objectStore('photos').delete(id);
    await txDone(t);
  } catch (e) { /* niets */ }
}

export async function clearAll() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  mem.clear();
  try {
    const d = await db();
    const t = d.transaction('photos', 'readwrite');
    t.objectStore('photos').clear();
    await txDone(t);
  } catch (e) {}
}

/* ---------- Afbeeldingen verkleinen ---------- */

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('afbeelding')); };
    img.src = url;
  });
}

export async function processImage(file) {
  const img = await loadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;

  const s = Math.min(1, 1600 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const cx = c.getContext('2d');
  // Doorzichtige PNG's krijgen een witte achtergrond, anders worden ze zwart als JPEG.
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, c.width, c.height);
  cx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));

  const m = Math.min(w, h);
  const t = document.createElement('canvas');
  t.width = t.height = 240;
  const tx = t.getContext('2d');
  tx.fillStyle = '#fff';
  tx.fillRect(0, 0, 240, 240);
  tx.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, 240, 240);
  const thumb = t.toDataURL('image/jpeg', 0.8);

  return { blob, thumb };
}

export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
