// Deel 2 – The Memory Forest
// Een persoonlijk fotodagboek: geen volgers, geen likes, geen scores.
import {
  state, save, currentPeriod, newPeriod, periodEnd, periodLabel, periodWord, fmtRange, fmtDate,
  putPhoto, allPhotos, deletePhoto, clearAll, processImage, uid,
} from './store.js?v=9';
import { openCamera, cameraErrorText } from './camera.js?v=9';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const THEMES = [
  {
    id: 'sporten', name: 'Sporten', icon: '⚽', x: 25, y: 38,
    leaf: ['#6cc77a', '#3f9f5a', '#8fd99a'], accent: '#ff9f43',
    prompts: ['Maak een foto van je sportspullen.', 'Maak een foto van de sport die je doet.', 'Maak een foto van de plek waar je sport.', 'Maak een foto van iets waar je na het sporten blij van wordt.'],
  },
  {
    id: 'vrienden', name: 'Vrienden', icon: '👫', x: 75, y: 35,
    leaf: ['#79cf86', '#46a765', '#a2e3a6'], accent: '#ff8fb8',
    prompts: ['Maak een foto van iets wat je samen met vrienden doet.', 'Maak een foto van een activiteit met vrienden.', 'Maak een foto van een plek waar je graag met vrienden bent.'],
  },
  {
    id: 'huisdieren', name: 'Huisdieren', icon: '🐾', x: 50, y: 64,
    leaf: ['#7dd36f', '#4aa957', '#9be08a'], accent: '#ffd84d',
    prompts: ['Maak een foto van je huisdier.', 'Maak een foto van wat je huisdier aan het doen is.', 'Maak een foto van het lievelingsplekje van je huisdier.', 'Maak een foto van het speelgoed van je huisdier.'],
  },
  {
    id: 'hobbys', name: "Hobby's", icon: '🎨', x: 25, y: 93,
    leaf: ['#62c79a', '#349d73', '#8ad9b5'], accent: '#a98bff',
    prompts: ['Maak een foto van iets dat bij jouw hobby hoort.', 'Maak een foto van iets wat je hebt gemaakt.', 'Maak een foto van de plek waar je je hobby doet.'],
  },
  {
    id: 'eten', name: 'Eten', icon: '🍓', x: 75, y: 90,
    leaf: ['#86d064', '#4f9f3c', '#a8e07f'], accent: '#ff5b4a',
    prompts: ['Maak een foto van wat je vandaag hebt gegeten.', 'Maak een foto van iets wat je zelf hebt gekookt.', 'Maak een foto van je lievelingseten.'],
  },
];
const T = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/* ---------- Bomen tekenen ---------- */

const SCALES = [0.6, 0.66, 0.8, 0.92, 1.04];
const stageOf = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);

const BLOBS = [
  [],
  [[50, 60, 24]],
  [[37, 62, 19], [63, 62, 19], [50, 44, 23]],
  [[29, 64, 18], [71, 64, 18], [50, 64, 21], [37, 42, 20], [63, 42, 20], [50, 25, 17]],
  [[22, 50, 16], [78, 50, 16], [28, 68, 18], [72, 68, 18], [50, 66, 21], [36, 40, 20], [64, 40, 20], [50, 24, 19], [50, 12, 12]],
];

const SLOTS = [
  [],
  [[42, 56], [60, 66]],
  [[34, 64], [66, 62], [50, 40], [50, 66]],
  [[27, 66], [73, 66], [50, 70], [36, 42], [64, 42], [50, 22]],
  [[22, 50], [78, 50], [30, 72], [70, 72], [50, 64], [36, 36], [64, 36], [50, 14], [50, 42]],
];

