# Baseboard AI — App Wireframes

> ASCII wireframes of every screen and major component.
> Navigation flow diagram at the bottom.

---

## NAVIGATION FLOW

```
┌─────────────┐
│   LANDING   │
└──────┬──────┘
       │ ⊕ New Project          ┌─────────────────┐
       ├──────────────────────► │  NEW PROJECT     │
       │                        │  (3-card select) │
       │ Enter Studio           └────────┬─────────┘
       ▼                                 │
┌─────────────────┐   Upload Script      │
│ PROJECT LIBRARY │ ◄────────────────────┤ Start Blank
└────────┬────────┘                      │
         │ Open Project          ┌────────▼──────────┐
         │                       │  GENESIS ENGINE   │
         │                       │  (AI pipeline)    │
         │                       └────────┬──────────┘
         │                                │ Complete
         │                       ┌────────▼──────────┐
         │                       │ CREATIVE DIRECTOR │
         │                       │    REPORT         │
         │                       └────────┬──────────┘
         │                                │ Enter Studio
         ▼                                ▼
    ┌────────────────────────────────────────────┐
    │                   STUDIO                   │
    │  ┌───────────────┬──────────────────────┐  │
    │  │  STORYBOARD   │     CHARACTERS       │  │
    │  │  (3-col view) │  (Dictionary →       │  │
    │  │               │   Package)           │  │
    │  ├───────────────┤                      │  │
    │  │  WORLD BIBLE  │                      │  │
    │  └───────────────┴──────────────────────┘  │
    └────────────────────────────────────────────┘
```

---

## 1. LANDING PAGE

