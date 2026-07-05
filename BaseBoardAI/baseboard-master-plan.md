# BaseBoard AI — Master Implementation Plan

## Top-Level Overview

**Goal:** Bring the BaseBoard AI frontend from a bare Vite/React skeleton into a
fully-functional PreViz workstation that satisfies the locked Master Technical Brief.

**Current Status: All planned sub-tasks complete. Character Package system fully built.**

### Backend
- 3-Stage LLM pipeline (character → world → storyboard) via IBM WatsonX
- Pollinations.ai + Hugging Face image generation, base64-encoded, stored in SQLite
- Full FastAPI CRUD + 4 pipeline endpoints + 5 character package endpoints
- Pydantic v2 schemas and SQLAlchemy ORM with deferred image column
- `render_style` field (`bw_sketch` | `bw_detailed` | `flat_color` | `full_shaded`)
- `reference_style_image` Base64 img2img support with 3-branch dispatch
- `CHARACTER_OVERVIEW_PROMPT` — LLM expansion of raw character into full narrative profile
- Model fallback chain (auto-retries down 4-model chain on 429 rate-limit)

### Frontend
- All planned sub-tasks 9–21 are either complete or in scope (20 & 21 pending)
- Full premium cinematic redesign, CSS motion system, dark/light theme
- Genesis Engine pipeline with 12-task animated progress screen
- Complete Character Package system (auto-generation, full reference pack, detail toggle)
- Relationship graph, version history, per-image regeneration, ZIP exports

### Current App Flow
1. **Landing Page** — rotating compass, gold title, "Enter Studio →" CTA
2. **New Project** — 3-card selector: Genesis Upload · Start Blank · Load from Library
3. **Genesis Engine** — 12-task animated pipeline (character → world → storyboard → images)
4. **Creative Director's Report** — post-analysis summary with countdown to Studio
5. **Studio** — 44px top bar, 3-tab nav (Storyboard · Characters · World Bible)
   - Storyboard: 3-panel layout (scene index + canvas + inspector), animatic player, vault, locked cut
   - Characters: Character Dictionary → Character Package (12 tabs)
   - World Bible: location cards with sub-tabs (Locations · Factions · Lore · Artifacts · Timelines)
6. **Project Library** — browse / load / delete saved projects

---

## Sub-Tasks

---

### Sub-Task 1 — Add `python-dotenv` and create `.env`
**Status:** `[x] done`

---

### Sub-Task 1b — Add image provider config keys to `.env`
**Status:** `[x] done`

---

### Sub-Task 2 — Create `app/core/config.py`
**Status:** `[x] done`

---

### Sub-Task 3 — Strengthen prompt templates
**Status:** `[x] done`

---

### Sub-Task 4 — Create `app/core/llm.py`
**Status:** `[x] done`

**What was built:**
- `invoke_character_stage`, `invoke_world_stage`, `invoke_storyboard_stage`
- `_invoke_with_fallback()` — automatic model fallback chain on 429 rate-limit
- `FALLBACK_MODELS` list: mistral-small → llama-3.3-70b → mistral-medium → mistral-large
- `_parse_json_response()` — strips markdown fences, fallback regex JSON extraction

---

### Sub-Task 5 — Wire pipeline endpoints
**Status:** `[x] done`

**Endpoints:**
- `POST /storyboard/forge-pipeline` — full 3-stage pipeline + image generation, saves to DB
- `POST /storyboard/parse-single-character` — isolated character parsing
- `POST /storyboard/parse-single-environment` — isolated environment parsing
- `POST /storyboard/forge-standalone-storyboard` — storyboard-only, no DB write

---

### Sub-Task 6 — Add `generated_image_url` to schema and ORM
**Status:** `[x] done`

---

### Sub-Task 7 — Create `app/core/image.py`
**Status:** `[x] done`

---

### Sub-Task 8 — Wire image generation into pipeline
**Status:** `[x] done`

---

### Sub-Task 8b — Add `render_style` field to backend `PipelineExecutionRequest`
**Status:** `[x] done`

