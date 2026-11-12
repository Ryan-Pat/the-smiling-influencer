// Deel 1 – The Smiling Influencer
// Een gescripte livestream van ongeveer vijf minuten die je niet kunt winnen.

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => Math.max(0, Math.round(n)).toLocaleString('nl-NL');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ?speed=5 in de URL laat het script sneller lopen (handig om te testen).
export const SPEED = Math.min(20, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));

// De herkenning staat in het project zelf, zodat adblockers en schoolnetwerken hem niet tegenhouden.
const FACEAPI_URL = 'vendor/face-api/face-api.js';
const WEIGHTS = 'vendor/face-api/models/';

const GOAL = 1000000;
const START = 100000;
const GAP = 3.5;        // pauze tussen opdrachten (s)
const P3_MIN = 35;      // minimale duur van fase 3 (s)
const P3_END = 268;     // fase 3 eindigt rond dit moment (s)
const COLLAPSE = 12;    // duur van de laatste val naar 0 (s)
const P3_FILL = 6.5;    // zo lang glimlachen voordat het "niet goed genoeg" is

const TASKS = [
  { p: 1, text: 'Glimlach 10 seconden naar de camera.', need: 10, max: 25, bonus: 12000 },
  { p: 1, text: 'Glimlach 20 seconden naar de camera.', need: 20, max: 35, bonus: 18000 },
  { p: 1, text: 'Houd je glimlach 30 seconden vast.', need: 30, max: 45, bonus: 25000 },
  { p: 2, text: 'Blijf 45 seconden glimlachen.', need: 45, max: 60, bonus: 9000, drain: true },
  { p: 2, text: 'Houd je glimlach 60 seconden vast.', need: 60, max: 75, bonus: 6000, drain: true },
  { p: 2, text: 'Je volgers willen dat je blijft lachen!', hold: 25 },
];

const DEMANDS = [
  'Lach breder!',
  'Laat je tanden zien!',
  'Meer enthousiasme!',
  'Je glimlach is niet enthousiast genoeg!',
  'Blijf lachen. Niet stoppen.',
  'Nog breder. Nog echter.',
  'Waarom doe je niet beter je best?',
];

const USERS = ['Sophie_x', 'Milan04', 'LarsB', 'Emma.v', 'Noah_G', 'jade.lifestyle', 'tim_tok', 'zoe.k', 'daan__',
  'fleurtje', 'mo.vlogs', 'lisa_bakt', 'jesse99', 'nina.daily', 'sem.fit', 'yara_x', 'luuk.games', 'iris.art',
  'bo_bo', 'kevin.nl', 'mila.mua', 'ruben_r', 'anouk.travel', 'thijs_fc', 'sara.s', 'gijs_', 'lotte.loves'];
const COLORS = ['#ff6b5b', '#ffc93c', '#3ec5a5', '#9b8cff', '#ff4fa3', '#4aa8ff', '#ff9f43', '#7be0b0'];

const C = {
  hello: ['Hoiii 👋', 'Eindelijk live!! 😍', 'Laat die glimlach zien!', 'Yesss ik ben er 🙌'],
  pos: ['Lekker bezig! 🔥', 'Wat een leuke glimlach!', 'Je bent geweldig!', 'Love this! 😍', 'Blijf zo doorgaan!',
    'Wow, wat straal je ✨', 'Jij maakt mijn dag goed 💛', 'Die glimlach 😭💕', 'Icoon 👑', 'Zo blij dat ik je volg!',
    '100% vibes 💯', 'Jij bent echt de leukste'],
  mild: ['Hallo? Lach eens 😅', 'Waarom lach je niet?', 'Waar is je glimlach?', 'Hmm… saai', 'Kom op, lachen!'],
  demand: ['Meer! 🔥', 'Langer!!', 'Niet stoppen hoor 👀', 'Is dat alles?', 'Blijven lachen!', 'We willen meer!',
    'Oké… maar nu langer', 'Nog even volhouden 😤'],
  neg: ['Waarom lach je niet?', 'Je doet zo nep.', 'Niet goed genoeg.', 'Wat is er met je gebeurd?',
    'Je was vroeger veel leuker.', 'Unfollow.', 'Saai 🥱', 'Wat een flauwe stream'],
  p3: ['Je glimlach is niet enthousiast genoeg!', 'We verwachten meer van je!', 'Waarom doe je niet beter je best?',
    'Dit is niet goed genoeg!', 'Je doet zo nep.', 'Je was vroeger veel leuker.', 'Wat is er met je gebeurd?',
    'Nep 🤡', 'Lach dan ECHT', 'Zo geforceerd 😬', 'Unfollowed.', 'Niemand vindt dit leuk', 'Is dit het nou?', 'Doei 👋'],
};