```
┌──────────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░                    [FILM GRAIN OVERLAY]                      ░ │
│ ░                                                              ░ │
│ ░                    ·  ·  ·  · ◎ ·  ·  ·  ·                  ░ │
│ ░               ·  ╭──────────────────────╮  ·                ░ │
│ ░          ·    │  │   ~~~COMPASS SVG~~~  │  │    ·           ░ │
│ ░               │  │      (animated)      │  │                ░ │
│ ░               ╰──────────────────────────╯                  ░ │
│ ░                                                              ░ │
│ ░              B A S E B O A R D   A I                        ░ │
│ ░          ──────────────────────────────────                  ░ │
│ ░         Pre-visualization engine for animation               ░ │
│ ░                                                              ░ │
│ ░           ┌─────────────────────────────────┐               ░ │
│ ░           │       ⊕  New Project            │  ← gold pill  ░ │
│ ░           └─────────────────────────────────┘               ░ │
│ ░                                                              ░ │
│ ░                   Enter Studio  →                            ░ │
│ ░                                                              ░ │
│ ░                         ↓                                    ░ │
│ ░                    scroll to begin                           ░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. NEW PROJECT PAGE

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈ LOGO]                              Skip → Enter Studio        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ◈  Genesis Engine                                   │
│              Create New Project                                  │
│                                                                  │
│  ┌─────────────────────────────────┬─────────────┬────────────┐ │
│  │                                 │             │            │ │
│  │   📄  Upload Story              │  Template   │   Blank    │ │
│  │                                 │             │            │ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │  ↓ Download │  Empty     │ │
│  │    Drag & drop your script      │  .md file   │  workspace │ │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │             │            │ │
│  │                                 │  [Use This] │  [Start →] │ │
│  │  [ Browse Files ]               │             │            │ │
│  │   .docx · .pdf · .txt           │             │            │ │
│  │                                 │             │            │ │
│  └─────────────────────────────────┴─────────────┴────────────┘ │
│                                                                  │
│  ┌──────────────────────── CONFIRMATION CARD ─────────────────┐ │
│  │  📄  my_screenplay.docx                                    │ │
│  │  ─────────────────────────────────────────────────────     │ │
│  │  Format: DOCX   Size: 48 KB   Title: My Story              │ │
│  │                                                            │ │
│  │  [ Analyse Script → ]          [ ← Change Document ]      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. GENESIS ENGINE PAGE  (AI Pipeline)

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈ LOGO]  ← Back                                    ← Landing   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ◈  Genesis Engine                                   │
│              "My Screenplay"  ·  my_screenplay.docx              │
│                                                                  │
│   Overall Progress                                               │
│   ████████████████████████████░░░░░░░░░░░░  72%                 │
│                                                                  │
│   ┌──────────────────────────┬───────────────────────────────┐  │
│   │                          │                               │  │
│   │  ◉  Parse Script Text  ✓ │  ◉  Extract Characters     ✓ │  │
│   │  ───────────────────────── │  ──────────────────────────── │  │
│   │  ◉  Detect Genre       ✓ │  ◉  Build World Bible      ✓ │  │
│   │  ◉  Analyse Tone       ✓ │  ◉  Scene Breakdown        ✓ │  │
│   │  ◉  Identify Themes    ✓ │  ◉  Generate Storyboard  ···│  │
│   │  ◉  Count Scenes       ✓ │  ◉  Render Frame Images  ···│  │
│   │  ◉  Runtime Estimate   ✓ │  ◉  Compile Report       ···│  │
│   │                          │                               │  │
│   └──────────────────────────┴───────────────────────────────┘  │
│                                                                  │
│         Generating storyboard frames…  Stage 3/3                │
│                                                                  │
│              ┌──── COUNTDOWN (on complete) ────┐                │
│              │          ╭───────╮               │                │
│              │         /  4s    \               │                │
│              │        │ ○─────  │  SVG ring     │                │
│              │         \       /                │                │
│              │          ╰───────╯               │                │
│              │    Preparing your report…        │                │
│              └──────────────────────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. CREATIVE DIRECTOR REPORT

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈ LOGO]                                            ← Landing   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  ◈  Genesis Engine  ·  Analysis Complete             │    │
│     │  ─────────────────────────────────────────────────   │    │
│     │                                                       │    │
│     │  PROJECT TITLE                                        │    │
│     │  "My Screenplay"                                      │    │
│     │  ─────────────────────────────────────────────────   │    │
│     │                                                       │    │
│     │  Genre          Drama / Thriller                      │    │
│     │  Runtime        ~92 min (est.)                        │    │
│     │  Visual Style   Cinematic High-Contrast               │    │
│     │  Characters     4 detected                            │    │
│     │  Locations      7 mapped                              │    │
│     │  Scenes         12 total                              │    │
│     │  Frames         48 generated                          │    │
│     │                                                       │    │
│     │  Primary Themes                                       │    │
│     │  [ Redemption ] [ Loss ] [ Identity ] [ Trust ]       │    │
│     │                                                       │    │
│     │  AI Confidence                                        │    │
│     │  ████████████████████████████████░░░░░  87%           │    │
│     │                                                       │    │
│     │  ─────────────────────────────────────────────────   │    │
│     │                                                       │    │
│     │              [ Enter Studio → ]                       │    │
│     │                                                       │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. STUDIO — STORYBOARD VIEW  (Main Editor)

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈]  STORYBOARD │ CHARACTERS │ WORLD BIBLE    [📁 Library] [⊕] │
├──────────────────────────────────────────────────────────────────┤
│  Storyboard │ Player │ Vault │ Locked Cut(3)    [↺ Re-run] [+]  │
├────────────┬───────────────────────────────────┬─────────────────┤
│            │                                   │                 │
│ SCENE INDEX│  SCENE 01 › INT. OFFICE - NIGHT   │   INSPECTOR     │
│ ──────────│  ─────────────────  [B&W] [▶ Play]│  ─────────────  │
│ 🔍 Search  │                                   │  Scene Info     │
│            │  ┌─────────┐ ┌─────────┐          │  ────────────   │
│ ▼ S01 ●   │  │ ░░░░░░░ │ │ ░░░░░░░ │          │  Tone          │
│  ┌──────┐ │  │ ░ img  ░ │ │ ░ img  ░ │          │  Cinematic     │
│  │ frms │ │  │ ░░░░░░░ │ │ ░░░░░░░ │          │  ────────────   │
│  └──────┘ │  │ [★][↓][⤢]│ │ [★][↓][⤢]│          │  Palette       │
│            │  │─────────│ │─────────│          │  ■ ■ ■ ■ ■     │
│ ▶ S02     │  │ CU·0.8s  │ │ WS·2.1s │          │  ────────────   │
│ ▶ S03     │  │ Emma     │ │ Alley   │          │  Style Ref     │
│ ▶ S04     │  │ opens    │ │ chase   │          │  [Upload ↑]    │
│ ▶ S05     │  │ briefcase│ │ begins  │          │  ────────────   │
│ ▶ S06     │  └─────────┘ └─────────┘  ──►     │  Shot Planner  │
│            │                                   │  fps [24▼]     │
│            │        ← horizontal scroll →      │  dur [──●──]   │
│            │                                   │  [▸ Keyframes] │
│ [+ Scene]  │                                   │                 │
└────────────┴───────────────────────────────────┴─────────────────┘
```