**What was built:**
- `render_style: Literal['bw_sketch', 'flat_color', 'full_shaded']` on all request schemas
- `STORYBOARD_PROMPT` updated with `{render_style}` + `{global_aesthetic}` variables
- `_STYLE_PREFIXES` dict drives image model prompts per style

---

### Sub-Task 8c — Add `reference_style_image` to schema + img2img image engine
**Status:** `[x] done`

**What was built:**
- `reference_style_image: str | None` on `PipelineExecutionRequest` (ephemeral — never stored)
- `HF_IMG2IMG_MODEL` config key
- `_generate_pollinations_img2img()` and `_generate_huggingface_img2img()` provider functions
- 3-branch dispatch in `generate_frame_image()`:
  - Branch 1: `bw_sketch` + reference → sketch-intersection path (strength=0.78)
  - Branch 2: reference + other style → standard img2img (strength=0.55)
  - Branch 3: no reference → text-to-image

---

### Sub-Task 8d — B&W detail level control
**Status:** `[x] done`

**What was built:**
- `bw_detailed` added as a fourth render style to `_STYLE_PREFIXES` in `image.py`
  - `bw_sketch` — sparse construction lines, no shading, artist adds detail on top
  - `bw_detailed` — bold outlines, crosshatch shading, high contrast, studio-ready reference
- `_pkg_prompt()` branches on render style — bw_sketch gets `minimal outline drawing, no detail` suffix; bw_detailed gets `detailed ink drawing, character reference sheet`
- `_BW_DETAILED_NEGATIVE_CONSTRAINTS` constant
- `DetailLevel` type (`'simple' | 'detailed'`) in `CharacterPackagePage`
- `resolveRenderStyle()` maps `DetailLevel` + base style → concrete render style string
- **Simple / Detailed toggle** in package header (only visible for B&W styles)
- Toggling clears all images, resets state, re-runs `autoInit` in new style
- Toggle also surfaced in AI Prompt tab with description of each mode
- `flat_color` and `full_shaded` packages are unaffected (toggle hidden)

---

### Sub-Task 9 — TypeScript types layer
**Status:** `[x] done`

**Types in `src/types/storyboard.ts`:**
- `RenderStyle`, `CharacterOverview`, `PackageVersion`, `CharacterRelationship`
- `CharacterPackage` — full package state including premium fields and relationship graph
- `FacialBlueprint`, `CharacterProfile`, `StoryboardFrame`, `StoryboardScene`, `StoryboardProject`
- `FrameExportItem`, `PipelineExecutionRequest`

---

### Sub-Task 10 — App shell, navigation, and routing
**Status:** `[x] done` *(exceeded scope — full premium redesign)*

**What was built:**
- `LandingPage.tsx` — rotating compass SVG, gold title with glow, "Enter Studio →" CTA
- `CompassNavPage.tsx` — radial 4-point compass navigation with gold ring animation
- `NewProjectPage.tsx` — 3-card creation method selector
- `CreativeDirectorReport.tsx` — post-Genesis analysis summary card with countdown
- Studio top bar — 44px, gold logo (clicks → landing), 3-tab nav with underline active state
- `ThemeToggle` — animated sun/moon sliding thumb, CSS-variable-driven
- Granite Active pulse dot in header
- Idle detection (10s) drives landing page constellation + compass sway
- `GraniteNotification` — slide-down gold toast, auto-dismiss at 3.5s
- Dark/light CSS variable tokens throughout
- `ProjectLibraryPage.tsx` — browse, load, delete saved projects
- `GenesisUploadPage.tsx` — file upload with drag-and-drop, title input
- `GenesisEnginePage.tsx` — 12-task animated pipeline screen with per-task progress bars

---

### Sub-Task 11 — Pipeline input form + API client
**Status:** `[x] done`

**API functions in `src/api/storyboard.ts`:**
- `forgePipeline`, `listProjects`, `getProject`, `deleteProject`
- `generateImage` — single frame image from prompt
- `generateCharacterPackage` — batch generate package sections
- `regenerateCharacterImage` — single image within a section
- `generateCharacterOverview` — LLM-expanded character overview
- `generateFullCharacterPack` — premium 360°/poses/materials endpoint