const MOUTH = {
  smile: 'M30 58 Q50 80 70 58',
  flat: 'M34 64 Q50 64 66 64',
  sad: 'M34 69 Q50 57 66 69',
};

let S = null;
let faceapiPromise = null;

/* ---------- Camera en glimlachherkenning ---------- */

function loadFaceApi() {
  if (!faceapiPromise) {
    faceapiPromise = new Promise((res, rej) => {
      if (window.faceapi) return res(window.faceapi);
      const s = document.createElement('script');
      s.src = FACEAPI_URL;
      s.async = true;
      s.onload = () => (window.faceapi ? res(window.faceapi) : rej(new Error('faceapi')));
      s.onerror = () => rej(new Error('script'));
      document.head.appendChild(s);
    }).then(async (fa) => {
      // Gebruik de grafische kaart als dat kan, anders de processor.
      try {
        if (!(await fa.tf.setBackend('webgl'))) throw new Error('webgl');
      } catch (e) {
        await fa.tf.setBackend('cpu');
      }
      await fa.tf.ready();
      await fa.nets.tinyFaceDetector.loadFromUri(WEIGHTS + 'tiny_face_detector_model-weights_manifest.json');
      await fa.nets.faceExpressionNet.loadFromUri(WEIGHTS + 'face_expression_model-weights_manifest.json');
      return fa;
    });
    faceapiPromise.catch(() => { faceapiPromise = null; });
  }
  return faceapiPromise;
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

function namedError(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}

function cameraErrorText(e) {
  switch (e && e.name) {
    case 'InsecureError':
      return 'De camera werkt alleen via een beveiligde verbinding (https) of via localhost op je eigen computer.';
    case 'UnsupportedError':
      return 'Deze browser kan de camera niet gebruiken. Open de site in Chrome, Edge of Safari.';
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Je browser geeft geen toegang tot de camera. Klik op het camera-icoontje in de adresbalk, kies "Toestaan" en probeer het opnieuw.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Er is geen camera gevonden. Controleer of je camera is aangesloten en probeer het opnieuw.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Je camera wordt al door een ander programma gebruikt (bijvoorbeeld Discord, Teams of Logitech-software). Sluit dat programma en probeer het opnieuw.';
    default:
      return 'De camera kon niet worden gestart. Probeer het opnieuw of speel zonder camera.';
  }
}

async function startCamera() {
  if (!window.isSecureContext) throw namedError('InsecureError');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw namedError('UnsupportedError');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (e) {
    // Sommige webcams weigeren de voorkeursinstellingen; probeer dan de eenvoudigste vraag.
    if (!['NotFoundError', 'OverconstrainedError', 'NotReadableError', 'AbortError'].includes(e.name)) throw e;
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
  S.stream = stream;
  const v = $('video');
  v.srcObject = stream;
  try { await v.play(); } catch (e) { /* autoplay wordt meestal toegestaan omdat de video gedempt is */ }
  $('cam').classList.add('has-video');
}

function stopCamera(st = S) {
  if (!st) return;
  st.detecting = false;
  if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
  st.stream = null;
  const v = $('video');
  v.srcObject = null;
}

function startDetect() {
  const me = S;
  me.detecting = true;
  // Twee formaten: 224 is snel, 320 vindt ook gezichten die verder weg of kleiner in beeld zijn.
  const sizes = [224, 320].map((inputSize) => new me.fa.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.3 }));
  let si = 0;
  const tick = async () => {
    if (!me.detecting) return;
    const v = $('video');
    if (v.readyState >= 2 && v.videoWidth) {
      try {
        const r = await me.fa.detectSingleFace(v, sizes[si]).withFaceExpressions();
        if (r) {
          me.face = true;
          me.lostAt = 0;
          me.happy = me.happy * 0.35 + r.expressions.happy * 0.65;
        } else {
          me.happy *= 0.5;
          si = (si + 1) % sizes.length;
          if (!me.lostAt) me.lostAt = performance.now();
          if (performance.now() - me.lostAt > 900) me.face = false;
        }
      } catch (e) { /* één mislukte meting is niet erg */ }
    }
    setTimeout(tick, 80);
  };
  tick();
}

