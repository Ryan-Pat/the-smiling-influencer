# The Smiling Influencer

Een hybride, interactieve ervaring voor jongeren (12–25 jaar) over smartphonegebruik, sociale erkenning en zelferkenning. Gemaakt voor de telefoon en gehost met GitHub Pages.

**Idea worth spreading:** de sociale erkenning die jongeren op sociale media zoeken, kunnen ze ook bij zichzelf terugvinden.

## De ervaring

1. **The Smiling Influencer** (ongeveer 5 minuten, gescript)
   Je bent een beginnende influencer met 100.000 volgers en je doel is 1.000.000. De frontcamera herkent of je glimlacht. Als je glimlacht krijg je volgers en positieve reacties, als je stopt verlies je ze. De opdrachten worden steeds langer en uiteindelijk is een glimlach nooit meer goed genoeg: je verliest al je volgers.
2. **Het omslagpunt**
   Een zwart scherm, vijf reflectievragen (die je ook mag overslaan) en de overgang naar deel 2.
3. **The Memory Forest** (blijvend)
   Een persoonlijk fotodagboek met vijf themabomen: Huisdieren, Sporten, Eten, Hobby's en Vrienden. Elke foto laat een boom groeien. Er zijn geen volgers, likes of scores. Aan het einde van een week of maand bekijk je een overzicht en beantwoord je één reflectievraag. Daarna gaat het bos naar het archief en plant je een nieuw bos.

## Techniek

- Gewone HTML, CSS en JavaScript-modules, zonder build-stap.
- Glimlachherkenning met [face-api](https://github.com/vladmandic/face-api) 1.7.13 (TinyFaceDetector en het expressiemodel). De bibliotheek en de modellen staan in `vendor/face-api/`, zodat adblockers of schoolnetwerken ze niet kunnen blokkeren. De camerabeelden worden niet opgeslagen of verstuurd.
- Werkt de camera of herkenning niet, dan kan de speler een knop ingedrukt houden als hij glimlacht.
- Foto's worden in IndexedDB op het apparaat zelf bewaard en instellingen in localStorage. Er wordt niets geüpload.

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `index.html` | Alle schermen |
| `css/style.css` | Vormgeving |
| `js/main.js` | Schermwissels, zwart scherm, reflectie, overgang |
| `js/influencer.js` | Deel 1: script, camera, glimlachherkenning, reacties |
| `js/forest.js` | Deel 2: bos, bomen, foto's, overzicht, archief |
| `js/store.js` | Opslag van periodes en foto's |

## Testen

- `?speed=10` achter de URL laat deel 1 tien keer sneller lopen.
- `#bos`, `#reflectie`, `#zwart` en `#overgang` openen direct een bepaald scherm.
- De camera werkt alleen via HTTPS (zoals GitHub Pages) of op `localhost`.

## Nieuwe versie online zetten

GitHub Pages bewaart bestanden 10 minuten in de cache. Verhoog daarom bij elke nieuwe versie het nummer `?v=` overal tegelijk: in `index.html` (stylesheet en `main.js`) en in de `import`-regels van `js/main.js`, `js/influencer.js` en `js/forest.js`. Gebruik overal hetzelfde nummer, anders laadt de browser `store.js` twee keer.
