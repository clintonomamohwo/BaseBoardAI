# BaseBoard AI — Master Implementation Plan

## Top-Level Overview

**Goal:** Bring the BaseBoard AI frontend from a bare Vite/React skeleton into a
fully-functional PreViz workstation that satisfies the locked Master Technical Brief.
The backend pipeline (Sub-Tasks 1–8) is **100% complete** and ships with:

- 3-Stage Granite LLM pipeline (character → world → storyboard)
- Pollinations.ai + Hugging Face image generation, base64-encoded, stored in SQLite
- Full FastAPI CRUD + 4 pipeline endpoints
- Pydantic v2 schemas and SQLAlchemy ORM with deferred image column
- `render_style` field (bw_sketch | flat_color | full_shaded) on pipeline request + ORM
- `reference_style_image` Base64 img2img support with 3-branch dispatch
- Three img2img providers: Pollinations text-only, Pollinations img2img, HF img2img
- `HF_IMG2IMG_MODEL` config key + `.env.example` updated

The **frontend is fully built** — all planned sub-tasks 9–19 are complete, the app has
been redesigned to match the premium cinematic reference, and a comprehensive motion
system has been implemented.

**Current App Flow:**
1. **Landing Page** — rotating compass, gold title, "Enter Studio →" CTA
2. **Compass Navigation** — radial 4-point nav (Storyboard · Characters · World Bible · Inspector)
3. **Studio** — 44px top bar, 3-tab nav, full 3-panel workspace

**Completed beyond original scope:**
- Full premium redesign matching the cinematic gold/dark reference image
- Comprehensive CSS motion system (22 keyframes, stagger classes, tab morph, idle)
- Dark/light theme toggle with animated sun/moon (CSS variable driven)
- Granite AI constellation loading animation during pipeline execution
- Blueprint draw empty state with sequenced SVG reveals
- Frame card 3D mouse-tracking tilt effect
- Idle compass sway + constellation after 10s inactivity
- Granite AI notification toasts (slide-down, gold glow, auto-dismiss)
- Character Dictionary page with portrait grid
- World Bible page with parchment-style location cards + sub-tabs
- Studio Inspector with sun-angle arc dial, exposure/lens sliders, palette swatches

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

---

### Sub-Task 5 — Wire pipeline endpoints

**Status:** `[x] done`

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
- `render_style: Literal['bw_sketch', 'flat_color', 'full_shaded']` on `PipelineExecutionRequest` and `StoryboardProjectCreate`
- `render_style: str` on `StoryboardProjectResponse`
- `render_style: Mapped[str]` column on `StoryboardProjectORM`
- `STORYBOARD_PROMPT` updated with `{render_style}` + `{global_aesthetic}` template variables
- `invoke_storyboard_stage()` accepts and passes `render_style`
- Router passes `payload.render_style` through the full pipeline
- Old `baseboard.db` deleted; SQLite auto-recreates on next startup

---

### Sub-Task 8c — Add `reference_style_image` to schema + img2img image engine

**Status:** `[x] done`

**What was built:**
- `reference_style_image: str | None` on `PipelineExecutionRequest` (ephemeral — never stored to DB)
- `HF_IMG2IMG_MODEL` config key added to `config.py` and `.env.example`
- `_strip_data_url_header()`, `_BW_SKETCH_NEGATIVE_CONSTRAINTS`, `_inject_sketch_constraints()` in `image.py`
- `_generate_pollinations_img2img()` and `_generate_huggingface_img2img()` provider functions
- 3-branch dispatch in `generate_frame_image()`:
  - Branch 1: `bw_sketch` + reference → sketch-intersection path (strength=0.78)
  - Branch 2: reference + other style → standard img2img (strength=0.55)
  - Branch 3: no reference → existing text-to-image
- Router image loops updated to pass `reference_style_image` and `render_style`

---

### Sub-Task 9 — TypeScript types layer

**Status:** `[x] done`

**What was built:**
- `BaseBoardAI/frontend/src/types/storyboard.ts` with all interfaces
- `RenderStyle` union type exported separately
- `FrameExportItem` interface
- `PipelineExecutionRequest` includes `render_style`, `global_aesthetic`, `reference_style_image` as separate fields
- `jszip` + `file-saver` + `@types/file-saver` added to `package.json` and installed

---

### Sub-Task 10 — App shell, navigation, and routing

**Status:** `[x] done` *(exceeded scope — full premium redesign)*

