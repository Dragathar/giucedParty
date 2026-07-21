# 🎉 giucedParty

Browser-Erweiterung für synchronisiertes Videoschauen mit Freunden + Chat.

Teleparty-Klon mit giuced-Branding. Unterstützt YouTube, Netflix, Disney+, HBO Max, Amazon Prime, Twitch, Vimeo, Hulu, Paramount+, Peacock.

## Features

- **Synchronisierte Wiedergabe** — Play/Pause/Seek wird an alle Teilnehmer übertragen
- **Chat-Sidebar** — direkt neben dem Video, mit Avatars und Farben
- **Party-Code teilen** — einfacher Code zum Einladen
- **Multi-Plattform** — funktioniert auf 11 Video-Plattformen
- **giucedParty Branding** — lila Theme (#BB86FC)

## Installation

### Browser-Erweiterung laden (Chrome/Brave)

1. Öffne `chrome://extensions/`
2. Aktiviere **Developer mode** (oben rechts)
3. Klicke **Load unpacked**
4. Wähle den Ordner `~/giucedparty/`
5. Die giucedParty-Erweiterung erscheint in der Toolbar

### Relay-Server starten (lokal)

```bash
cd ~/giucedparty/server
npm install
npm start
# Server läuft auf ws://localhost:8080
```

Dann in der giucedParty-Erweiterung:
- Popup öffnen → ⚙️ Settings → **Use Local Server**

### Relay-Server deployen (Produktion)

```bash
cd ~/giucedparty/server
# Fly.io
fly launch --image node:20
fly deploy
# oder Railway / Render / Heroku
```

Danach in `manifest.json` und `background/service-worker.js` die `DEFAULT_SERVER` URL anpassen.

## Verwendung

1. Öffne eine Video-Seite (z.B. youtube.com/watch?v=...)
2. Klicke auf das giucedParty-Icon in der Toolbar
3. Gib deinen Namen ein und klicke **Start Party**
4. Kopiere den Party-Code und teile ihn mit Freunden
5. Freunde: giucedParty-Popup öffnen → Code eingeben → **Join Party**
6. Sidebar erscheint mit Chat — Videos werden synchronisiert

## Architektur

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Browser    │     │  WebSocket       │     │  Browser    │
│  Extension   │◄───►│  Relay Server    │◄───►│  Extension   │
│  (Content   │     │  (Node.js + ws)  │     │  (Content   │
│   Script)    │     │                   │     │   Script)   │
│  + Sidebar  │     │  Rooms: partyId  │     │  + Sidebar  │
│  + Popup    │     │  → Set<WebSocket> │     │  + Popup    │
└─────────────┘     └─────────────────┘     └─────────────┘
```

## Dateien

```
giucedparty/
├── manifest.json          # Manifest V3 Konfiguration
├── content/
│   ├── content.js         # Video-Detection + Sync-Logik
│   └── content.css        # Sidebar-Overlay Styles
├── background/
│   └── service-worker.js  # WebSocket-Management + Party-State
├── sidebar/
│   ├── sidebar.html       # Chat-UI
│   ├── sidebar.js         # Chat-Logik
│   └── sidebar.css        # Sidebar Styles
├── popup/
│   ├── popup.html         # Party erstellen/beitreten
│   ├── popup.js           # Popup-Logik
│   └── popup.css          # Popup Styles
├── server/
│   ├── server.js          # WebSocket Relay Server
│   └── package.json       # Server Dependencies
├── assets/
│   └── icons/             # Extension Icons (16/48/128px)
└── README.md
```

## Unterstützte Plattformen

| Plattform | URL |
|---|---|
| YouTube | youtube.com |
| Netflix | netflix.com |
| Disney+ | disneyplus.com |
| HBO Max | max.com / hbomax.com |
| Amazon Prime | primevideo.com |
| Twitch | twitch.tv |
| Vimeo | vimeo.com |
| Hulu | hulu.com |
| Paramount+ | paramountplus.com |
| Peacock | peacocktv.com |

## Technologie

- **Manifest V3** Chrome Extension API
- **WebSocket** für Real-Time Sync
- **Content Scripts** für Video-Player-Detection
- **iframe Sidebar** für Chat-Overlay
- **Node.js + ws** für Relay-Server
- Keine externen Dependencies in der Extension (Vanilla JS)

## Lizenz

MIT