### 5a. Re-run Overlay (floats top-right)

```
                         ┌─────────────────────┐
                         │ ↺ Re-run Pipeline  ✕│
                         │ ───────────────────  │
                         │ Global Aesthetic      │
                         │ ┌─────────────────┐  │
                         │ │ Cinematic…      │  │
                         │ └─────────────────┘  │
                         │ Render Style          │
                         │ [B&W] [Flat] [Shaded] │
                         │                       │
                         │ [↺ Execute Re-run →]  │
                         └─────────────────────┘
```

### 5b. Vault View

```
┌──────────────────────────────────────────────────────────────────┐
│  Storyboard │ Player │ [VAULT] │ Locked Cut                      │
├──────────────────────────────────────────────────────────────────┤
│  THE VAULT — 48 frames                                           │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │  │
│  │ ░ img  ░ │ │ ░ img  ░ │ │ ░ img  ░ │ │ ░ img  ░ │ │ ░ img  ░ │  │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │  │
│  │ [★][↓][⤢]│ │ [★][↓][⤢]│ │ [★][↓][⤢]│ │ [★][↓][⤢]│ │ [★][↓][⤢]│  │
│  │─────────│ │─────────│ │─────────│ │─────────│ │─────────│  │
│  │CU · 0.8s│ │WS · 2.1s│ │MS · 1.5s│ │ECU· 0.4s│ │LS · 3.2s│  │
│  │Emma…    │ │Alley…   │ │Door…    │ │Eyes…    │ │Street…  │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  … (all frames, wrapped)                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 5c. Animatic Player

```
┌──────────────────────────────────────────────────────────────────┐
│  Storyboard │ [PLAYER] │ Vault │ Locked Cut      ← Storyboard   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  F3/12                                      00:04 / 00:38  │ │
│  │                                                            │ │
│  │                                                            │ │
│  │               ░░░░░░░░░░░░░░░░░░░                         │ │
│  │               ░░░  FRAME  ░░░░░░                         │ │
│  │               ░░░  IMAGE  ░░░░░░                         │ │
│  │               ░░░░░░░░░░░░░░░░░░░                         │ │
│  │                                                            │ │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░  frame bar     │ │
│  │  CLOSE UP  ·  HIGH ANGLE  ·  0.8s                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│   ├──│──│──│──│──│──│──│──│──│──│──│──│──│──│──│──│──│──│──┤  │
│   ●────────────────────────────────────────── scrub bar         │
│                                                                  │
│         ⏮   ‹   ▶   ›           00:04 / 00:38                  │
│                                                                  │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  thumbnail strip│
│  │░░│ │░░│ │██│ │░░│ │░░│ │░░│ │░░│ │░░│ │░░│                 │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. FRAME CARD  (storyboard/vault card)

```
┌───────────────────────┐
│ 0101           [★][↓][⤢] ← hover only
│ ░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░  IMAGE  ░░░░░░░ │  ← click → gallery lightbox
│ ░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░ │
│                  ⊕    │  ← zoom hint on hover
├───────────────────────┤
│ CLOSE UP         0.8s │
│ Emma opens the brief- │
│ case and reveals the  │
└───────────────────────┘
  └── selected: gold ring + gold bottom strip
```

---