**What was built:**
- `LandingPage.tsx` — rotating compass SVG, gold title with glow, "Enter Studio →" CTA
- `CompassNavPage.tsx` — radial 4-point compass navigation with gold ring animation
- Studio top bar — 44px, gold `B` logo (clicks → landing), 3-tab nav with underline active state
- `ThemeToggle` — animated sun/moon sliding thumb, fully CSS-variable-driven (works in both themes)
- Granite Active pulse dot + status in header
- `useEffect` idle detection (10s) drives landing page constellation + compass sway animations
- Granite AI notification system — `GraniteNotification` component, auto-dismiss at 3.5s
- Dark/light CSS variable tokens: `--bg-base`, `--bg-surface`, `--bg-raised`, `--border`, `--gold`, `--gold-dim`, `--cyan`
- `body` background/color transitions on theme switch (400ms ease)

---

### Sub-Task 11 — Pipeline input form + API client

**Status:** `[x] done`

**What was built:**
- `BaseBoardAI/frontend/src/api/storyboard.ts` — `forgePipeline`, `listProjects`, `getProject`, `deleteProject`
- `PipelineForm.tsx` — all fields, render style toggle buttons, constellation loader during execution
- `ConstellationLoader.tsx` — animated SVG nodes + connecting lines, "Granite AI / Thinking…" label
- Scan-line animation overlay during pipeline execution
- `onNotify` callback wired through form → App notifications
- `VITE_API_URL` `.env.local` created

---

### Sub-Task 12 — Screenplay scene list + frame stream canvas

**Status:** `[x] done` *(exceeded scope — full studio layout)*

**What was built:**
- `SceneIndex.tsx` — search input, staggered scene list (40ms apart), gold active border, hover transitions
- `StoryboardCanvas.tsx` — scene breadcrumb header, horizontal scroll frame grid, player toggle
- `StudioPage.tsx` — full 3-panel layout (col-2 index + col-7 canvas + col-3 inspector)
- `EmptyBlueprintState.tsx` — sequenced SVG blueprint draw, compass assembles, "Begin Your First Story" CTA with delayed fade-in
- Studio entry uses `anim-studio-unfold` (600ms spring)

---

### Sub-Task 13 — Render style selector

**Status:** `[x] done`

**What was built:**
- Render style toggle buttons inline in `PipelineForm` (gold fill = active, border = inactive)
- Active style wired to `PipelineExecutionRequest.render_style` (separate from `global_aesthetic`)
- `renderStyleLabel` badge displayed in `StoryboardCanvas` header

---

### Sub-Task 14 — Director's Inspector panel (palette + lighting)

**Status:** `[x] done` *(exceeded scope)*

**What was built:**
- `StudioInspector.tsx` — full right panel with:
  - Lighting mood dropdown
  - **Sun angle arc dial** — SVG arc with draggable `<input type="range">`, animated fill + circle indicator
  - Exposure slider (0–1, 2dp display)
  - Lens slider (14–200mm display)
  - Color valence dropdown
  - Palette swatches with `<input type="color">` overlay
  - Style Reference Uploader section at bottom

---

### Sub-Task 15 — Animatic player

**Status:** `[x] done`

**What was built:**
- `AnimaticPlayer.tsx` — `useEffect` timeout loop, gold timeline scrubber, ⏮ / ▶/⏸ controls
- Player view mode in `StudioPage` with "← Storyboard" back button

---

### Sub-Task 16 — Export layer (per-frame PNG + batch ZIP)

**Status:** `[x] done`

**What was built:**
- `exportFrames.ts` — `downloadFramePng`, `prepareFrameBatch`, `prepareLockedCut`, `buildManifestMd`, `exportLockedCutZip`
- `BatchExportBar.tsx` — locked/total count, "Export ZIP" button
- Per-frame ↓ download button on each `FrameCard` (hover reveal)
- ★ lock button on each `FrameCard` (hover reveal, gold fill when locked)

---

### Sub-Task 17 — The Vault + Locked Cut Folder UI

**Status:** `[x] done`

**What was built:**
- `VaultGrid.tsx` — all frames across all scenes
- `LockedCutFolder.tsx` — filtered to locked frames, empty state
- View mode tabs in `StudioPage`: Gallery | Player | Vault | Locked Cut
- `selectedKeys: Map<string, boolean>` in `StudioPage` state
- Lock count badge on "Locked Cut" tab

---