function treeSVG(th, st) {
  const [l1, l2, l3] = th.leaf;
  let s = `<svg viewBox="0 0 100 120" aria-hidden="true"><ellipse cx="50" cy="118" rx="${14 + st * 5}" ry="3.5" fill="rgba(20,60,25,.22)"/>`;
  if (st === 0) {
    s += `<ellipse cx="50" cy="117" rx="16" ry="4.5" fill="#8a6142"/>
      <path d="M50 116 Q48 100 50 86" stroke="#6f4a2f" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="40" cy="88" rx="11" ry="5.5" fill="${l2}" transform="rotate(-28 40 88)"/>
      <ellipse cx="60" cy="84" rx="12" ry="6" fill="${l1}" transform="rotate(24 60 84)"/>
      <ellipse cx="51" cy="78" rx="5" ry="8" fill="${l3}"/>`;
    return s + '</svg>';
  }
  const w = 3 + st * 1.4;
  s += `<path d="M${50 - w} 118 Q${50 - w * 0.5} 96 ${50 - w * 0.45} 74 L${50 + w * 0.45} 74 Q${50 + w * 0.5} 96 ${50 + w} 118 Z" fill="#8a5a3b"/>`;
  if (st >= 3) {
    s += `<path d="M48 92 Q40 84 33 78" stroke="#8a5a3b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M52 88 Q60 80 67 76" stroke="#8a5a3b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  const blobs = BLOBS[st];
  for (const [x, y, r] of blobs) s += `<circle cx="${x}" cy="${y + 2.5}" r="${r}" fill="${l2}"/>`;
  blobs.forEach(([x, y, r], i) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? l1 : l3}"/>`; });
  for (const [x, y, r] of blobs) s += `<circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.32).toFixed(1)}" r="${(r * 0.45).toFixed(1)}" fill="#fff" opacity=".16"/>`;
  if (st >= 2) {
    const n = st === 2 ? 3 : st === 3 ? 6 : 10;
    for (let i = 0; i < n; i++) {
      const [bx, by, br] = blobs[(i * 3) % blobs.length];
      const a = i * 2.4 + 0.7;
      const x = (bx + Math.cos(a) * br * 0.62).toFixed(1);
      const y = (by + Math.sin(a) * br * 0.62).toFixed(1);
      s += `<circle cx="${x}" cy="${y}" r="2.7" fill="${th.accent}"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="0.9" fill="#fff" opacity=".7"/>`;
    }
  }
  return s + '</svg>';
}

function rot(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 29) - 14;
}

const DECOR = `
  <svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 104 C 44 92, 58 82, 50 70 S 43 58, 50 52" vector-effect="non-scaling-stroke"/></svg>
  <span class="deco" style="left:8%;top:47%">🌼</span>
  <span class="deco" style="left:92%;top:50%">🌷</span>
  <span class="deco" style="left:38%;top:76%">🍄</span>
  <span class="deco" style="left:50%;top:7%">🌼</span>
  <span class="deco" style="left:7%;top:97%">🌿</span>
  <span class="deco" style="left:94%;top:96%">🌿</span>
  <span class="deco" style="left:60%;top:97%">🌼</span>
  <span class="deco bfly" style="left:38%;top:18%">🦋</span>
  <span class="deco bfly b2" style="left:68%;top:66%">🦋</span>`;

function renderScene(el, list, { onTree, hint = false } = {}) {
  el.innerHTML = DECOR;
  for (const th of THEMES) {
    const t = document.createElement('div');
    t.className = 'tree';
    t.dataset.theme = th.id;
    t.style.left = th.x + '%';
    t.style.top = th.y + '%';
    t.style.zIndex = th.y;
    t.innerHTML = `<button class="tree-label" type="button"><span>${th.icon}</span>${esc(th.name)}<span class="cnt">0</span></button>
      <div class="tree-body"><div class="tree-svg"></div><div class="pols"></div></div>`;
    t.addEventListener('click', (e) => {
      const pol = e.target.closest('.pol');
      if (pol) { e.stopPropagation(); openViewer(pol.dataset.id); return; }
      if (onTree) onTree(th, t);
    });
    el.appendChild(t);
    updateTree(t, th, list.filter((p) => p.theme === th.id));
  }
  if (hint) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = '👇 Tik op een boom om te beginnen';
    el.appendChild(h);
  }
}

function updateTree(t, th, list, newId) {
  const n = list.length;
  const st = stageOf(n);
  const prev = t.dataset.st;
  t.dataset.st = st;
  t.style.setProperty('--s', SCALES[st]);
  t.style.setProperty('--st', st);
  t.querySelector('.cnt').textContent = n;
  if (prev !== String(st)) t.querySelector('.tree-svg').innerHTML = treeSVG(th, st);
  const slots = SLOTS[st];
  const shown = list.slice(-slots.length);
  t.querySelector('.pols').innerHTML = shown.map((p, i) =>
    `<button class="pol${p.id === newId ? ' pop' : ''}" type="button" data-id="${esc(p.id)}" aria-label="Bekijk foto"
      style="left:${slots[i][0]}%;top:${((slots[i][1] / 120) * 100).toFixed(2)}%;--r:${rot(p.id)}deg"><img src="${p.thumb}" alt=""></button>`
  ).join('');
}