## 7. GALLERY LIGHTBOX  (shared — frames + character images)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                  2 / 5       ✕  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░                                                           ░  │
│  ░                                                           ░  │
│                                                                  │
│   ‹        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         ›      │
│            ░░░░░░░░░░░░  IMAGE  ░░░░░░░░░░░░░░░░               │
│            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│                                                                  │
│                     FRONT  (or "0101")                           │
│             CLOSE UP · HIGH ANGLE · 0.8s · Emma…                │
│                                                                  │
│              [ ↓ Export PNG ]     [ Close ]                     │
│                                                                  │
│    ┌──┐ ┌──┐ ┌██┐ ┌──┐ ┌──┐   ← thumbnail strip (active=gold) │
│    │░░│ │░░│ │██│ │░░│ │░░│                                     │
│    └──┘ └──┘ └──┘ └──┘ └──┘                                     │
│                                                                  │
│            ← → ARROW KEYS TO NAVIGATE · ESC TO CLOSE            │
└──────────────────────────────────────────────────────────────────┘
  backdrop: slate-950/94 + blur(14px)
```

---

## 8. CHARACTER DICTIONARY

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈]  STORYBOARD │ CHARACTERS │ WORLD BIBLE    [📁 Library] [⊕] │
├──────────────────────────────────────────────────────────────────┤
│  Character Dictionary                       [ + New Character ] │
│  4 characters in bible                                           │
├──────────────────────────────────────────────────────────────────┤
│  [All] [Protagonist] [Antagonist] [Supporting] [Other]  🔍 ──── │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ◉  Emma Chen                    Age 26         ✓ PKG ›  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ◉  Marcus Reyes                 Age 34               ›  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ┌────────┐  Heritage / Type    Bone Structure           │   │
│  │  │        │  East Asian         High cheekbones          │   │
│  │  │  img   │  Estimated Age      Distinct Markers         │   │
│  │  │        │  34                 Scar left brow           │   │
│  │  │        │                                              │   │
│  │  └────────┘  Wardrobe Defaults                           │   │
│  │  AI Portrait  Dark suit, silver watch, worn leather      │   │
│  │               briefcase                                  │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  [ ✦ Full Package ] [ ↓ PNG ] [ ↓ JSON ]   [ ✕ ]        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ◉  Nadia Okonkwo                Age 29               ›  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. CHARACTER PACKAGE PAGE

```
┌──────────────────────────────────────────────────────────────────┐
│ ←  ◉ Emma Chen                        [Simple|Detailed] ✓ Ready│
│    Character Package · CHAR_EMMA                                 │
├──────────────────────────────────────────────────────────────────┤
│ ✦ Full Character Reference Pack  360°·T-pose·Materials [Generate]│
├──────────────────────────────────────────────────────────────────┤
│ Overview│Portrait│Turnaround│Expressions│Poses│Outfits│...       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ── TURNAROUND SHEET — 5 Views ──────── [↺ Regen All] [↓ ZIP]  │
│                                                                  │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐             │
│  │       │ │       │ │       │ │       │ │       │             │
│  │  img  │ │  img  │ │  img  │ │  img  │ │  img  │             │
│  │       │ │       │ │       │ │       │ │       │             │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘             │
│  FRONT  ↺↓ ¾ FRONT↺↓  SIDE  ↺↓ ¾ BACK↺↓  BACK  ↺↓             │
│                                                                  │
│   ↑ click any image → Gallery Lightbox with arrow key nav        │
│                                                                  │
│  ── EXPRESSIONS ─────────────────────────────────────────────   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌──┐ │
│  │img │ │img │ │img │ │img │ │img │ │img │ │img │ │img │ │..│ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └──┘ │
│  🙂 Neu 😊 Hap 😂 Lau 😡 Ang 😢 Sad 😲 Sur 😨 Fea 🤔 Thi 😭Cry │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9a. Character Package — Overview Tab