### Sub-Task 18 — Project Library page

**Status:** `[x] done`

**Note:** Project Library was built but is no longer surfaced as a separate nav page in the
redesigned app. The flow is now Landing → Compass → Studio. Projects are loaded by
running the pipeline from the Studio. This is intentional — the compass navigation replaced
the flat page-based nav. Can be re-added as a compass quadrant if needed.

---

### Sub-Task 19 — Docs page (script template shortcuts)

**Status:** `[x] done`

**Note:** `DocsPage.tsx` exists with script templates and pipeline tips. Not surfaced in
the compass nav in the current redesign — can be added as a 5th compass point.

---

### Sub-Task 20 — Line tinting filter (stretch goal)

**Status:** `[ ] pending`

**Intent:**
When render style is `bw_sketch`, show a tint color picker in `StudioInspector`.
Apply chosen colour as a `mix-blend-mode: multiply` overlay on frame images — pure
client-side CSS, zero backend re-inference.

**Todo List:**
1. Add `lineTintColor: string | null` to `StudioPage` state
2. Pass it down to `StudioInspector` and all `FrameCard` instances
3. Add "Line Tint" section to `StudioInspector` — only visible when `render_style === 'bw_sketch'`
4. Preset swatches: `#FF1493` (Neon Pink), `#00D4FF` (Viewport Cyan), `#FFFFFF` (reset)
5. Free `<input type="color">` for custom tint
6. In `FrameCard` image wrapper: sibling `<div>` with `backgroundColor: lineTintColor`,
   `mixBlendMode: 'multiply'`, `opacity: 0.6`, `position: absolute, inset: 0`
   — only rendered when `lineTintColor !== null && renderStyle === 'bw_sketch'`

---

### Sub-Task 21 — Lighting + shadow re-render controls (stretch goal)

**Status:** `[ ] pending`

**Intent:**
Wire the lighting mood / exposure / lens controls in `StudioInspector` to trigger a
backend re-render of the currently selected frame via
`POST /storyboard/forge-standalone-storyboard` with modified `lighting_notes`.

**Todo List:**
1. Add `reforgeFrame` to `BaseBoardAI/frontend/src/api/storyboard.ts`
2. Track "dirty" state in `StudioInspector` when lighting controls change
3. Render "Apply Lighting →" button when dirty (gold, `btn-tactile`)
4. On click: construct minimal `StandaloneStoryboardRequest` from current project context + new params
5. Call `reforgeFrame`, update specific frame's `generated_image_url` in `StudioPage` state
6. Show `ConstellationLoader` overlay on the specific `FrameCard` while re-render is in-flight

---

## Completed Beyond Original Scope

### Premium Redesign (cinematic reference match)
- `LandingPage` — compass, gold glow, "Modern Heritage" tag
- `CompassNavPage` — radial 4-quadrant SVG navigation
- `CharacterDictionaryPage` — portrait grid with initials avatar, role filter tabs, search
- `WorldBiblePage` — parchment location cards, sub-tabs (Locations · Factions · Lore · Artifacts · Timelines)
- All colours migrated to CSS variables (`var(--bg-base)`, `var(--gold)`, etc.)

### Motion System
- 22 CSS keyframes covering: blueprint draw, studio unfold, tab morph, scene stagger,
  card rise, gold assemble, constellation node/line, scan line, notification enter/exit,
  idle compass sway, blueprint reveal
- `.btn-tactile` — hover lift 1px, active compress 97%, 100ms transitions
- `.card-tilt` — preserve-3d transform-style for 3D card tilt
- `.frame-card-hover` — translateY(-2px) + gold border on hover
- `.scene-stagger` / `.card-stagger` — 8-item stagger at 40ms intervals
- `.anim-studio-unfold` — 600ms spring on studio entry
- `.anim-tab-in` / `.anim-tab-out` — tab morph fold animation
- `.anim-gold-assemble` — blur-to-sharp image reveal
- Idle detection (10s) triggers compass sway + constellation on landing page

### New Components
- `ConstellationLoader` — animated SVG constellation for AI thinking state
- `GraniteNotification` — slide-down toast with gold glow, auto-dismiss
- `EmptyBlueprintState` — sequenced SVG blueprint draw with delayed CTA
- `StudioInspector` — full inspector with sun-angle arc dial, exposure/lens sliders
- `SceneIndex` — search + staggered scene list
- `StoryboardCanvas` — scene breadcrumb + horizontal scroll canvas
- `ThemeToggle` — CSS-variable-driven animated sun/moon pill