---

### Sub-Task 12 — Screenplay scene list + frame stream canvas
**Status:** `[x] done` *(exceeded scope — full studio layout)*

**What was built:**
- `SceneIndex.tsx` — search input, staggered scene list, gold active border
- `StoryboardCanvas.tsx` — scene breadcrumb, horizontal scroll frame grid, player toggle
- `ShotPlanner.tsx` — individual shot planning with per-frame image generation
- `StudioPage.tsx` — full 3-panel layout (scene index + canvas + inspector)
- `EmptyBlueprintState.tsx` — sequenced SVG blueprint draw, compass assembles, delayed CTA

---

### Sub-Task 13 — Render style selector
**Status:** `[x] done`

---

### Sub-Task 14 — Director's Inspector panel (palette + lighting)
**Status:** `[x] done` *(exceeded scope)*

**`StudioInspector.tsx`:**
- Lighting mood dropdown
- Sun angle arc dial — SVG arc with draggable `<input type="range">`, animated fill + circle indicator
- Exposure slider (0–1, 2dp display)
- Lens slider (14–200mm display)
- Color valence dropdown
- Palette swatches with `<input type="color">` overlay
- Style Reference Uploader section

---

### Sub-Task 15 — Animatic player
**Status:** `[x] done`

**`AnimaticPlayer.tsx`:** `useEffect` timeout loop, gold timeline scrubber, ⏮ / ▶/⏸ controls

---

### Sub-Task 16 — Export layer (per-frame PNG + batch ZIP)
**Status:** `[x] done`

**What was built:**
- `exportFrames.ts` — `downloadFramePng`, `prepareFrameBatch`, `prepareLockedCut`, `buildManifestMd`, `exportLockedCutZip`
- `BatchExportBar.tsx` — locked/total count, "Export ZIP" button
- Per-frame ↓ download and ★ lock buttons on each `FrameCard`

---

### Sub-Task 17 — The Vault + Locked Cut Folder UI
**Status:** `[x] done`

**What was built:**
- `VaultGrid.tsx` — all frames across all scenes
- `LockedCutFolder.tsx` — filtered to locked frames, empty state
- View mode tabs in `StudioPage`: Gallery | Player | Vault | Locked Cut
- Lock count badge on "Locked Cut" tab

---

### Sub-Task 18 — Project Library page
**Status:** `[x] done`

`ProjectLibraryPage.tsx` — browse, load, delete projects from SQLite via the REST API.
Accessible from the Studio top bar "📁 Library" button and "⊕ New Project" button.

---

### Sub-Task 19 — Docs page (script template shortcuts)
**Status:** `[x] done`

`DocsPage.tsx` exists with script templates and pipeline tips. Not surfaced in current
nav — can be added as a compass quadrant if needed.

---

### Sub-Task 20 — Line tinting filter (stretch goal)
**Status:** `[ ] pending`

**Intent:** When render style is `bw_sketch`, show a tint color picker in `StudioInspector`.
Apply colour as `mix-blend-mode: multiply` overlay on frame images — pure client-side CSS.

**Todo:**
1. Add `lineTintColor: string | null` to `StudioPage` state
2. Pass down to `StudioInspector` and all `FrameCard` instances
3. Add "Line Tint" section to inspector — only visible when `render_style === 'bw_sketch'`
4. Preset swatches: `#FF1493` Neon Pink · `#00D4FF` Viewport Cyan · `#FFFFFF` reset
5. Free `<input type="color">` for custom tint
6. In `FrameCard`: sibling `<div>` with `backgroundColor`, `mixBlendMode: 'multiply'`, `opacity: 0.6`, `position: absolute, inset: 0`

---

### Sub-Task 21 — Lighting + shadow re-render controls (stretch goal)
**Status:** `[ ] pending`

**Intent:** Wire the lighting mood / exposure / lens controls in `StudioInspector` to
trigger a backend re-render of the selected frame via modified `lighting_notes`.