```
├──────────────────────────────────────────────────────────────────┤
│  Character Overview            [ ✦ AI-Generate Overview ]        │
│                                                                  │
│  Name ─────────────────    Role ────────────────────            │
│  Emma Chen                 Protagonist                          │
│                                                                  │
│  Age ──────  Gender ────   Occupation ─────────────────         │
│  26          Female        Architect                            │
│                                                                  │
│  Species ──────────────    Nationality ────────────────         │
│  Human                     American                             │
│                                                                  │
│  Height ───────────────    ────────────────────────────         │
│  5'7"                                                           │
│                                                                  │
│  Short Biography ──────────────────────────────────────         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Driven architect who discovers...                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  Goals ────────────────────────────────────────────────         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Expose the corruption before...                      │      │
│  └──────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### 9b. Character Package — Relationships Tab

```
├──────────────────────────────────────────────────────────────────┤
│  Relationship Graph                     2 connections detected   │
│                                                                  │
│  ┌────────────────────────────────────────┐  ┌───────────────┐  │
│  │                  ●                     │  │ Emma          │  │
│  │          (Emma Chen)                   │  │ ─────────     │  │
│  │         /           \                  │  │ Marcus        │  │
│  │     ━━━/━━━━     ━━━\━━━               │  │ Type: neutral │  │
│  │      ●             ●                  │  │ Strength: ●●●○○│  │
│  │   Marcus         Nadia                │  │ Scenes: #1 #4 │  │
│  │  (neutral)      (ally)                │  │               │  │
│  └────────────────────────────────────────┘  │ [Edit ▾]      │  │
│                                              └───────────────┘  │
│  ● ally  ● enemy  ● romantic  ● mentor  ● family  ● rival       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. WORLD BIBLE

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈]  STORYBOARD │ CHARACTERS │ WORLD BIBLE    [📁 Library] [⊕] │
├──────────────────────────────────────────────────────────────────┤
│  World Bible                                                     │
│  7 locations mapped                                              │
├──────────────────────────────────────────────────────────────────┤
│  [Locations] [Factions] [Lore] [Artifacts] [Timelines]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████ ← colour palette strip      │   │
│  │  INTERIOR · NIGHT                           ┌──┐      ›  │   │
│  │  INT. CORPORATE OFFICE                      │░░│         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████                              │   │
│  │  EXTERIOR · DUSK                            ┌──┐      ›  │   │
│  │  EXT. BACK ALLEY                            │░░│         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  Emotional Tone   Scene #     Type         Time of Day   │   │
│  │  Tense            #3          Exterior     Dusk          │   │
│  │                                                          │   │
│  │  Colour Palette                                          │   │
│  │  ■ #1a1a2e  ■ #e94560  ■ #0f3460  ■ #533483             │   │
│  │                                                          │   │
│  │  Storyboard Frames (4)  · 4 rendered          ↓ ZIP      │   │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ← click → lightbox                │   │
│  │  │░3│F│░4│F│░5│F│░6│F                                   │   │
│  │  └──┘ └──┘ └──┘ └──┘                                    │   │
│  │                                                          │   │
│  │  [ ↓ Download JSON ]                         [ ✕ ]       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11. PROJECT LIBRARY

