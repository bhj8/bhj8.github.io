---
title: Games I've Made · Playable Demos
subtitle: Click and play — no download, no signup
description: Every playable demo I build gets listed here. They run straight in the browser. Updated as I go.
date: 2026-08-07
image: void-protocol.jpg
weight: 1
categories:
    - Games
tags:
    - Game Dev
    - Demo
    - WebGL
---

This is the **index page** — every demo of mine that runs in a browser gets added here, which is why it's pinned to the top.

No downloads, no plugins, no accounts. The link *is* the game. Use a **desktop browser (Chrome / Edge)** — both demos are keyboard-and-mouse, so phones won't work.

---

## 1 · VOID PROTOCOL — first-person wave shooter

[![VOID PROTOCOL](void-protocol.jpg)](/games/void-protocol/)

<p style="text-align:center;margin:1.4em 0">
  <a href="/games/void-protocol/" target="_blank" rel="noopener"
     style="display:inline-block;padding:.85em 2.4em;border-radius:8px;
            background:#05070c;color:#5fe6ff;border:1px solid #5fe6ff;
            font-weight:700;letter-spacing:.12em;text-decoration:none">
    ▶ PLAY
  </a>
</p>

An open arena on four-tier terraced terrain, six weapons, and waves that keep getting heavier.

**What makes it unusual: the game ships with zero asset files.** Textures, sound effects, geometry, animation — all generated at runtime in code. No art files, no audio files, no models. The whole thing is one HTML file plus three.js.

![The arena](void-protocol-arena.jpg)

### Controls

| Key | Action |
|---|---|
| `WASD` | Move |
| `Space` | Jump (clears one terrain tier) |
| `Mouse` | Look / left click to fire |
| `Shift` | Sprint |
| `R` | Reload |
| `1-6` / wheel | Switch weapon |
| `` ` `` | Debug panel (live sliders for lighting, feel, FOV — plus cheats) |

### A few things worth knowing

- The pistol has infinite ammo; the other five are bought from the **armory between waves**, and each takes three upgrade levels;
- Ammo drops off kills and vacuums toward you as you walk over it;
- Ground enemies have to path around the ramps, but fliers ignore elevation entirely — **high ground stalls the former, not the latter**;
- On the minimap, **brightness is height**.

### Where it's at

The plan runs in four phases. P1 (modularization, heightfield terrain, jumping) and P2 (weapons, ammo, economy, shop) are done — that's the build you're playing.

P3 is scaling up the bestiary from 4 enemy types to 14: suicide bombers, shield-bearers, chargers, splitters, and two bosses. P4 is level and audiovisual polish.

**A new build lands Monday**, dropped in at this same link — the URL won't change.

---

## 2 · FRONTLINE — 2.5D real-time strategy

[![FRONTLINE](frontline.jpg)](/games/frontline/)

<p style="text-align:center;margin:1.4em 0">
  <a href="/games/frontline/" target="_blank" rel="noopener"
     style="display:inline-block;padding:.85em 2.4em;border-radius:8px;
            background:#14100a;color:#e0a54a;border:1px solid #e0a54a;
            font-weight:700;letter-spacing:.12em;text-decoration:none">
    ▶ PLAY
  </a>
</p>

A vertical slice of an RTS. **No workers, no mining** — income comes straight from the strongpoints you hold, so there's exactly one thing to think about: where the line goes next.

Three mechanics carry all the tactics:

- **Cover decides damage** — sandbags and low walls are directional: 34%–54% reduction from the front, nothing at all once you're flanked. Squads auto-occupy nearby cover per-soldier on arrival, not as one blanket roll;
- **Suppression decides advance** — units under heavy fire get suppressed and then pinned, tanking their speed and accuracy. Machine gun teams are the kings of suppression;
- **Flanking decides the match** — which is just the first two put together. A position you can't crack head-on collapses from the side.

Infantry can garrison buildings; machine guns and mortars have to stop and set up, with a firing arc once they do; tanks and AT teams sit at opposite ends of a hard counter chain.

### Controls

| Key | Action |
|---|---|
| `Left-drag` | Box select |
| `Right click` | Move / attack |
| `A + left click` | Attack-move |
| `Right click a building` | Garrison infantry |
| `T` | Retreat to base (and reinforce) |
| `Q W E R F G` | Produce units |
| `1-4` | Control groups (`Ctrl` + number to set) |
| `Arrow keys` / screen edge | Pan camera |
| `H` | Help |

Three difficulties: Patrol (resources ×0.8), Regulars (even), Elite Division (resources ×1.3).

### Where it's at

The core loop is complete — a match resolves in roughly 10 minutes. While building it I wrote a headless test harness that plays the game against itself to verify the map and the numbers are symmetric. It caught four bugs I could never have seen by eye: a fixed iteration order in the firing loop that let whichever side sat earlier in the array always land damage first; building entrances hardcoded to the south side, which meant one half of the map always had to walk around. The last 20-match symmetry regression came back 10:10.

Known gaps: the AI doesn't use specialist units well (it plays mortars and machine guns like rifles), machine gun teams and armored cars aren't pulling their weight yet, and there's no mobile support at all.

---

## What's next

A few more demos are queued up; each one gets added here when it's done. This post stays pinned, so bookmarking this single page is enough.

Bugs, suggestions, or just want to complain about the gunfeel — comments are open below.