function isSmiling() {
  if (S.mode === 'manual') return S.held;
  if (!S.face) { S.sm = false; return false; }
  if (!S.sm && S.happy > 0.4) S.sm = true;
  else if (S.sm && S.happy < 0.2) S.sm = false;
  return S.sm;
}

/* ---------- Overlay (laden, uitleg, aftellen) ---------- */

// buttons: één tekst of een lijst; de belofte geeft de index van de gekozen knop terug.
function overlay(kind, text, buttons) {
  const o = $('cam-overlay');
  o.classList.remove('hide');
  o.innerHTML = '';
  if (kind === 'spin') o.insertAdjacentHTML('beforeend', '<div class="spinner"></div>');
  if (kind === 'count') {
    o.insertAdjacentHTML('beforeend', `<p class="count-pre">Je gaat live over</p><div class="count">${text}</div>`);
    return Promise.resolve();
  }
  const p = document.createElement('p');
  p.textContent = text;
  o.appendChild(p);
  if (!buttons) return Promise.resolve();
  const list = Array.isArray(buttons) ? buttons : [buttons];
  const wrap = document.createElement('div');
  wrap.className = 'overlay-btns';
  o.appendChild(wrap);
  return new Promise((res) => {
    list.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === 0 ? 'btn-primary small' : 'btn-link';
      b.textContent = label;
      b.onclick = () => res(i);
      wrap.appendChild(b);
    });
  });
}

function hideOverlay() { $('cam-overlay').classList.add('hide'); }

async function toManual(msg) {
  S.mode = 'manual';
  $('s-live').classList.add('manual');
  await overlay('info', msg, 'Ik snap het');
}

/* ---------- Start ---------- */