```
┌──────────────────────────────────────────────────────────────────┐
│ [◈ LOGO]                                    [⊕ New Project]      │
├──────────────────────────────────────────────────────────────────┤
│  Project Library  ·  3 projects                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────┐ │
│  │ ██████████████████ │  │ ██████████████████ │  │ ██████████ │ │
│  │ ← colour strip     │  │                    │  │            │ │
│  │                    │  │                    │  │            │ │
│  │ My Screenplay     B&W│  │ The Heist      Flat│  │ Short Film │ │
│  │ Cinematic thriller   │  │ Action / Comedy    │  │ Drama      │ │
│  │                    │  │                    │  │            │ │
│  │  12  ·  48  ·  4   │  │   8  ·  32  ·  3  │  │  5 · 20 · 2│ │
│  │ sc    fr    ch      │  │ sc    fr    ch     │  │ sc  fr  ch │ │
│  │                    │  │                    │  │            │ │
│  │ ■ ■ ■ ■ ■ ■ ■ ■   │  │ ■ ■ ■ ■ ■ ■ ■ ■  │  │ ■ ■ ■ ■ ■ │ │
│  │                    │  │                    │  │            │ │
│  │ [  Open →  ]  [ ✕ ]│  │ [  Open →  ]  [ ✕]│  │ [Open→][✕]│ │
│  └────────────────────┘  └────────────────────┘  └────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. SCENE INDEX SIDEBAR

```
┌──────────────────────────┐
│ SCENE INDEX              │
│ 🔍 [search…         ]    │
├──────────────────────────┤
│ ▼ ◉ S01  Office · Night  │  ← active (gold left border)
│   ├─ F01 CU  Emma  0.8s  │
│   ├─ F02 WS  Office 2.1s │
│   ├─ F03 MS  Door  1.5s  │
│   [↓ ZIP]     [✕ Delete] │
│                          │
│ ▶ S02  Alley · Dusk      │
│ ▶ S03  Rooftop · Dawn    │
│ ▶ S04  Car · Night       │
│ ▶ S05  Station · Day     │
│                          │
│  ↕ drag to reorder       │
│  — gold indicator bar    │
├──────────────────────────┤
│ [+ New Scene]            │
└──────────────────────────┘
```

---

## 13. SHOT PLANNER  (Inspector panel section)

```
┌──────────────────────────┐
│ SHOT PLANNER             │
├──────────────────────────┤
│ FPS  [24 ▼]              │
│ Duration ──●────── 4.0s  │
│ Total Frames: 96         │
│                          │
│ Keyframe Timeline        │
│ ├ Start                  │
│ ├ Anticipation           │
│ ├ ● Main Action          │  ← current
│ ├ Follow-through         │
│ └ End Pose               │
│                          │
│ ████████░░░░  3/5 done   │
│                          │
│ [✦ Generate Keyframes]   │
│ [↓ Export JSON]          │
└──────────────────────────┘
```

---

## 14. COMPASS NAV PAGE  (entry transition)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ╭───────╮                               │
│                    ·  · │  ◎    │ · ·                           │
│               · ╭───────────────────────╮ ·                    │
│              ·  │   N   W A Y P O I N T │  ·                   │
│                 │     S E L E C T O R   │                       │
│              ·  │         ⊕             │  ·                   │
│               · ╰───────────────────────╯ ·                    │
│                    ·  · ·  · · · · ·                           │
│                                                                  │
│          [ Storyboard ]   [ Characters ]   [ World Bible ]      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT HIERARCHY

```
App
├── LandingPage
├── CompassNavPage
├── NewProjectPage
│   └── GenesisUploadPage (drag/drop zone)
├── GenesisEnginePage
│   └── ConstellationLoader
├── CreativeDirectorReport
├── ProjectLibraryPage
└── Studio (layout)
    ├── [tab: STORYBOARD]
    │   └── StudioPage
    │       ├── SceneIndex (sidebar)
    │       │   └── SceneList
    │       ├── StoryboardCanvas (center)
    │       │   └── FrameCard ×N
    │       │       └── GalleryLightbox (modal)
    │       ├── StudioInspector (right)
    │       │   ├── StyleReferenceUploader
    │       │   └── ShotPlanner
    │       ├── AnimaticPlayer (Player view)
    │       ├── VaultGrid (Vault view)
    │       │   └── FrameCard ×N
    │       ├── LockedCutFolder (Locked view)
    │       └── BatchExportBar
    ├── [tab: CHARACTERS]
    │   └── CharacterDictionaryPage
    │       ├── CharacterRow ×N (expandable)
    │       └── CharacterPackagePage (full-screen on "✦ Full Package")
    │           ├── OverviewSection
    │           ├── ImageTile ×N → GalleryLightbox (modal)
    │           └── RelationshipGraph (SVG)
    └── [tab: WORLD BIBLE]
        └── WorldBiblePage
            ├── LocationRow ×N (expandable)
            └── GalleryLightbox (modal, frame thumbnails)
```

---

## LEGEND

```
░░░░░  Image / media area
████   Colour fill / progress bar
┌──┐   Container / card
[   ]  Button
│  │   Border / divider
·      Decorative ambient glow dot
⊕      Add / create action
◉      Selected / active state
✓      Completed
●      Current / indicator
─────  Separator
▼ ▶    Expand collapse arrows
↺      Regenerate
★      Lock to cut
↓      Download
⤢      Expand / fullscreen
✕      Delete / close
```

---

*Generated from source — reflects actual implementation.*
