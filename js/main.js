// The Smiling Influencer – schermen en de overgang tussen deel 1 en deel 2.
// Verhoog ?v= bij elke nieuwe versie (overal hetzelfde nummer), zodat browsers geen oude bestanden mengen.
import { startInfluencer, SPEED } from './influencer.js?v=9';
import { showForest, setReplayHandler } from './forest.js?v=9';
import { state, save } from './store.js?v=9';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, SPEED > 1 ? ms / 3 : ms));

const THEME_COLOR = {
  's-start': '#0b0a0f', 's-live': '#0b0a0f', 's-black': '#000000',
  's-reflect': '#0b0a0f', 's-bridge': '#000000', 's-forest': '#c6ecfb',
};

export function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[id] || '#0b0a0f';
}

/* ---------- Start ---------- */

function openStart() {
  $('btn-to-forest').classList.toggle('hidden', !state.part1Done);
  show('s-start');
}

function begin(useCamera) {
  keepFull = !!fsElement();
  show('s-live');
  startInfluencer({ useCamera, onEnd: blackout, fullscreen: { lost: fullscreenLost, restore: restoreFullscreen } });
}

$('btn-start').addEventListener('click', () => begin(true));
$('btn-start-nocam').addEventListener('click', () => begin(false));
$('btn-to-forest').addEventListener('click', () => { show('s-forest'); showForest(); });

/* ---------- Zwart scherm ---------- */

let blackRun = 0;
async function blackout() {
  const run = ++blackRun;
  ['bl1', 'bl-dot', 'bl2', 'bl-next'].forEach((id) => $(id).classList.remove('in'));
  show('s-black');
  const steps = [[1500, 'bl1'], [3800, 'bl-dot'], [1200, 'bl2'], [4200, 'bl-next']];
  for (const [ms, id] of steps) {
    await sleep(ms);
    if (run !== blackRun) return;
    $(id).classList.add('in');
  }
}
$('bl-next').addEventListener('click', startReflection);

/* ---------- Reflectie ---------- */

const QUESTIONS = [
  { q: 'Hoe voelde het om steeds te moeten glimlachen?', o: ['Leuk', 'Vermoeiend', 'Onnatuurlijk', 'Stressvol'] },
  { q: 'Wat vond je van de positieve reacties?', o: ['Ze voelden fijn', 'Ze motiveerden me', 'Ze voelden leeg', 'Ik lette er niet op'] },
  { q: 'Hoe voelde het toen je negatieve reacties kreeg?', o: ['Het raakte me', 'Ik ging harder mijn best doen', 'Ik werd er onzeker van', 'Het deed me weinig'] },
  { q: 'Had je het gevoel dat je zelf bepaalde wat je deed?', o: ['Totaal niet', 'Een beetje', 'In het begin wel', 'Ja, helemaal'] },
  { q: 'Was het verzamelen van volgers de moeite waard?', o: ['Ja', 'Nee', 'Een beetje', 'Ik weet het niet'] },
];

let qi = 0;
let answers = [];

function startReflection() {
  qi = 0;
  answers = QUESTIONS.map(() => ({ choice: null, text: '' }));
  $('q-card').classList.remove('out');
  show('s-reflect');
  renderQ();
}

function renderQ() {
  const Q = QUESTIONS[qi];
  $('q-dots').innerHTML = QUESTIONS.map((_, i) => `<span class="${i <= qi ? 'on' : ''}"></span>`).join('');
  $('q-num').textContent = `Vraag ${qi + 1} van ${QUESTIONS.length}`;
  $('q-title').textContent = Q.q;
  const opts = $('q-opts');
  opts.innerHTML = '';
  Q.o.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt' + (answers[qi].choice === i ? ' on' : '');
    b.dataset.i = i;
    b.innerHTML = '<i></i><span></span>';
    b.querySelector('span').textContent = o;
    opts.appendChild(b);
  });
  $('q-text').value = answers[qi].text;
  $('q-next').textContent = qi === QUESTIONS.length - 1 ? 'Afronden' : 'Volgende';
  $('s-reflect').querySelector('.reflect-inner').scrollTop = 0;
}

$('q-opts').addEventListener('click', (e) => {
  const b = e.target.closest('.opt');
  if (!b) return;
  const i = Number(b.dataset.i);
  answers[qi].choice = answers[qi].choice === i ? null : i;
  $('q-opts').querySelectorAll('.opt').forEach((el) => el.classList.toggle('on', Number(el.dataset.i) === answers[qi].choice));
});

let advancing = false;
async function advance(keep) {
  if (advancing) return;
  advancing = true;
  if (keep) answers[qi].text = $('q-text').value.trim();
  else answers[qi] = { choice: null, text: '', skipped: true };
  const card = $('q-card');
  card.classList.add('out');
  await new Promise((r) => setTimeout(r, 320));
  if (qi < QUESTIONS.length - 1) {
    qi++;
    renderQ();
    card.classList.remove('out');
  } else {
    finishReflection();
  }
  advancing = false;
}
$('q-next').addEventListener('click', () => advance(true));
$('q-skip').addEventListener('click', () => advance(false));

function finishReflection() {
  state.part1Done = true;
  state.reflection1 = answers.map((a, i) => ({
    vraag: QUESTIONS[i].q,
    keuze: a.choice != null ? QUESTIONS[i].o[a.choice] : null,
    tekst: a.text || '',
  }));
  save();
  bridge();
}