export async function startInfluencer({ useCamera, onEnd }) {
  stopAll();
  S = {
    mode: useCamera ? 'camera' : 'manual', onEnd,
    followers: START, shownF: -1, t: 0, phase: 1, step: 'pre', idx: -1, task: null,
    progress: 0, taskT: 0, gapT: 0, gapOk: true, p3: null, col: null,
    happy: 0, face: false, sm: false, held: false, lostAt: 0,
    running: false, stream: null, detecting: false, fa: null,
    cT: 2, hT: 0, dAcc: 0, dT: 0, wasSm: false, lastT: 0, statusKey: '', timers: [], wake: null,
  };
  const me = S;
  resetUI();

  if (useCamera) {
    for (;;) {
      overlay('spin', 'Je camera wordt gestart…');
      try { await startCamera(); break; } catch (e) {
        console.warn('Camera kon niet starten:', e && e.name, e && e.message);
        if (S !== me) return;
        const choice = await overlay('info', cameraErrorText(e), ['Opnieuw proberen', 'Speel zonder camera']);
        if (S !== me) return;
        if (choice === 1) {
          await toManual('Geen probleem: houd de groene knop ingedrukt zolang je glimlacht.');
          break;
        }
      }
    }
    if (S !== me) return;
    if (S.mode === 'camera') {
      overlay('spin', 'Glimlachherkenning wordt geladen…');
      try {
        S.fa = await withTimeout(loadFaceApi(), 30000);
        if (S !== me) return;
        startDetect();
        overlay('spin', 'Kijk recht in de camera…');
        const t0 = performance.now();
        while (S === me && !S.face && performance.now() - t0 < 8000) await sleep(150);
      } catch (e) {
        console.warn('Glimlachherkenning kon niet laden:', e && e.message);
        if (S !== me) return;
        await toManual(`De glimlachherkenning kon niet worden geladen (${(e && e.message) || 'onbekende fout'}). Herlaad de pagina om het opnieuw te proberen. Voor nu: houd de groene knop ingedrukt zolang je glimlacht.`);
      }
    }
  } else {
    await toManual('Je speelt zonder camera. Houd de groene knop ingedrukt zolang je glimlacht.');
  }
  if (S !== me) return;

  for (const n of [3, 2, 1]) {
    overlay('count', n);
    await sleep(900);
    if (S !== me) return;
  }
  hideOverlay();

  try { S.wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* niet ondersteund */ }

  S.running = true;
  nextTask();
  C.hello.forEach((txt, i) => S.timers.push(setTimeout(() => comment(txt, 'pos'), 300 + i * 450)));
  S.lastT = performance.now();
  requestAnimationFrame(loop);
}

function stopAll() {
  if (!S) return;
  S.running = false;
  S.timers.forEach(clearTimeout);
  stopCamera(S);
  try { S.wake?.release(); } catch (e) {}
  S = null;
}

/* ---------- Spellus ---------- */

function loop(now) {
  if (!S || !S.running) return;
  const me = S;
  const rdt = Math.min(0.25, (now - S.lastT) / 1000);
  S.lastT = now;
  const dt = rdt * SPEED;
  S.t += dt;
  const sm = isSmiling();
  step(dt, sm);
  if (S !== me) return;
  fx(rdt, sm);
  render(sm);
  S.wasSm = sm;
  requestAnimationFrame(loop);
}

function add(d) {
  const before = S.followers;
  S.followers = Math.max(0, S.followers + d);
  S.dAcc += S.followers - before;
}

function base(dt, sm) {
  let d;
  if (S.phase === 1) d = sm ? rand(1800, 3200) : -rand(400, 900);
  else d = sm ? rand(500, 1300) - 200 : -rand(2800, 4800);
  add(d * dt);
}

function step(dt, sm) {
  switch (S.step) {
    case 'task': {
      const tk = S.task;
      S.taskT += dt;
      base(dt, sm);
      if (tk.hold) {
        if (S.taskT >= tk.hold) startP3();
        break;
      }
      if (sm) S.progress += dt;
      else if (tk.drain) S.progress = Math.max(0, S.progress - dt * 1.5);
      if (S.progress >= tk.need) complete();
      else if (S.taskT >= tk.max) fail();
      break;
    }
    case 'gap':
      base(dt, sm);
      S.gapT -= dt;
      if (S.gapT <= 0) nextTask();
      break;
    case 'p3':
      p3step(dt, sm);
      break;
    case 'collapse': {
      S.col.t += dt;
      const v = Math.min(1, S.col.t / COLLAPSE);
      add(S.col.F0 * (1 - v * v) - S.followers);
      if (v >= 1) endStream();
      break;
    }
  }
}

function nextTask() {
  S.idx++;
  if (S.idx >= TASKS.length) return startP3();
  S.task = TASKS[S.idx];
  let label = S.idx === 0 ? 'Je eerste opdracht' : 'Nieuwe opdracht';
  if (S.task.p !== S.phase) {
    S.phase = S.task.p;
    $('s-live').classList.add('p2');
    label = 'De lat ligt hoger';
    sys('Je volgers verwachten nu meer van je…');
  }
  S.progress = 0;
  S.taskT = 0;
  S.step = 'task';
  setTask(label, S.task.text, '', S.phase === 1 ? '🏅' : '⚡');
}