/* ---------- Gegevens ---------- */

let photos = [];           // foto's van de huidige periode
let byPeriod = new Map();  // alle foto's per periode
const index = new Map();   // alle foto's op id
let inited = false;
let pending = null;        // { theme, prompt, source }
let pendingFile = null;
let previewURL = null;
let viewerURL = null;
let viewerId = null;
let replayHandler = null;

export function setReplayHandler(fn) { replayHandler = fn; }

async function reload() {
  const all = await allPhotos();
  index.clear();
  byPeriod = new Map();
  for (const p of all) {
    index.set(p.id, p);
    if (!byPeriod.has(p.periodId)) byPeriod.set(p.periodId, []);
    byPeriod.get(p.periodId).push(p);
  }
  for (const l of byPeriod.values()) l.sort((a, b) => a.createdAt - b.createdAt);
  photos = byPeriod.get(currentPeriod().id) || [];
}

export async function showForest({ welcome = false } = {}) {
  if (!inited) init();
  await reload();
  renderAll();
  setView('bos');
  if (welcome) setTimeout(() => toast('Welkom in je eigen bos 🌱'), 700);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
}

function renderAll() {
  renderWeekCard();
  renderScene($('scene'), photos, { onTree: (th) => openTreeSheet(th), hint: photos.length === 0 });
  renderTasks();
  renderArchive();
  renderSettings();
}

/* ---------- Navigatie ---------- */