**Todo:**
1. Add `reforgeFrame` to `src/api/storyboard.ts`
2. Track "dirty" state in `StudioInspector` when lighting controls change
3. Render "Apply Lighting →" button when dirty
4. On click: construct `StandaloneStoryboardRequest` from current context + new params
5. Call `reforgeFrame`, update specific frame's `generated_image_url` in `StudioPage` state
6. Show `ConstellationLoader` overlay on the specific `FrameCard` while in-flight

---

### Sub-Task 22 — Character Package System
**Status:** `[x] done`

**Backend — new endpoints in `storyboard.py`:**
- `POST /storyboard/character-package/generate` — batch generate up to 6 sections
- `POST /storyboard/character-package/generate-one` — regenerate a single image (`section` uses slash notation: `turnaround/front`, `expressions/angry`, etc.)
- `POST /storyboard/character-package/overview` — LLM-expands raw `CharacterProfile` into full narrative overview (biography, personality, goals, fears, strengths, weaknesses, etc.) using `CHARACTER_OVERVIEW_PROMPT`
- `POST /storyboard/character-package/generate-full-pack` — premium endpoint; generates `turnaround_360` (8 angles), `premium_poses` (T/A-pose + 6 action poses), `material_closeups` (face/hair/fabric/hands/eyes)

**Backend constants:**
- `_TURNAROUND_ANGLES` — 5-view standard sheet
- `_EXPRESSIONS` — 9 standard expressions
- `_POSES` — 7 common poses
- `_OUTFITS` — 7 costume variants
- `_TURNAROUND_360` — 8-angle 360° turntable (deg_000 → deg_315)
- `_PREMIUM_POSES` — T-pose, A-pose, crouching, climbing, fighting stance, falling, celebrating, kneeling
- `_MATERIAL_CLOSEUPS` — face, hair, fabric, hand, eye close-up reference sheets

**New prompt in `prompts.py`:**
- `CHARACTER_OVERVIEW_PROMPT` — generates role, age, gender, occupation, species, nationality, height, biography, personality, goals, fears, strengths, weaknesses from a `CharacterProfile`

**Frontend — `CharacterPackagePage.tsx` (12 tabs):**

| Tab | What it contains |
|---|---|
| Overview | Editable form (14 fields) + `✦ AI-Generate Overview` LLM button |
| Portrait | Hero portrait, download PNG, per-image regen |
| Turnaround | 5-view standard sheet; 360° turntable appears here after Full Pack |
| Expressions | 9 expressions, per-expression regen |
| Poses | 7 common poses + Extended Library (T/A-pose etc.) after Full Pack |
| Outfits | 7 costume variants, independent regen |
| Palette | 5 colour swatches + Material Close-ups after Full Pack |
| Props | Auto-detected from wardrobe description |
| Relationships | SVG radial graph; inferred from scene co-appearances; editable (type, strength, description) |
| Scenes | Scene appearance list with thumbnail + location heading |
| AI Prompt | Editable prompt textarea; save/reset; Detail Level toggle (B&W only) |
| Versions | Snapshot history saved before every "Regenerate All"; restore button per version |

**Key behaviours:**
- **Auto-init on mount** — all 5 default sections (portrait, turnaround, expressions, poses, outfits) generated in one batched call; no user action required
- **Simple / Detailed toggle** in package header — `bw_sketch` (sparse outlines, artist adds shading) vs `bw_detailed` (crosshatch shading, studio-ready); toggling clears images and re-generates
- **"Generate Full Character Reference Pack" banner** — premium action fires `generate-full-pack`; 360° turntable, T/A-pose, material close-ups unlocked; ZIP download for Maya/Blender/Unreal/Unity export
- **Per-image `↺` regen** — each image tile has its own regenerate button
- **Per-section "Regenerate All"** — regenerates all images in a section without touching others
- **Version history** — snapshot saved before every bulk regen, thumbnail preview, restore button
- **Relationship graph** — `buildRelationships()` scans frame action text for character co-appearances; SVG radial layout; click any node to edit type/strength/description
- **`✓ PKG` badge** in `CharacterDictionaryPage` once a character's package auto-init completes