function complete() {
  const tk = S.task;
  S.followers += tk.bonus;
  showDelta(tk.bonus, true);
  S.step = 'gap';
  S.gapT = GAP;
  S.gapOk = true;
  setTask('Opdracht voltooid! 🎉', `+${fmt(tk.bonus)} volgers`, 'done', '🎉');
  if (S.phase === 1) for (let i = 0; i < 3; i++) later(() => comment(pick(C.pos), 'pos'), i * 300);
  else {
    later(() => comment(pick(C.pos), 'pos'), 0);
    later(() => comment('Oké… maar nu langer', 'dem'), 400);
    later(() => comment(pick(C.demand), 'dem'), 800);
  }
  vibrate(30);
}

function fail() {
  const pen = S.phase === 1 ? 6000 : 15000;
  S.followers = Math.max(0, S.followers - pen);
  showDelta(-pen, true);
  S.step = 'gap';
  S.gapT = GAP;
  S.gapOk = false;
  setTask('Tijd is om ⏰', 'Je volgers zijn teleurgesteld…', 'fail', '⏰');
  later(() => comment(pick(C.neg), 'neg'), 0);
  later(() => comment(pick(C.neg), 'neg'), 400);
  vibrate(60);
}

function startP3() {
  S.step = 'p3';
  S.phase = 3;
  const live = $('s-live');
  live.classList.remove('p2');
  live.classList.add('p3');
  S.p3 = { start: S.t, dur: Math.max(P3_MIN, P3_END - S.t), F0: S.followers, pen: 0, di: 0, dT: 0, prog: 0 };
  setTask('Je volgers eisen meer', DEMANDS[0], 'flash', '⚠️');
  sys('Je volgers zijn niet meer tevreden…');
}

function p3step(dt, sm) {
  const P = S.p3;
  const u = Math.min(1, (S.t - P.start) / P.dur);
  if (!sm) P.pen += rand(2000, 3500) * dt;
  const target = Math.max(0, P.F0 * (1 - 0.72 * Math.pow(u, 1.6)) - P.pen);
  if (target < S.followers) add(target - S.followers);

  P.dT += dt;
  if (P.dT >= 9) {
    P.dT = 0;
    P.di = (P.di + 1) % DEMANDS.length;
    setTask('Je volgers eisen meer', DEMANDS[P.di], 'flash', '⚠️');
  }

  if (sm) P.prog += dt;
  else P.prog = Math.max(0, P.prog - dt * 2);
  if (P.prog >= P3_FILL) {
    P.prog = 0;
    P.pen += 4000;
    reject();
  }

  if (u >= 1 || S.followers <= 0) startCollapse();
}

function reject() {
  $('task-label').textContent = 'Niet goed genoeg ✗';
  const me = S;
  later(() => { if (S === me && S.step === 'p3') $('task-label').textContent = 'Je volgers eisen meer'; }, 1600);
  for (let i = 0; i < 3; i++) later(() => comment(pick(C.p3), 'neg'), i * 220);
  const live = $('s-live');
  live.classList.remove('shake');
  void live.offsetWidth;
  live.classList.add('shake');
  vibrate([40, 40, 40]);
}

function startCollapse() {
  S.step = 'collapse';
  S.col = { t: 0, F0: S.followers };
  setTask('Er gaat iets mis…', 'Je verliest al je volgers.', 'fail', '📉');
  vibrate([80, 60, 80]);
}

function endStream() {
  S.step = 'end';
  S.followers = 0;
  $('live-pill').classList.add('offline');
  $('live-word').textContent = 'OFFLINE';
  $('status').classList.add('hidden');
  setTask('Stream beëindigd', 'Je hebt 0 volgers.', 'fail', '⬛');
  const me = S;
  later(() => $('comments').classList.add('gone'), 1800);
  later(() => $('s-live').classList.add('fade-black'), 3200);
  later(() => {
    if (S !== me) return;
    const done = S.onEnd;
    stopAll();
    done && done();
  }, 6500);
}