---

## Issues Log — Problems Encountered & How They Were Solved

> Chronological record of every non-trivial problem hit during development.

---

### Issue 1 — `.venv` hardcoded to old workspace path

**Symptom:** `uvicorn app.main:app --reload` failed immediately with `ModuleNotFoundError` or Python path errors after the project was moved / renamed from `IBM Project/...` to the current path.

**Root Cause:** The `python` binary inside `.venv/bin/python` is a symlink or contains a hardcoded shebang pointing to the old absolute path. Moving a virtualenv between directories breaks it.

**Fix:** Deleted the entire `.venv` directory and recreated it from scratch:
```bash
cd BaseBoardAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

### Issue 2 — `@types/jszip` does not exist on npm

**Symptom:** `npm install @types/jszip` failed with "package not found".

**Root Cause:** `jszip` v3+ ships its own TypeScript declarations inside the package itself (`jszip/index.d.ts`). A separate `@types/jszip` DefinitelyTyped package was never published for v3.

**Fix:** Removed `@types/jszip` from `devDependencies`. `jszip` works with full type safety out of the box from its bundled declarations.

---

### Issue 3 — Tailwind v4 PostCSS integration

**Symptom:** `vite build` / `npm run dev` failed — Tailwind utility classes not processed; blank styles in browser.

**Root Cause:** Tailwind v4 changed the PostCSS plugin package. The old `tailwindcss` entry in `postcss.config.js` no longer works as a PostCSS plugin in v4.

**Fix:** Installed `@tailwindcss/postcss` and updated `postcss.config.js`:
```js
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```
Also updated `index.css` to use the v4 import syntax:
```css
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));
```

---

### Issue 4 — `SYSTEM_PROMPT` import error in `llm.py`

**Symptom:** `ImportError: cannot import name 'SYSTEM_PROMPT' from 'app.core.prompts'` on backend startup.

**Root Cause:** The original codebase named the storyboard prompt constant `SYSTEM_PROMPT` in `prompts.py`, but `llm.py` was later refactored to import it as `STORYBOARD_PROMPT` for clarity.

**Fix:** Renamed the constant in `app/core/prompts.py` from `SYSTEM_PROMPT` to `STORYBOARD_PROMPT` to match the import in `llm.py`.

---

### Issue 5 — Dark mode Tailwind classes not applying

**Symptom:** Components using `dark:bg-[...]` or `dark:text-[...]` Tailwind classes had no effect in dark mode.

**Root Cause:** Tailwind v4 with a class-based dark variant (`@variant dark (&:where(.dark, .dark *))`) doesn't recognise the standard `dark:` prefix in the same way as v3. The `.dark` class is on `<html>` but Tailwind's JIT wasn't generating the correct selectors for the custom variant syntax.

**Fix:** Replaced all `dark:` Tailwind classes with inline `style={{ ... }}` props referencing CSS variables (`var(--gold)`, `var(--bg-base)`, etc.). CSS variables automatically reflect the active theme since they are defined on `:root` (light) and `.dark` (dark) — no Tailwind class generation needed.

---

### Issue 6 — `ThemeToggle` hardcoded colours broke after redesign

**Symptom:** The theme toggle pill showed `bg-slate-200 dark:bg-[#2D1B69]` — colours from the old design, visible as a purple/grey pill after the gold/dark redesign.

**Root Cause:** The component used literal Tailwind colour classes that predated the CSS variable system.

**Fix:** Replaced static classes with React state-driven `style={{ background: isDark ? '#1a1510' : '#e4dccb' }}` referencing the same values as the CSS variables.

---

### Issue 7 — `StudioPage` missing `onNotify` prop

**Symptom:** TypeScript error: `Property 'onNotify' does not exist on type 'IntrinsicAttributes & Props'`.

**Root Cause:** `StudioPage` was originally self-contained and had no notification callback. After adding `GraniteNotification` toasts to `App.tsx`, the pipeline needed a way to push notifications upward.

**Fix:** Added `onNotify?: (msg: string, type?: 'success' | 'info') => void` to `StudioPage`'s `Props` interface and threaded it down to `PipelineForm`.

---

### Issue 8 — CORS: `OPTIONS /storyboard/forge-pipeline → 405 Method Not Allowed`

**Symptom:** Every API call from the frontend failed with `"Failed to fetch"`. Backend logs showed:
```
127.0.0.1 - "OPTIONS /storyboard/forge-pipeline HTTP/1.1" 405 Method Not Allowed
```

**Root Cause:** Modern browsers send an `OPTIONS` preflight request before any cross-origin `POST` with a JSON body. FastAPI had no route registered for `OPTIONS` on any endpoint, so it returned 405. Without CORS headers in the preflight response the browser blocked the actual `POST` entirely.

**Fix:** Added `CORSMiddleware` to `app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Backend restart required after this change for the middleware to register.

---

### Issue 9 — `useCallback` called inside `.map()` — Rules of Hooks violation

**Symptom:** React runtime error: *"React Hook useCallback cannot be called inside a callback"* when hovering compass nav cards.

**Root Cause:** During the CompassNavPage hover-state refactor, `useCallback` was incorrectly placed inside the `SECTIONS.map(...)` render loop — a clear violation of the Rules of Hooks (hooks must only be called at the top level of a component).

**Fix:** Replaced `onMouseEnter={useCallback(() => setHoveredId(s.id), [s.id])}` with plain inline arrow functions:
```tsx
onMouseEnter={() => setHoveredId(s.id)}
onMouseLeave={() => setHoveredId(null)}
```
For simple state-setter calls there is no memoisation benefit anyway.

---

### Issue 10 — Compass card hover `transform` overriding entrance animation

**Symptom:** Hovering a compass card during/after the entrance animation would snap the card back to center (transform reset), then scale up — breaking the positioned layout.

**Root Cause:** The card's `transform` was set to either `NODE_TRANSFORMS[s.dir]` (e.g. `translateX(-200px)`) or `translate(0,0)`. Hover was applied via a Tailwind `hover:` class that set `transform: scale(1.06)` — which *replaced* the translate, destroying the cardinal position.

**Fix:** Composed the transforms in a single value:
```tsx
const baseTransform = nodesVisible ? NODE_TRANSFORMS[s.dir] : 'translate(0,0)'
const hoverScale    = isHovered ? ' scale(1.06)' : ' scale(1)'
// applied as: transform: baseTransform + hoverScale
// → e.g. "translateX(-200px) scale(1.06)"
```
Simultaneously switched the `transition` spec: slow entrance delays (`400ms … 400ms delay`) are only active while `nodesVisible === false`; once cards are in position the transition collapses to a fast `180ms` hover spec.

---

### Issue 11 — "Failed to fetch" showing raw error string in Genesis Engine

**Symptom:** When the backend wasn't running, the Genesis Engine error panel showed the unhelpful raw string `"Failed to fetch"` with no guidance.

**Fix:** Added a detection branch in the `catch` block of `GenesisEnginePage`:
```ts
if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
  msg = 'Cannot reach the backend. Make sure the server is running:\n\ncd BaseBoardAI/backend && source .venv/bin/activate && uvicorn app.main:app --reload'
}
```
Toast notification also changed from the raw message to `"Backend unreachable — is the server running?"`.

---

### Issue 12 — Logo on Genesis pages was non-interactive

**Symptom:** Clicking `B / BASEBOARD AI` on the Genesis Upload and Genesis Engine pages did nothing — it was a plain `<div>`, not a button.

**Fix:** Added `onLanding: () => void` prop to both `GenesisUploadPage` and `GenesisEnginePage`. Changed the logo `<div>` to a `<button onClick={onLanding}>` in both files. Wired `onLanding={() => setView('landing')}` from `App.tsx`.

---

### Issue 13 — WatsonX model `ibm/granite-13b-chat-v2` no longer supported

**Symptom:** Genesis Engine failed immediately with:
```
Character stage LLM inference failed: Model 'ibm/granite-13b-chat-v2' is not supported
for this environment.
```

**Root Cause:** The IBM WatsonX environment was updated and `ibm/granite-13b-chat-v2` was removed from the supported model list. The model ID was hardcoded in both `app/core/config.py` (default) and `.env` (override).

**Fix:** Changed the model to `meta-llama/llama-3-3-70b-instruct` — the most capable instruction-tuned chat model in the current supported list. Updated in two places:
- `BaseBoardAI/backend/app/core/config.py` — `WATSONX_MODEL_ID` default value
- `BaseBoardAI/backend/.env` — `WATSONX_MODEL_ID` env override

Backend restart picks up the change immediately (uvicorn `--reload` watches `.env` via pydantic-settings).

---