**Types added to `storyboard.ts`:**
- `CharacterRelationship` — `targetCharId`, `targetName`, `type` (ally/enemy/romantic/mentor/family/neutral/rival), `strength 1–5`, `sharedScenes`, `description`
- Extended `CharacterPackage` with `turnaround360`, `premiumPoses`, `materialCloseups`, `fullPackLoading`, `fullPackGenerated`, `relationships[]`, `autoInitDone`

---

## Completed Beyond Original Scope

### Premium Redesign (cinematic reference match)
- `LandingPage` — compass, gold glow, "Modern Heritage" tag
- `CompassNavPage` — radial 4-quadrant SVG navigation
- `CharacterDictionaryPage` — portrait grid with initials avatar, role filter tabs, search, `✓ PKG` badge
- `WorldBiblePage` — parchment location cards, sub-tabs (Locations · Factions · Lore · Artifacts · Timelines)
- `CreativeDirectorReport` — post-analysis summary with countdown ring before entering Studio
- `NewProjectPage` — 3-card creation method selector (Genesis Upload · Blank · Library)
- `GenesisEnginePage` — 12-task animated progress screen with per-task bars and countdown
- All colours migrated to CSS variables (`var(--bg-base)`, `var(--gold)`, etc.)

### Motion System
- 22 CSS keyframes: blueprint draw, studio unfold, tab morph, scene stagger, card rise, gold assemble, constellation node/line, scan line, notification enter/exit, idle compass sway, blueprint reveal, shimmer
- `.btn-tactile` — hover lift 1px, active compress 97%
- `.card-tilt` — preserve-3d transform-style for 3D card tilt
- `.frame-card-hover` — translateY(-2px) + gold border
- `.scene-stagger` / `.card-stagger` — 8-item stagger at 40ms
- `.anim-studio-unfold` — 600ms spring on studio entry
- Idle detection (10s) triggers compass sway + constellation on landing

### New Components
- `ConstellationLoader` — animated SVG constellation for AI thinking state
- `GraniteNotification` — slide-down toast with gold glow, auto-dismiss
- `EmptyBlueprintState` — sequenced SVG blueprint draw with delayed CTA
- `StudioInspector` — sun-angle arc dial, exposure/lens sliders, palette swatches
- `SceneIndex` — search + staggered scene list
- `StoryboardCanvas` — scene breadcrumb + horizontal scroll canvas
- `ThemeToggle` — CSS-variable-driven animated sun/moon pill
- `ShotPlanner` — per-shot planning with individual image generation
- `CharacterPackagePage` — full 12-tab character reference package studio

### Not Yet Surfaced in Nav (built, available)
- `DocsPage.tsx` — script templates and pipeline tips (can be added as compass quadrant)
- `WorkspacePage.tsx` — exists but superseded by `StudioPage`

---

## Known Limitations / Future Work

| Item | Notes |
|---|---|
| Package persistence | Character packages are session-only (React state). Images are lost on page refresh. Would require a new DB table or object storage (IBM COS) to persist. |
| Sub-Task 20 — Line tinting | Pending. Client-side CSS `mix-blend-mode: multiply` overlay on B&W frames. |
| Sub-Task 21 — Lighting re-render | Pending. Wire inspector sliders to `POST /forge-standalone-storyboard` for live re-render. |
| `DocsPage` / `WorkspacePage` | Built but not wired into navigation. |
| Role-based relationship inference | Current relationship graph infers from scene co-appearances only. Could be improved with LLM-based relationship extraction from script text. |

---

## Issues Log — Problems Encountered & How They Were Solved

> Chronological record of every non-trivial problem hit during development.

---

### Issue 1 — `.venv` hardcoded to old workspace path

**Symptom:** `uvicorn app.main:app --reload` failed with `ModuleNotFoundError` after project moved/renamed.

**Root Cause:** `.venv/bin/python` symlink hardcoded to old absolute path.