function setView(v) {
  document.querySelectorAll('#s-forest .view').forEach((el) => el.classList.toggle('active', el.id === 'v-' + v));
  document.querySelectorAll('.tabbar [data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'bos') renderWeekCard();
  if (v === 'archief') renderArchive();
  if (v === 'instellingen') renderSettings();
}

/* ---------- Bovenste kaart ---------- */

const FREE_PROMPT = 'Vrije herinnering: iets uit je dag dat je wilt bewaren.';

// Een opdracht is gedaan als er deze periode een foto bij hoort.
function isDone(themeId, prompt) {
  return photos.some((p) => p.theme === themeId && p.prompt === prompt);
}

function openPrompts(th) {
  return th.prompts.filter((pr) => !isDone(th.id, pr));
}

function dailyIdea() {
  const d = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  for (let i = 0; i < THEMES.length; i++) {
    const th = THEMES[(d + i) % THEMES.length];
    const open = openPrompts(th);
    if (open.length) return { th, prompt: open[Math.floor(d / THEMES.length) % open.length] };
  }
  return null; // alles gedaan
}

function renderWeekCard() {
  const p = currentPeriod();
  const end = periodEnd(p);
  const word = periodWord(p);
  const card = $('week-card');
  if (Date.now() >= end) {
    card.classList.add('ended');
    card.innerHTML = `<div class="wc-top"><span class="wc-tag done">🌳 ${cap(word)} voorbij</span><span class="wc-days">${esc(periodLabel(p))}</span></div>
      <h3>Je ${word} zit erop!</h3>
      <p>Kijk terug op wat er in je bos is gegroeid.</p>
      <span class="wc-btn">Bekijk je overzicht →</span>`;
    card.onclick = openOverview;
  } else {
    card.classList.remove('ended');
    const days = Math.ceil((end - Date.now()) / 86400000);
    const top = `<span class="wc-days">${esc(periodLabel(p))} · ${days <= 1 ? 'laatste dag' : `nog ${days} dagen`}</span>`;
    const idea = dailyIdea();
    if (!idea) {
      card.innerHTML = `<div class="wc-top"><span class="wc-tag done">🌳 Alles gedaan</span>${top}</div>
        <h3>Je hebt alle opdrachten van deze ${word} gedaan!</h3>
        <p>Je mag altijd nog vrije herinneringen toevoegen. Tik hier om er een te maken.</p>`;
      card.onclick = openThemePicker;
      return;
    }
    const { th, prompt } = idea;
    card.innerHTML = `<div class="wc-top"><span class="wc-tag">💡 Idee voor vandaag</span>${top}</div>
      <h3>${esc(prompt.replace(/\.$/, ''))} ${th.icon}</h3>
      <p>Geef je <b>${esc(th.name)}</b>-boom een nieuwe herinnering om hem te laten groeien.</p>`;
    card.onclick = () => openTreeSheet(th, prompt);
  }
}

/* ---------- Sheet (paneel van onderen) ---------- */

let sheetClose = null;

function openSheet(html, onClose) {
  $('sheet-content').innerHTML = html;
  $('sheet').classList.add('open');
  $('sheet').querySelector('.sheet-panel').scrollTop = 0;
  sheetClose = onClose || null;
}

function closeSheet() {
  $('sheet').classList.remove('open');
  if (sheetClose) { const f = sheetClose; sheetClose = null; f(); }
}

function selTree(id) {
  document.querySelectorAll('#scene .tree').forEach((t) => t.classList.toggle('sel', t.dataset.theme === id));
}

function countText(n) { return n === 0 ? 'Nog geen herinneringen' : n === 1 ? '1 herinnering' : `${n} herinneringen`; }

function gridHTML(list) {
  if (!list.length) return '<div class="empty-tree">🌱 Nog geen foto\'s. Je eerste herinnering laat deze boom groeien.</div>';
  return `<h4 class="sh-sub">In deze boom</h4><div class="grid">${list.slice().reverse().map((p) =>
    `<button class="g-item" type="button" data-id="${esc(p.id)}"><img src="${p.thumb}" alt=""></button>`).join('')}</div>`;
}

function openTreeSheet(th, prompt) {
  const list = photos.filter((p) => p.theme === th.id);
  const open = openPrompts(th);
  const free = open.length === 0;
  const first = prompt && open.includes(prompt) ? prompt : (free ? FREE_PROMPT : open[Math.floor(Math.random() * open.length)]);
  pending = { theme: th.id, prompt: first, source: 'cam' };
  selTree(th.id);
  const doneCount = th.prompts.length - open.length;
  openSheet(`
    <div class="sh-head"><span class="sh-ic">${th.icon}</span><div><h3>${esc(th.name)}-boom</h3><p>${countText(list.length)}</p></div></div>
    <div class="prompt-card${free ? ' free' : ''}">
      <span class="pc-label">${free ? '🎉 Alle opdrachten gedaan' : `Foto-opdracht${doneCount ? ` · ${doneCount} van ${th.prompts.length} gedaan` : ''}`}</span>
      <p class="pc-text" id="pc-text">${free ? 'Voeg gerust een vrije herinnering toe: iets uit je dag dat je wilt bewaren.' : esc(pending.prompt)}</p>
      ${open.length > 1 ? '<button class="pc-shuffle" type="button" id="pc-shuffle">🔀 Andere opdracht</button>' : ''}
    </div>
    <div class="sh-actions">
      <button class="btn-green" type="button" id="act-cam">📷 Maak een foto</button>
      <button class="btn-soft" type="button" id="act-gal">🖼️ ${isDesktop() ? 'Kies een foto uit je bestanden' : 'Kies uit je galerij'}</button>
    </div>
    <p class="drop-hint">Je kunt een foto ook hierheen slepen, of plakken met Ctrl+V.</p>
    <p class="sh-note">Past dit thema niet bij jou? Geen probleem, je hoeft deze boom niet te vullen.</p>
    ${gridHTML(list)}`, () => selTree(null));
  if ($('pc-shuffle')) {
    $('pc-shuffle').onclick = () => {
      const others = open.filter((x) => x !== pending.prompt);
      pending.prompt = others[Math.floor(Math.random() * others.length)] || pending.prompt;
      $('pc-text').textContent = pending.prompt;
    };
  }
  $('act-cam').onclick = () => pickFile('cam');
  $('act-gal').onclick = () => pickFile('gal');
}

function openReadSheet(th, list, note) {
  openSheet(`
    <div class="sh-head"><span class="sh-ic">${th.icon}</span><div><h3>${esc(th.name)}-boom</h3><p>${countText(list.length)}</p></div></div>
    ${note ? `<p class="sh-note left">${esc(note)}</p>` : ''}
    ${gridHTML(list)}`);
}

function openThemePicker() {
  openSheet(`
    <div class="sh-head"><span class="sh-ic">📸</span><div><h3>Nieuwe herinnering</h3><p>Bij welke boom hoort je foto?</p></div></div>
    <div class="theme-pick">${THEMES.map((th) => `<button type="button" data-theme="${th.id}"><span>${th.icon}</span>${esc(th.name)}</button>`).join('')}</div>`);
  $('sheet-content').querySelector('.theme-pick').onclick = (e) => {
    const b = e.target.closest('[data-theme]');
    if (b) openTreeSheet(T[b.dataset.theme]);
  };
}

/* ---------- Foto toevoegen ---------- */

// Op een computer (muis) maken we de foto met de webcam in de site zelf;
// op een telefoon opent de eigen camera-app van het toestel.
function isDesktop() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function pickFile(source) {
  if (!pending) return;
  pending.source = source;
  if (source === 'cam' && isDesktop() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    openShooter();
    return;
  }
  const inp = source === 'cam' ? $('file-cam') : $('file-gal');
  inp.value = '';
  inp.click();
}

/* ---------- Webcam (computer) ---------- */

let shootStream = null;
let facing = 'user';

async function startShootCam() {
  stopShootCam();
  shootStream = await openCamera(facing, { w: 1280, h: 960 });
  const v = $('sh-video');
  v.srcObject = shootStream;
  v.classList.toggle('mirror', facing === 'user');
  try { await v.play(); } catch (e) {}
}

function stopShootCam() {
  if (shootStream) shootStream.getTracks().forEach((t) => t.stop());
  shootStream = null;
  $('sh-video').srcObject = null;
}

async function openShooter() {
  closeSheet();
  $('sh-prompt').textContent = pending.prompt;
  $('sh-snap').disabled = true;
  $('shoot').classList.add('open');
  try {
    await startShootCam();
    $('sh-snap').disabled = false;
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    $('sh-flip').classList.toggle('invisible', cams.length < 2);
  } catch (e) {
    console.warn('Webcam kon niet starten:', e && e.name);
    closeShooter();
    alert(cameraErrorText(e) + '\n\nJe kunt ook een foto uit je bestanden kiezen, of er een naar het paneel slepen.');
  }
}

function closeShooter() {
  stopShootCam();
  $('shoot').classList.remove('open');
}

async function snap() {
  const v = $('sh-video');
  if (!v.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
  closeShooter();
  if (blob) onFile(new File([blob], 'webcam.jpg', { type: 'image/jpeg' }));
}

/* ---------- Slepen en plakken ---------- */

function imageFrom(list) {
  for (const f of list || []) if (f && f.type && f.type.startsWith('image/')) return f;
  return null;
}

function canDropHere() {
  return pending && $('sheet').classList.contains('open') && $('sheet-content').querySelector('#act-cam');
}

function onFile(file) {
  if (!file || !pending) return;
  closeSheet();
  pendingFile = file;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(file);
  const th = T[pending.theme];
  $('pv-img').src = previewURL;
  $('pv-theme').textContent = `${th.icon} ${th.name}-boom`;
  $('pv-prompt').textContent = pending.prompt;
  $('preview').classList.add('open');
}

function closePreview() {
  $('preview').classList.remove('open');
  if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  $('pv-img').removeAttribute('src');
  pendingFile = null;
}

async function addPhoto() {
  if (!pendingFile || !pending) return;
  const btn = $('pv-add');
  if (btn.disabled) return;
  const job = { ...pending };
  const file = pendingFile;
  btn.disabled = true;
  btn.textContent = 'Even planten…';
  try {
    const { blob, thumb } = await processImage(file);
    const period = currentPeriod();
    const p = { id: uid(), periodId: period.id, theme: job.theme, prompt: job.prompt, createdAt: Date.now(), blob, thumb };
    const stored = await putPhoto(p);
    index.set(p.id, p);
    photos.push(p);
    byPeriod.set(period.id, photos);
    closePreview();
    setView('bos');
    $('scene').querySelector('.hint')?.remove();
    const th = T[p.theme];
    setTimeout(() => growTree(p.theme, p.id), 250);
    toast(stored ? `Je ${th.name}-boom groeit 🌱` : 'Toegevoegd, maar deze browser kan je foto niet blijvend bewaren');
    renderTasks();
  } catch (e) {
    toast('Deze foto kan niet worden geopend. Probeer een andere.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Toevoegen aan boom';
  }
}

function growTree(themeId, newId) {
  const scene = $('scene');
  const t = scene.querySelector(`.tree[data-theme="${themeId}"]`);
  if (!t) return;
  updateTree(t, T[themeId], photos.filter((p) => p.theme === themeId), newId);
  t.classList.remove('grow');
  void t.offsetWidth;
  t.classList.add('grow');
  const r = t.querySelector('.tree-body').getBoundingClientRect();
  const s = scene.getBoundingClientRect();
  const cx = r.left - s.left + r.width / 2;
  const cy = r.top - s.top + r.height * 0.45;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('span');
    p.className = 'leaf-p';
    p.textContent = ['🍃', '✨', '🌸', '🍃'][i % 4];
    const a = (i / 12) * Math.PI * 2;
    const d = 50 + Math.random() * 40;
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
    p.style.setProperty('--dy', (Math.sin(a) * d - 20).toFixed(0) + 'px');
    scene.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

/* ---------- Foto bekijken ---------- */

function openViewer(id) {
  const p = index.get(id);
  if (!p) return;
  if (viewerURL) URL.revokeObjectURL(viewerURL);
  viewerURL = p.blob instanceof Blob ? URL.createObjectURL(p.blob) : null;
  viewerId = id;
  const th = T[p.theme];
  $('vw-img').src = viewerURL || p.thumb;
  $('vw-meta').textContent = `${th.icon} ${th.name} · ${fmtDate(p.createdAt)}`;
  $('vw-prompt').textContent = p.prompt;
  $('vw-del').classList.toggle('invisible', p.periodId !== currentPeriod().id);
  $('viewer').classList.add('open');
}

function closeViewer() {
  $('viewer').classList.remove('open');
  if (viewerURL) { URL.revokeObjectURL(viewerURL); viewerURL = null; }
  $('vw-img').removeAttribute('src');
  viewerId = null;
}

async function deleteCurrent() {
  if (!viewerId) return;
  if (!confirm('Deze foto verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
  const id = viewerId;
  await deletePhoto(id);
  index.delete(id);
  photos = photos.filter((p) => p.id !== id);
  byPeriod.set(currentPeriod().id, photos);
  closeViewer();
  closeSheet();
  renderAll();
  if ($('overview').classList.contains('open')) openOverview();
  toast('Foto verwijderd');
}

/* ---------- Opdrachten ---------- */

function renderTasks() {
  $('tasks-list').innerHTML = THEMES.map((th) => {
    const open = openPrompts(th);
    const done = th.prompts.filter((pr) => !open.includes(pr));
    const thumbFor = (pr) => {
      const p = photos.filter((x) => x.theme === th.id && x.prompt === pr).pop();
      return p ? `<img src="${p.thumb}" alt="">` : '';
    };
    return `<div class="card">
      <h3><span>${th.icon}</span>${esc(th.name)}<span class="card-cnt">${done.length ? `${done.length} van ${th.prompts.length} gedaan` : ''}</span></h3>
      ${open.map((pr) => `<button class="prompt-row" type="button" data-theme="${th.id}" data-prompt="${esc(pr)}"><span>${esc(pr)}</span><span>📷</span></button>`).join('')}
      ${open.length ? '' : '<p class="all-done">🎉 Alle opdrachten van deze boom zijn gedaan. Vrije herinneringen kan je altijd nog toevoegen via de boom.</p>'}
      ${done.map((pr) => `<div class="prompt-done">${thumbFor(pr)}<span>${esc(pr)}</span><b>✓</b></div>`).join('')}
    </div>`;
  }).join('');
}

/* ---------- Archief ---------- */

function renderArchive() {
  const closed = state.periods.filter((p) => p.closed).sort((a, b) => b.start - a.start);
  const el = $('archive-list');
  if (!closed.length) {
    el.innerHTML = `<div class="card empty"><div class="big">🏛️</div><p>Je archief is nog leeg. Als je een periode afsluit, wordt je bos hier bewaard, precies zoals het was.</p></div>`;
    return;
  }
  el.innerHTML = closed.map((p) => {
    const list = byPeriod.get(p.id) || [];
    const thumbs = list.slice(-4);
    const collage = thumbs.length
      ? thumbs.map((x) => `<img src="${x.thumb}" alt="">`).join('')
      : '<span class="collage-empty">🌱</span>';
    return `<button class="card arch-item" type="button" data-id="${p.id}">
      <div class="collage${thumbs.length ? '' : ' none'}">${collage}</div>
      <div class="arch-txt"><h3>${esc(periodLabel(p))} – Mijn herinneringen</h3>
      <p>${fmtRange(p.start, p.closedAt || periodEnd(p))}</p><p>${countText(list.length)}</p></div>
      <span class="chev">›</span></button>`;
  }).join('');
}

function openArchive(id) {
  const p = state.periods.find((q) => q.id === id);
  if (!p) return;
  const list = byPeriod.get(id) || [];
  $('av-title').textContent = `${periodLabel(p)} – Mijn herinneringen`;
  $('av-dates').textContent = `${fmtRange(p.start, p.closedAt || periodEnd(p))} · ${countText(list.length)}`;
  renderScene($('av-scene'), list, {
    onTree: (th) => openReadSheet(th, list.filter((x) => x.theme === th.id), 'Bewaard in je archief.'),
  });
  const q = `Waar ben je deze ${periodWord(p)} het meest trots op?`;
  $('av-refl').innerHTML = `<h3>💭 ${esc(q)}</h3>${p.reflection
    ? `<p class="refl-answer">${esc(p.reflection)}</p>`
    : '<p class="muted">Je hebt hier niets opgeschreven. Dat is ook prima.</p>'}`;
  $('archive-view').classList.add('open');
  $('archive-view').querySelector('.page').scrollTop = 0;
}

/* ---------- Overzicht en nieuwe periode ---------- */

function openOverview() {
  const p = currentPeriod();
  const word = periodWord(p);
  $('ov-title').textContent = `Jouw ${word} in herinneringen`;
  $('ov-dates').textContent = `${periodLabel(p)} · ${fmtRange(p.start, Math.min(Date.now(), periodEnd(p)))}`;
  renderScene($('ov-scene'), photos, {
    onTree: (th) => openReadSheet(th, photos.filter((x) => x.theme === th.id)),
  });
  const rows = THEMES.map((th) => {
    const list = photos.filter((x) => x.theme === th.id);
    if (!list.length) return '';
    return `<div class="ov-row"><div class="ov-row-h"><span>${th.icon} ${esc(th.name)}</span><span>${countText(list.length)}</span></div>
      <div class="strip">${list.map((x) => `<button class="g-item" type="button" data-id="${esc(x.id)}"><img src="${x.thumb}" alt=""></button>`).join('')}</div></div>`;
  }).join('');
  $('ov-trees').innerHTML = rows || `<div class="card"><p class="muted">Je bos is deze ${word} rustig gebleven. Ook dat is helemaal oké. 🌿</p></div>`;
  $('ov-q').textContent = `Waar ben je deze ${word} het meest trots op?`;
  $('ov-text').value = p.draft || '';
  $('ov-finish').textContent = `Sluit je ${word} af en plant een nieuw bos`;
  $('overview').classList.add('open');
  $('overview').querySelector('.page').scrollTop = 0;
}

function closeOverview() {
  const p = currentPeriod();
  p.draft = $('ov-text').value;
  save();
  $('overview').classList.remove('open');
}

function finishPeriod() {
  const p = currentPeriod();
  if (!confirm(`Je ${periodWord(p)} afsluiten? Je bos wordt bewaard in je archief en je begint met een nieuw bos.`)) return;
  p.reflection = $('ov-text').value.trim();
  p.draft = '';
  p.label = periodLabel(p);
  p.closed = true;
  p.closedAt = Date.now();
  newPeriod();
  save();
  $('overview').classList.remove('open');
  photos = [];
  renderAll();
  setView('bos');
  $('scene').classList.add('fresh');
  setTimeout(() => $('scene').classList.remove('fresh'), 1600);
  toast('Je bos is bewaard in je archief 🌳');
}

/* ---------- Instellingen ---------- */

function renderSettings() {
  const p = currentPeriod();
  $('seg-period').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.periodType));
  $('set-period').textContent = `${periodLabel(p)} · ${fmtRange(p.start, periodEnd(p))}`;
}

/* ---------- Toast ---------- */

let toastTimer = 0;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Eenmalig koppelen ---------- */

function init() {
  inited = true;
  const syncDesktop = () => $('app').classList.toggle('desktop', isDesktop());
  syncDesktop();
  window.matchMedia('(hover: hover) and (pointer: fine)').addEventListener?.('change', syncDesktop);

  $('sh-close').addEventListener('click', closeShooter);
  $('sh-snap').addEventListener('click', snap);
  $('sh-flip').addEventListener('click', async () => {
    facing = facing === 'user' ? 'environment' : 'user';
    try { await startShootCam(); } catch (e) { toast('Wisselen van camera lukte niet'); }
  });

  const panel = $('sheet').querySelector('.sheet-panel');
  panel.addEventListener('dragover', (e) => {
    if (!canDropHere()) return;
    e.preventDefault();
    panel.classList.add('drop');
  });
  panel.addEventListener('dragleave', () => panel.classList.remove('drop'));
  panel.addEventListener('drop', (e) => {
    panel.classList.remove('drop');
    if (!canDropHere()) return;
    e.preventDefault();
    const f = imageFrom(e.dataTransfer && e.dataTransfer.files);
    if (f) { pending.source = 'gal'; onFile(f); }
    else toast('Dat is geen foto. Sleep een afbeelding (bijvoorbeeld .jpg of .png).');
  });
  // Voorkom dat de browser een losgelaten foto zelf opent als je net naast het paneel loslaat.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  document.addEventListener('paste', (e) => {
    if (!canDropHere()) return;
    const items = [...((e.clipboardData && e.clipboardData.items) || [])];
    const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
    const f = item && item.getAsFile();
    if (f) { e.preventDefault(); pending.source = 'gal'; onFile(f); }
  });

  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'fab') return openThemePicker();
    if (b.dataset.view) setView(b.dataset.view);
  });

  $('sheet-bd').addEventListener('click', closeSheet);
  $('sheet-content').addEventListener('click', (e) => {
    const g = e.target.closest('.g-item');
    if (g) openViewer(g.dataset.id);
  });

  $('file-cam').addEventListener('change', (e) => onFile(e.target.files[0]));
  $('file-gal').addEventListener('change', (e) => onFile(e.target.files[0]));
  $('pv-close').addEventListener('click', closePreview);
  $('pv-retake').addEventListener('click', () => pickFile(pending ? pending.source : 'cam'));
  $('pv-add').addEventListener('click', addPhoto);
  $('pv-img').addEventListener('error', () => {
    if (!$('preview').classList.contains('open') || !previewURL) return;
    closePreview();
    toast('Deze foto kan niet worden geopend. Probeer een andere.');
  });

  $('vw-close').addEventListener('click', closeViewer);
  $('vw-del').addEventListener('click', deleteCurrent);

  $('tasks-list').addEventListener('click', (e) => {
    const b = e.target.closest('.prompt-row');
    if (b) openTreeSheet(T[b.dataset.theme], b.dataset.prompt);
  });

  $('archive-list').addEventListener('click', (e) => {
    const b = e.target.closest('.arch-item');
    if (b) openArchive(b.dataset.id);
  });
  $('av-close').addEventListener('click', () => $('archive-view').classList.remove('open'));

  $('ov-close').addEventListener('click', closeOverview);
  $('ov-finish').addEventListener('click', finishPeriod);
  $('ov-trees').addEventListener('click', (e) => {
    const g = e.target.closest('.g-item');
    if (g) openViewer(g.dataset.id);
  });

  $('seg-period').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b || b.dataset.v === state.periodType) return;
    state.periodType = b.dataset.v;
    currentPeriod().type = b.dataset.v;
    save();
    renderAll();
    toast(b.dataset.v === 'week' ? 'Je bos werkt nu per week' : 'Je bos werkt nu per maand');
  });
  $('set-overview').addEventListener('click', openOverview);
  $('set-replay').addEventListener('click', () => { if (replayHandler) replayHandler(); });
  $('set-clear').addEventListener('click', async () => {
    if (!confirm('Weet je zeker dat je alles wilt wissen? Al je bossen en foto\'s verdwijnen en dit kan niet ongedaan worden gemaakt.')) return;
    await clearAll();
    location.reload();
  });
}