/* ---------- Effecten: reacties, hartjes, plus/min ---------- */

function later(fn, ms) { S.timers.push(setTimeout(fn, ms)); }

function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

function interval() {
  if (S.step === 'collapse') return 0.32;
  if (S.phase === 3) return 0.6;
  if (S.phase === 2) return 1.1;
  return 1.6;
}

function fx(rdt, sm) {
  if (S.step !== 'end') {
    S.cT -= rdt;
    if (sm !== S.wasSm && S.phase < 3 && S.step !== 'collapse') S.cT = Math.min(S.cT, sm ? 0.5 : 0.35);
    if (S.cT <= 0) {
      postComment(sm);
      S.cT = interval() * rand(0.7, 1.3);
    }
  }
  if (sm && S.phase < 3 && (S.step === 'task' || S.step === 'gap')) {
    S.hT -= rdt;
    if (S.hT <= 0) { heart(); S.hT = S.phase === 1 ? 0.35 : 0.6; }
  }
  S.dT += rdt;
  if (S.dT >= 0.9) {
    if (Math.abs(S.dAcc) >= 50) showDelta(S.dAcc);
    S.dAcc = 0;
    S.dT = 0;
  }
}

function postComment(sm) {
  if (S.step === 'collapse') {
    if (Math.random() < 0.6) return sys(`${pick(USERS)} volgt je niet meer`);
    return comment(pick(C.p3), 'neg');
  }
  if (S.phase === 1) return comment(pick(sm ? C.pos : C.mild), sm ? 'pos' : 'neg');
  if (S.phase === 2) {
    if (!sm) return comment(pick(C.neg), 'neg');
    return Math.random() < 0.45 ? comment(pick(C.pos), 'pos') : comment(pick(C.demand), 'dem');
  }
  if (Math.random() < 0.18) return sys(`${pick(USERS)} volgt je niet meer`);
  comment(pick(Math.random() < 0.2 ? C.demand : C.p3), 'neg');
}

function comment(text, kind, user = pick(USERS)) {
  const list = $('comments');
  const el = document.createElement('div');
  el.className = 'cmt ' + kind;
  const av = document.createElement('span');
  av.className = 'av';
  av.style.background = COLORS[user.charCodeAt(0) % COLORS.length];
  av.textContent = user[0].toUpperCase();
  const b = document.createElement('span');
  b.className = 'cmt-b';
  const name = document.createElement('b');
  name.textContent = user;
  b.append(name, document.createTextNode(text));
  el.append(av, b);
  list.appendChild(el);
  while (list.children.length > 7) list.firstChild.remove();
}

function sys(text) {
  const list = $('comments');
  const el = document.createElement('div');
  el.className = 'cmt sys';
  const b = document.createElement('span');
  b.className = 'cmt-b';
  b.textContent = text;
  el.appendChild(b);
  list.appendChild(el);
  while (list.children.length > 7) list.firstChild.remove();
}

function heart() {
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = pick(['❤️', '💛', '😍', '🔥', '💖', '✨']);
  h.style.setProperty('--dx', rand(-40, 10).toFixed(0) + 'px');
  h.style.right = rand(4, 24).toFixed(0) + 'px';
  $('hearts').appendChild(h);
  setTimeout(() => h.remove(), 2300);
}