**Fix:** Deleted `.venv` and recreated:
```bash
cd BaseBoardAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

### Issue 2 — `@types/jszip` does not exist on npm

**Symptom:** `npm install @types/jszip` failed with "package not found".

**Root Cause:** `jszip` v3+ ships its own TypeScript declarations. No separate `@types/jszip` exists.

**Fix:** Removed `@types/jszip` from `devDependencies`. Works with full type safety out of the box.

---

### Issue 3 — Tailwind v4 PostCSS integration

**Symptom:** Tailwind utility classes not processed; blank styles in browser.

**Root Cause:** Tailwind v4 changed the PostCSS plugin package name.

**Fix:**
```js
// postcss.config.js
export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } }
```
```css
/* index.css */
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));
```

---

### Issue 4 — `SYSTEM_PROMPT` import error in `llm.py`

**Symptom:** `ImportError: cannot import name 'SYSTEM_PROMPT' from 'app.core.prompts'`.

**Fix:** Renamed constant from `SYSTEM_PROMPT` to `STORYBOARD_PROMPT`.

---

### Issue 5 — Dark mode Tailwind classes not applying

**Symptom:** `dark:bg-[...]` classes had no effect.

**Root Cause:** Tailwind v4 class-based dark variant doesn't generate correct selectors for `dark:` prefix with custom variant syntax.

**Fix:** Replaced all `dark:` classes with inline `style` props referencing CSS variables (`var(--gold)`, `var(--bg-base)`, etc.).

---

### Issue 6 — `ThemeToggle` hardcoded colours broke after redesign

**Symptom:** Toggle pill showed old purple/grey colours after gold/dark redesign.

**Fix:** Replaced Tailwind colour classes with `style={{ background: isDark ? '#1a1510' : '#e4dccb' }}`.

---

### Issue 7 — `StudioPage` missing `onNotify` prop

**Symptom:** TypeScript error: `Property 'onNotify' does not exist on type 'IntrinsicAttributes & Props'`.

**Fix:** Added `onNotify?: (msg: string, type?: 'success' | 'info') => void` to `StudioPage` Props and threaded it to `PipelineForm`.

---

### Issue 8 — CORS: `OPTIONS /storyboard/forge-pipeline → 405 Method Not Allowed`

**Symptom:** All API calls failed with `"Failed to fetch"`. Backend logged `405` on OPTIONS preflight.

**Fix:** Added `CORSMiddleware` to `app/main.py` with `allow_methods=["*"]`.

---

### Issue 9 — `useCallback` called inside `.map()` — Rules of Hooks violation

**Symptom:** React runtime error: *"React Hook useCallback cannot be called inside a callback"*.

**Fix:** Replaced `onMouseEnter={useCallback(...)}` inside `.map()` with plain inline arrow functions.

---

### Issue 10 — Compass card hover `transform` overriding entrance animation

**Symptom:** Hovering a compass card snapped it back to center then scaled up.

**Root Cause:** Hover Tailwind class set `transform: scale(1.06)` which *replaced* the `translateX(-200px)` position transform.

**Fix:** Composed transforms in a single value: `transform: baseTransform + hoverScale` (e.g. `"translateX(-200px) scale(1.06)"`).

---

### Issue 11 — "Failed to fetch" showing raw error string in Genesis Engine

**Symptom:** Backend unreachable showed unhelpful raw `"Failed to fetch"` string.

**Fix:**
```ts
if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
  msg = 'Cannot reach the backend.\n\nMake sure the server is running:\ncd BaseBoardAI/backend && source .venv/bin/activate && uvicorn app.main:app --reload'
}
```

---

### Issue 12 — Logo on Genesis pages was non-interactive

**Symptom:** Clicking `B / BASEBOARD AI` on Genesis pages did nothing.

**Fix:** Added `onLanding: () => void` prop to `GenesisUploadPage` and `GenesisEnginePage`. Changed logo `<div>` to `<button onClick={onLanding}>`. Wired from `App.tsx`.

---

### Issue 13 — WatsonX model `ibm/granite-13b-chat-v2` no longer supported

**Symptom:** Genesis Engine failed with `"Model 'ibm/granite-13b-chat-v2' is not supported for this environment"`.

**Fix:** Changed default model to `meta-llama/llama-3-3-70b-instruct` in `config.py` and `.env`. Added 4-model fallback chain in `llm.py` for future rate-limit resilience.

---
