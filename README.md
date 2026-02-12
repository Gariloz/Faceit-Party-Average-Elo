# Faceit Party Average Elo

**Faceit Party Average Elo** is a userscript for Tampermonkey/Greasemonkey that shows the average ELO of players in your FACEIT party and club lobbies, including an optional "+100" value.

## Main Features

* Average ELO of your current party on the matchmaking page (`/matchmaking`)
* Average ELO for each lobby in club party lists
* Two values at once: normal average and **average +100**
* Correct player counting (no duplicates from desktop/mobile markup)
* Separate display of players count: `(5 игроков)`
* Centralized configuration block (`CONFIG`) with font sizes and styles
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

  * Normal average:  
    `1 270`  
    `(5 игроков)`

  * Line `+100`

  * Average with rule `+100`:  
    `1 370`  
    `(5 игроков)`

* Hover over the block to see tooltip with all ELO values and both averages.

## Configuration (short)

All settings are at the top of `Faceit-Party-Average-Elo.user.js` in `CONFIG`.

Main things you may want to change:

* **Update interval**
  * `UPDATE_INTERVAL` – how often to recalc values (ms).

* **Fonts for lobby blocks (clubs)**
  * `LOBBY_BLOCK.VALUE_FONT_SIZE` – size of normal average number.
  * `LOBBY_BLOCK.VALUE_PLAYERS_FONT_SIZE` – size of `(N игроков)` under normal average.
  * `LOBBY_BLOCK.PLUS_VALUE_FONT_SIZE` – size of `+100` average number.
  * `LOBBY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE` – size of `(N игроков)` under `+100`.

* **Fonts for main party block (matchmaking)**
  * `MAIN_PARTY_BLOCK.VALUE_FONT_SIZE`
  * `MAIN_PARTY_BLOCK.VALUE_PLAYERS_FONT_SIZE`
  * `MAIN_PARTY_BLOCK.PLUS_VALUE_FONT_SIZE`
  * `MAIN_PARTY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE`

Other fields in `CONFIG` control colors, paddings and timing and are also documented by comments in the script.

## GitHub

*(Add link when you upload the script, for example)*  
`https://github.com/Gariloz/Faceit-Party-Average-Elo`

---

**Author:** Gariloz