function showDelta(n, big = false) {
  const d = document.createElement('span');
  d.className = 'delta ' + (n >= 0 ? 'up' : 'down') + (big ? ' big' : '');
  d.textContent = (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
  $('deltas').appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

/* ---------- Weergave ---------- */

function setTask(label, text, cls, icon) {
  $('task-label').textContent = label;
  $('task-text').textContent = text;
  $('task-ic').textContent = icon || '🏅';
  const t = $('task');
  t.className = 'task';
  void t.offsetWidth;
  t.classList.add('flash');
  if (cls) t.classList.add(cls);
}

const RING = 125.66;

function setRing(frac, num) {
  $('ring-fg').style.strokeDashoffset = (RING * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1);
  const n = $('ring-num');
  if (n.textContent !== num) n.textContent = num;
}

function render(sm) {
  const f = Math.round(S.followers);
  if (f !== S.shownF) {
    S.shownF = f;
    $('followers').textContent = fmt(f);
    $('goalbar').style.width = Math.min(100, (f / GOAL) * 100).toFixed(2) + '%';
  }

  let frac = 0, num = '0';
  if (S.step === 'task') {
    if (S.task.hold) { frac = 1 - S.taskT / S.task.hold; num = Math.max(0, Math.ceil(S.task.hold - S.taskT)) + 's'; }
    else { frac = S.progress / S.task.need; num = Math.max(0, Math.ceil(S.task.need - S.progress)) + 's'; }
  } else if (S.step === 'gap') { frac = 1; num = S.gapOk ? '✓' : '✗'; }
  else if (S.step === 'p3') { frac = S.p3.prog / P3_FILL; num = Math.round(frac * 100) + '%'; }
  setRing(frac, num);

  if (S.step !== 'end') {
    let cls, txt;
    if (S.mode === 'camera' && !S.face) { cls = ''; txt = 'Geen gezicht: kijk recht in de camera'; }
    else if (S.phase === 3 || S.step === 'collapse') { cls = sm ? 'meh' : 'bad'; txt = sm ? 'Glimlach niet goed genoeg' : 'Geen glimlach (−volgers)'; }
    else { cls = sm ? 'ok' : 'bad'; txt = sm ? 'Glimlach gedetecteerd (+volgers)' : 'Geen glimlach (−volgers)'; }
    const key = cls + txt;
    if (key !== S.statusKey) {
      S.statusKey = key;
      const st = $('status');
      st.className = 'status ' + cls;
      $('status-text').textContent = txt;
    }
  }

  if (S.mode === 'camera') {
    const pct = S.face ? Math.round(Math.min(1, S.happy) * 100) : 0;
    if (pct !== S.meterPct) {
      S.meterPct = pct;
      $('meter-fill').style.width = pct + '%';
    }
  }

  const mouth = sm ? MOUTH.smile : (S.phase >= 3 ? MOUTH.sad : MOUTH.flat);
  const m = $('face-mouth');
  if (m.getAttribute('d') !== mouth) m.setAttribute('d', mouth);
}

function resetUI() {
  const live = $('s-live');
  live.classList.remove('p2', 'p3', 'shake', 'fade-black', 'manual');
  $('live-pill').classList.remove('offline');
  $('live-word').textContent = 'LIVE';
  $('followers').textContent = fmt(START);
  $('goalbar').style.width = (START / GOAL * 100) + '%';
  $('comments').innerHTML = '';
  $('comments').classList.remove('gone');
  $('hearts').innerHTML = '';
  $('deltas').innerHTML = '';
  $('cam').classList.remove('has-video');
  const st = $('status');
  st.className = 'status';
  st.classList.remove('hidden');
  $('status-text').textContent = 'Bijna live…';
  $('meter-fill').style.width = '0%';
  $('face-mouth').setAttribute('d', MOUTH.flat);
  setTask('Maak je klaar', 'Je eerste livestream begint zo.', '', '🎬');
  setRing(0, '–');
}

/* ---------- Knop voor spelen zonder camera ---------- */

(function bindSmileButton() {
  const btn = $('smile-btn');
  const down = (e) => {
    e.preventDefault();
    if (S) S.held = true;
    btn.classList.add('held');
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const up = () => {
    if (S) S.held = false;
    btn.classList.remove('held');
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, up));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && S && S.mode === 'manual') { e.preventDefault(); S.held = true; btn.classList.add('held'); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && S) { S.held = false; btn.classList.remove('held'); }
  });
})();