/* ---------- Overgang naar The Memory Forest ---------- */

let bridgeRun = 0;
async function bridge() {
  const run = ++bridgeRun;
  const sec = $('s-bridge');
  sec.classList.remove('dawn');
  ['br1', 'br2', 'br3'].forEach((id) => $(id).classList.remove('in', 'gone'));
  show('s-bridge');
  const go = async (ms) => { await sleep(ms); return run === bridgeRun; };
  if (!(await go(1200))) return; $('br1').classList.add('in');
  if (!(await go(3200))) return; $('br2').classList.add('in');
  if (!(await go(4200))) return; $('br1').classList.remove('in'); $('br2').classList.remove('in');
  if (!(await go(1800))) return; $('br1').classList.add('gone'); $('br2').classList.add('gone'); sec.classList.add('dawn');
  if (!(await go(1400))) return; $('br3').classList.add('in');
}
$('br-go').addEventListener('click', () => { show('s-forest'); showForest({ welcome: true }); });

/* ---------- Volledig scherm ---------- */

const root = document.documentElement;
// Op een iPhone is dit false: daar kan alleen de beginscherm-versie schermvullend.
const canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
// Gestart vanaf het beginscherm. Chrome meldt display-mode fullscreen ook als de knop het scherm vult;
// dat telt niet mee, anders verdwijnen de knoppen en kan je het niet meer uitzetten.
const launchedFull = () => !fsElement() &&
  (window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true);

// Of de speler volledig scherm aan wil hebben. De toestemmingsvraag voor de camera zet het in Chrome
// op Android uit, en de site mag het alleen na een tik weer aanzetten (zie influencer.js).
let keepFull = false;

function requestFull() {
  return root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
}

async function lockPortrait() {
  try { await screen.orientation.lock('portrait'); } catch (e) { /* niet overal mogelijk */ }
}

function fullscreenLost() {
  return keepFull && canFullscreen && !fsElement();
}

// Werkt alleen vlak na een tik van de speler; anders weigert de browser stilletjes.
async function restoreFullscreen() {
  if (!fullscreenLost()) return;
  try { await Promise.race([requestFull(), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { return; }
  if (fsElement()) lockPortrait();
}

async function toggleFullscreen() {
  if (fsElement()) {
    keepFull = false;
    try { await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen()); } catch (e) {}
    return;
  }
  if (canFullscreen) {
    try {
      // Sommige browsers (bijvoorbeeld in andere apps) geven nooit antwoord; wacht maximaal 1,5 seconde.
      await Promise.race([requestFull(), new Promise((r) => setTimeout(r, 1500))]);
      if (fsElement()) {
        keepFull = true;
        await lockPortrait();
        return;
      }
    } catch (e) { /* valt terug op de uitleg hieronder */ }
  }
  showFullscreenHelp();
}

function showFullscreenHelp() {
  const steps = isIOS
    ? ['Tik in Safari op de <b>deelknop</b> (het vierkantje met een pijltje omhoog).', 'Kies <b>Zet op beginscherm</b> en tik op <b>Voeg toe</b>.', 'Open de game via het nieuwe <b>smiley-icoontje</b> op je beginscherm.']
    : ['Tik in je browser op het <b>menu</b> (⋮ rechtsboven).', 'Kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.', 'Open de game via het nieuwe <b>smiley-icoontje</b>.'];
  steps.push('Let op: foto\'s die je in de browser hebt toegevoegd, zie je niet in de beginscherm-versie (en andersom).');
  $('fs-help-steps').innerHTML = steps.map((s) => `<li>${s}</li>`).join('');
  $('fs-help').classList.add('open');
}

function syncFullscreenButtons() {
  const on = !!fsElement();
  // Alleen tonen op telefoons/tablets, en niet als de game al vanaf het beginscherm schermvullend draait.
  const show = isTouch && !launchedFull();
  document.querySelectorAll('[data-fs]').forEach((b) => {
    b.classList.toggle('hidden', !show);
    b.classList.toggle('is-on', on);
    const label = on ? 'Volledig scherm uit' : (b.classList.contains('fs-corner') ? 'Volledig scherm' : 'Volledig scherm aan');
    const span = b.querySelector('span');
    if (span) span.textContent = label;
    else b.setAttribute('aria-label', label); // knop met alleen een icoontje
  });
  document.querySelectorAll('.fs-card').forEach((c) => c.classList.toggle('hidden', !show));
}

document.addEventListener('click', (e) => { if (e.target.closest('[data-fs]')) toggleFullscreen(); });
$('fs-help-ok').addEventListener('click', () => $('fs-help').classList.remove('open'));
$('fs-help').addEventListener('click', (e) => { if (e.target === $('fs-help')) $('fs-help').classList.remove('open'); });
document.addEventListener('fullscreenchange', syncFullscreenButtons);
document.addEventListener('webkitfullscreenchange', syncFullscreenButtons);
syncFullscreenButtons();

/* ---------- Opstarten ---------- */

setReplayHandler(openStart);

const hash = location.hash.replace('#', '');
if (hash === 'zwart') blackout();
else if (hash === 'reflectie') startReflection();
else if (hash === 'overgang') bridge();
else if (hash === 'bos' || state.part1Done) { show('s-forest'); showForest(); }
else openStart();
