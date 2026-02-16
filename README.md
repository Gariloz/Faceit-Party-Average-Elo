# Faceit Party Average Elo

**Faceit Party Average Elo** is a userscript for Tampermonkey/Greasemonkey that shows the average ELO of players in your FACEIT party and club lobbies, including an optional "+100" value, ELO difference (max − min), and configurable alerts.

## Main Features

* Average ELO of your current party on the matchmaking page (`/matchmaking`)
* Average ELO for each lobby in club party lists
* Two values at once: normal average and **average +100**
* **Разница эло** (ELO difference): highest − lowest in lobby, shown at the top with color (red if > threshold, green otherwise)
* Correct player counting (no duplicates from desktop/mobile markup)
* Separate display of players count: `(5 игроков)`
* Alerts when ELO difference exceeds threshold (configurable):
  * Sound notification (Faceit-style)
  * Custom on-page banner (large, centered)
  * Browser notification (optional)
* All features toggleable and configurable in `CONFIG`
* Optimized: caching, conditional updates, reduced intervals to avoid lag
* Real-time: MutationObserver reacts to DOM changes (SPA navigation, player joins), values update immediately
* Alerts reset when you navigate to another page and back — no stale cooldown
* Works on all FACEIT pages: `https://*.faceit.com/*`

## Installation

### Option 1: Without Extension (Quick Start)

1. Open any FACEIT page (matchmaking or club parties).
2. Open `Faceit-Party-Average-Elo.user.js` and copy all code.
3. Open browser console (`F12` → Console tab).
4. **Important**: do not paste the metadata block (`// ==UserScript==` ... `// ==/UserScript==`), start from line with `(function() {`.
5. Paste code into the console and press `Enter`.

Script will work until you reload the page.

### Option 2: With Tampermonkey/Greasemonkey (Recommended)

1. Install Tampermonkey / Violentmonkey / Greasemonkey.
2. Open `Faceit-Party-Average-Elo.user.js` in browser and confirm installation.
3. Open FACEIT:
   * `/matchmaking` – party average block appears near your party name,
   * club parties page – average block appears under each lobby.

## Usage

* Just open the page – script runs automatically.
* For each lobby/party you will see:

  * **Разница эло** (ELO difference, max − min) – at the top, large; red if > threshold, green otherwise

  * Normal average:  
    `1 270`  
    `(5 игроков)`

  * Line `+100`

  * Average with rule `+100`:  
    `1 370`  
    `(5 игроков)`

* When ELO difference exceeds the threshold, you get a sound, a large centered banner on the page, and optionally a browser notification.

## Configuration (short)

All settings are at the top of `Faceit-Party-Average-Elo.user.js` in `CONFIG`.

Main things you may want to change:

* **Enable/disable features**
  * `SHOW_LOBBY_ELO_BLOCKS` – show ELO blocks under lobbies in clubs.
  * `SHOW_MAIN_PARTY_ELO_BLOCK` – show ELO block on matchmaking page.
  * `NOTIFY_ON_HIGH_ELO_DIFF` – browser notification when diff > threshold.
  * `NOTIFY_SOUND_ON_HIGH_ELO_DIFF` – sound when diff > threshold.
  * `CUSTOM_ALERT_ON_HIGH_ELO_DIFF` – on-page banner when diff > threshold.

* **ELO difference (разница эло)**
  * `ELO_DIFF_WARNING_THRESHOLD` – threshold (e.g. 800); red if diff > threshold.
  * `ELO_DIFF_NOTIFY_COOLDOWN_MS` – pause between alerts (ms).
  * `ELO_DIFF_NOTIFY_STABILITY_MS` – notify only if high diff persists for this long (ms); avoids false alerts on first load.
  * `ELO_DIFF_SOUND_URL` – URL of sound file.
  * `CUSTOM_ALERT_DURATION_MS` – how long to show banner (0 = until closed).
  * `CUSTOM_ALERT` – `FONT_SIZE`, `MIN_WIDTH`, `PADDING` for the banner.

* **Update interval / performance**
  * `UPDATE_INTERVAL` – how often to recalc values (ms); higher = less load.
  * `DOM_OBSERVER_DEBOUNCE` – debounce for DOM changes (ms).

* **Fonts for lobby blocks (clubs)**
  * `LOBBY_BLOCK.VALUE_FONT_SIZE`, `LOBBY_BLOCK.DIFF_FONT_SIZE`, etc.

* **Fonts for main party block (matchmaking)**
  * `MAIN_PARTY_BLOCK.VALUE_FONT_SIZE`, `MAIN_PARTY_BLOCK.DIFF_FONT_SIZE`, etc.

Other fields in `CONFIG` control colors, paddings and timing and are documented by comments in the script.

## GitHub

https://github.com/Gariloz/Faceit-Party-Average-Elo

---

**Author:** Gariloz


