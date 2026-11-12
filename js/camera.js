// Camera starten, zo robuust mogelijk, met duidelijke meldingen als het niet lukt.

function namedError(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}

const RETRY = ['NotFoundError', 'OverconstrainedError', 'NotReadableError', 'AbortError', 'TypeError'];

// facing: 'user' (voorkant) of 'environment' (achterkant)
export async function openCamera(facing = 'user', size = { w: 640, h: 480 }) {
  if (!window.isSecureContext) throw namedError('InsecureError');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw namedError('UnsupportedError');
  const gum = (video) => navigator.mediaDevices.getUserMedia({ video, audio: false });

  // 1. Met voorkeuren voor richting en formaat.
  try {
    return await gum({ facingMode: facing, width: { ideal: size.w }, height: { ideal: size.h } });
  } catch (e) {
    if (!RETRY.includes(e.name)) throw e;
    console.warn('Camera met voorkeuren lukte niet:', e.name);
  }
  // 2. Zonder voorkeuren.
  let last;
  try {
    return await gum(true);
  } catch (e) {
    if (!RETRY.includes(e.name)) throw e;
    console.warn('Camera zonder voorkeuren lukte niet:', e.name);
    last = e;
  }
  // 3. Elke aangesloten camera apart proberen.
  let cams = [];
  try { cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch (e) {}
  console.warn('Gevonden camera\'s:', cams.length, cams.map((c) => c.label || '(naam verborgen)'));
  for (const c of cams) {
    if (!c.deviceId) continue;
    try { return await gum({ deviceId: { exact: c.deviceId } }); } catch (e) { last = e; }
  }
  throw last || namedError('NotFoundError');
}

export function cameraErrorText(e) {
  const code = (e && e.name) || 'onbekend';
  let msg;
  switch (code) {
    case 'InsecureError':
      msg = 'De camera werkt alleen via een beveiligde verbinding (https) of via localhost op je eigen computer.';
      break;
    case 'UnsupportedError':
      msg = 'Deze browser kan de camera niet gebruiken. Open de site in Chrome, Edge of Safari (niet in de browser van een andere app).';
      break;
    case 'NotAllowedError':
    case 'SecurityError':
      msg = 'Je browser geeft geen toegang tot de camera. Klik op het icoontje links van het webadres, zet Camera op "Toestaan" en probeer het opnieuw.';
      break;
    case 'NotFoundError':
    case 'OverconstrainedError':
      msg = 'Er is geen camera gevonden. Klik op het icoontje links van het webadres en kijk of de camera is toegestaan en de juiste camera is gekozen. Sluit ook andere tabbladen of programma\'s die de camera gebruiken.';
      break;
    case 'NotReadableError':
    case 'AbortError':
      msg = 'Je camera wordt al door een ander programma of tabblad gebruikt (bijvoorbeeld Teams, Discord of Logitech-software). Sluit dat en probeer het opnieuw.';
      break;
    default:
      msg = 'De camera kon niet worden gestart. Probeer het opnieuw.';
  }
  return `${msg} (foutcode: ${code})`;
}
