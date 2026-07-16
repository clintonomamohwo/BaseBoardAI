# BaseBoard AI — Master Implementation Plan

## Top-Level Overview

**Goal:** Bring the BaseBoard AI frontend from a bare Vite/React skeleton into a
fully-functional PreViz workstation that satisfies the locked Master Technical Brief.

**Current Status: Phase 1 complete. Phase 2 (Cinematic Director Engine) now planned.**

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

## Phase 2 — Cinematic Director Engine

### The Problem

The current storyboard generation pipeline produces **visually repetitive results**.

When the LLM Storyboard Orchestrator runs Stage 3 of the Genesis Engine, it receives
character and world context and a screenplay chunk — then produces shot-type and
camera-angle data per frame. However, both the LLM and the downstream image model
(Pollinations Flux) exhibit a strong natural bias: they default to **dialogue-heavy
close-ups** as the statistically most common framing in their training data.

This manifests as:

| Symptom | Root Cause |
|---|---|
| 5–7 consecutive close-up frames in a row | LLM selects `close_up` as default shot type |
| Flat, similar compositions across diverse scenes | No composition diversity constraint enforced |
| No lens language (all frames look like a 50mm) | Focal length is never specified in prompts |
| Costume changes go undetected | No cross-frame continuity tracking |
| Editing pace feels monotonous | No shot-rhythm planning or pacing engine |

The core architectural issue: **`image.py` is being asked to direct scenes it was only
meant to render.** Directing decisions — what shot, what lens, what pacing, what
continuity — are being made implicitly inside the generation prompt rather than
explicitly by a planning layer that runs before generation begins.

---

### The Solution — Cinematic Director Engine

BaseBoard evolves from a prompt-to-image tool into an **AI Assistant Director** that
plans the entire visual composition of a storyboard _before_ any image is generated.

A new Director Engine layer sits between the Storyboard Orchestrator (LLM) and the
Image Generator (Pollinations / HF). It receives the raw storyboard produced by the
LLM, applies professional cinematography rules, and returns an **Optimized Storyboard**
with explicit shot types, lens recommendations, pacing metadata, and continuity checks
attached to every frame — before the image pipeline fires.

**Revised pipeline:**

```
Story Upload
        │
        ▼
Document Intelligence
        │
        ▼
Narrative Parser
        │
        ▼
Production Knowledge Graph
        │
        ▼
🎬 Director Engine          ← NEW (runs before image generation)
        │
 ┌──────┼────────────┐
 │      │            │
 ▼      ▼            ▼
Shot Planner
Lens Planner
Continuity Engine
        │
        ▼
Prompt Builder             ← ENHANCED (assembles enriched prompts)
        │
        ▼
Image Generator            ← UNCHANGED (Pollinations / HF)
        │
        ▼
Storyboard Studio
```

**New backend module layout:**

```
backend/app/core/
    director_engine.py      ← orchestrates all cinematic planning
    shot_balancer.py        ← composition diversity scoring + rebalancing
    lens_planner.py         ← per-frame focal length + depth style assignment
    continuity_engine.py    ← cross-asset consistency + change propagation
    prompt_builder.py       ← assembles enriched prompts from director metadata
    image.py                ← image generation only (no more directing logic)
```

**Design principles:**
- Each responsibility lives in its own module — no monolithic `image.py` directing
- All AI decisions are overridable: user locks always take precedence
- Extensible plug-in points so future features (director presets, camera movement
  planning, shot list optimisation) attach to `director_engine.py` without major refactoring
- Assets remain non-destructively editable at every stage

---

### Sub-Task 23 — Director Engine core (`director_engine.py`)

**Status:** `[x] done`

**Issue faced in plan:** No single component was responsible for cinematic planning.
Shot decisions bled into the LLM prompt and image-generation prompt ad-hoc, making it
impossible to enforce composition rules, lens language, or pacing systematically.
Every new cinematography feature would require editing `image.py`, causing the file to
grow into an unmanageable monolith.

**Solution approach:** Introduced `director_engine.py` as the single orchestration
entry point — `direct_storyboard(scenes)` — that runs after Stage 3 LLM output and
before the image loop. It delegates to `shot_balancer`, `lens_planner`, and
`continuity_engine`, then returns an enriched storyboard. New cinematography features
plug into `director_engine.py` without touching `image.py`.

**Problem addressed:** No single component is responsible for cinematic planning. Shot
decisions bleed into the LLM prompt and image-generation prompt ad-hoc, producing
inconsistent results with no systematic quality control.

**What to build:**

Entry point function:
```python
direct_storyboard(storyboard: list[ScriptSceneBase], project_settings: dict) -> list[ScriptSceneBase]
```

Responsibilities:
- Call `shot_balancer.py` to audit and rebalance composition distribution
- Call `lens_planner.py` to assign `lens`, `focal_length`, `depth_style` to every frame
- Call `continuity_engine.py` to flag cross-frame character/environment inconsistencies
- Apply scene-type profiles (dialogue / action / romance / horror / etc.) to enforce
  preferred composition ratios per scene category
- Maintain cinematic rhythm — no more than N consecutive identical shot types
- Return the enriched storyboard to `llm.py` pipeline before `generate_frame_image()` is called

**Wire-up:** In `llm.py` `run_full_pipeline()`, call `direct_storyboard()` after Stage 3
LLM output and before the image generation loop.

---

### Sub-Task 24 — Shot Balancer (`shot_balancer.py`)

**Status:** `[x] done`

**Issue faced in plan:** The only composition rule in the system was the comment
`"at least 2 close-ups"` in `STORYBOARD_PROMPT`. This produced 5–7 consecutive
close-up frames in a row with no mechanism to detect over-representation or inject
missing shot types dynamically. A formula bug (`1.0 - penalty / max(1, total) * total`)
also caused the diversity score to be computed incorrectly due to operator precedence.

**Solution approach:** Built `shot_balancer.py` with a 10-type weighted scoring
system and a configurable threshold map. `balance_shot_distribution()` counts frequency
across all frames, penalises overused types, and injects replacements from a rotation
pool. The formula bug was fixed to `1.0 - (penalty / total)`. The Director Engine
calls this before any image is generated.

**Problem addressed:** The current `STORYBOARD_PROMPT` contains a comment `"at least 2
close-ups"` as the only composition rule. This is a hard-coded two-item rule that cannot
detect over-representation dynamically or auto-correct the distribution.

**What to build:**

Tracked shot types:
```
wide | medium | close | extreme_close | ots | pov | drone | tracking | insert | establishing
```

Core function:
```python
balance_shot_distribution(
    scenes: list[ScriptSceneBase],
    thresholds: dict[str, float] | None = None
) -> list[ScriptSceneBase]
```

Logic:
1. Count shot-type frequency across all frames → compute `Composition Diversity Score`
2. For each type that exceeds its configured threshold, flag the next occurrence as a
   candidate for replacement
3. Inject missing composition types that fall below minimum floor percentages
4. Return rebalanced frame list with `shot_balance_flag` metadata per adjusted frame

Default threshold config (overridable via `project_settings`):
```python
DEFAULT_THRESHOLDS = {
    "close":        0.40,   # never exceed 40 % of total frames
    "medium":       0.45,
    "wide":         0.35,
    "establishing": 0.15,
}
```

Composition Diversity Score formula:
```
score = 1 - (sum of max(0, freq - threshold) for all types) / total_frames
```

---

### Sub-Task 25 — Lens Planner (`lens_planner.py`)

**Status:** `[x] done`

**Issue faced in plan:** No lens or focal-length data existed anywhere in the schema.
Every frame was implicitly rendered at a neutral 50mm-equivalent because nothing
told the image model otherwise. Action scenes looked identical to intimate dialogue
scenes. The `StoryboardFrame` schema had no `lens`, `focal_length`, or `depth_style`
fields, so there was nowhere to store or propagate this data.

**Solution approach:** Added `lens`, `focal_length`, `depth_style`, and
`lens_prompt_suffix` to `StoryboardFrameBase` (schema + ORM). Built `lens_planner.py`
with 12 scene-type profiles and keyword-based `detect_scene_type()`. `assign_lens()`
populates all four fields per frame. `prompt_builder.py` appends the suffix to every
generated image prompt automatically.

**Problem addressed:** Every frame currently receives an identical implicit "standard"
focal length because no lens metadata exists in the schema. Image prompts do not specify
lens characteristics, so the image model defaults to a neutral 50mm-equivalent look for
every shot — removing the visual language that differentiates scene types.

**What to build:**

New fields added to `StoryboardFrame` schema:
```python
lens: str | None          # e.g. "85mm portrait lens"
focal_length: str | None  # e.g. "85mm"
depth_style: str | None   # e.g. "shallow bokeh", "deep focus", "rack focus"
```

Core function:
```python
assign_lens(frame: StoryboardFrameBase, scene_type: str) -> StoryboardFrameBase
```

Default scene-type → lens mapping:
```
establishing   → 24mm Anamorphic,  deep focus
dialogue       → 50mm,             shallow bokeh
intimate       → 85mm,             shallow bokeh
action         → 35mm Tracking,    deep focus
epic           → 18mm Ultra Wide,  deep focus
horror         → 28mm,             unsettling distortion
romance        → 85mm,             shallow bokeh
comedy         → 35mm,             normal focus
sci_fi         → 24mm Anamorphic,  deep focus
fantasy        → 21mm,             deep focus
```

Lens data is appended to the image prompt by `prompt_builder.py` as a cinematic
modifier: `"shot on 85mm lens, shallow depth of field"`.

---

### Sub-Task 26 — Scene-Type Profiles (in `director_engine.py`)

**Status:** `[x] done`

**Issue faced in plan:** All scenes were treated identically regardless of dramatic
context. A horror confrontation and a romantic dinner received the same composition
ratios because no genre-specific profile system existed. The LLM only had the generic
`STORYBOARD_PROMPT` to guide shot selection, with no feedback loop from scene category
back to composition targets.

**Solution approach:** `detect_scene_type()` in `lens_planner.py` uses keyword and
emotional-tone heuristics to classify each scene into one of 9 categories
(dialogue / action / romance / comedy / horror / mystery / fantasy / sci_fi /
adventure). `director_engine.py` uses `_SCENE_TYPE_PROFILES` — a per-category
composition ratio map — as the target distribution when `shot_balancer.py` runs its
rebalancing pass. Falls back to `"dialogue"` profile if undetermined.

**Problem addressed:** All scenes are currently treated identically regardless of genre or
dramatic context. A horror confrontation and a romantic dinner produce the same shot
distribution because the LLM has no genre-specific composition guidance beyond the generic
`STORYBOARD_PROMPT`.

**What to build:**

Supported scene categories (auto-detected from LLM scene metadata + action text):
```
dialogue | action | romance | comedy | horror | mystery | fantasy | sci_fi | adventure
```

Preferred composition ratios per category:

| Category | Wide | Medium | OTS | Close | Tracking | Insert | Establishing |
|---|---|---|---|---|---|---|---|
| dialogue | 10% | 35% | 25% | 20% | — | 10% | — |
| action | 35% | 20% | — | 15% | 30% | — | — |
| romance | 5% | 20% | 20% | 35% | — | 20% | — |
| horror | 15% | 20% | — | 30% | — | 20% | 15% |
| mystery | 20% | 25% | 15% | 25% | — | 15% | — |
| fantasy | 30% | 25% | — | 20% | — | 10% | 15% |
| sci_fi | 25% | 25% | — | 20% | 15% | 10% | 5% |
| adventure | 35% | 25% | — | 20% | 15% | — | 5% |

`detect_scene_type(scene: ScriptSceneBase) -> str` — keyword + emotional-tone heuristic
detection, falls back to `"dialogue"` if undetermined.

---

### Sub-Task 27 — Continuity Engine (`continuity_engine.py`)

**Status:** `[x] done`

**Issue faced in plan:** Changing any canonical asset (a character's hair, an outfit,
a location detail) had zero propagation. Every frame was generated independently, so
after any edit the project silently drifted into visual inconsistency with no mechanism
to find the affected assets. Users had no choice but to re-run the full pipeline to
restore consistency.

**Solution approach:** Built `continuity_engine.py` with `scan_continuity_impact()` —
it inspects every scene and frame's action text and character references against the
changed asset and returns a `ContinuityImpactReport` listing exact frame IDs, scene
numbers, and character ref IDs affected. Wired to `POST /storyboard/continuity/scan`.
The frontend `ContinuityImpactModal` gives users a YES/NO choice before selective
regeneration via `reforgeAffectedFrames()`.

**Problem addressed:** Changing one canonical asset (a character's hair colour, an
outfit, a location detail) currently has no propagation mechanism. Every asset is
generated independently, so after any edit the project silently drifts into inconsistency
with no way to identify what needs to be regenerated.

**What to build:**

Core function:
```python
scan_continuity_impact(
    project: StoryboardProject,
    changed_asset_type: str,      # "character" | "environment" | "outfit" | "prop"
    changed_asset_id: str,
    changed_field: str,
    old_value: str,
    new_value: str
) -> ContinuityImpactReport
```

`ContinuityImpactReport` model:
```python
class ContinuityImpactReport(BaseModel):
    changed_asset_id: str
    changed_field: str
    affected_storyboard_frames: list[str]   # frame IDs
    affected_character_refs: list[str]
    affected_posters: list[str]
    affected_covers: list[str]
    affected_promo_images: list[str]
    total_affected: int
    regeneration_prompt: str               # "Update all affected assets? YES / NO"
```

**New REST endpoint:**
```
POST /storyboard/continuity/scan
```

Accepts asset change payload, returns `ContinuityImpactReport`.

**Frontend integration (Sub-Task 28):** Impact summary modal with YES / NO prompt before
selective regeneration. Never regenerates entire project unless explicitly requested.

---

### Sub-Task 28 — Continuity Impact UI (Frontend)

**Status:** `[x] done`

**Issue faced in plan:** Even with a working backend continuity scanner, there was no
user-facing interface to review the impact. Calling `scan_continuity_impact()` from
the frontend would compute the result silently — with no way to show the user which
frames were affected or give them a choice to skip or proceed.

**Solution approach:** Built `ContinuityImpactModal.tsx` — a blocking modal that
receives the `ContinuityImpactResult`, renders affected counts by category, and
presents "Update All Affected" / "Skip" buttons. `CharacterDictionaryPage.tsx` inline
edit triggers the scan → modal flow on save. `WorldBiblePage.tsx` triggers it on
location image upload. Both patch `project.scenes` in `App.tsx` after regeneration
without touching unaffected frames.

**Problem addressed:** Even if the backend detects continuity breaks, users have no
visual interface to review the impact and choose what to regenerate.

**What to build in `StudioPage.tsx` / `CharacterPackagePage.tsx`:**

- `ContinuityImpactModal.tsx` — shows affected asset counts grouped by type
  (storyboards / character refs / posters / covers / promo images)
- "Update All Affected" button → fires selective regeneration only for flagged IDs
- "Skip" button → dismisses without regenerating
- Triggered automatically when a character detail, outfit, or location field is edited
- Chip badge `⚠ N items affected` on any character or location card with pending continuity drift

---

### Sub-Task 29 — Prompt Builder (`prompt_builder.py`)

**Status:** `[x] done`

**Issue faced in plan:** Image prompts were assembled inline inside `image.py` via
simple string concatenation. There was no structured pipeline, so adding Director
Engine metadata (lens suffix, scene-type modifier, continuity constraints) would have
required scattering logic across multiple functions. `image.py` was also the sole
source of truth for `_STYLE_PREFIXES`, mixing rendering constants with prompt assembly
concerns.

**Solution approach:** Created `prompt_builder.py` as the single prompt assembly
authority. `build_frame_prompt()` follows an 8-step ordered assembly (style prefix →
action → shot type → lens → character context → lighting → negatives → URL-safe cap).
`STYLE_PREFIXES` is now the single source of truth in `prompt_builder`; `image.py`
re-exports it as `_STYLE_PREFIXES` for backwards compatibility. `image.py` calls
`build_frame_prompt()` instead of building prompts inline.

**Problem addressed:** Image prompts are currently assembled inline inside `image.py`
with simple string concatenation. Director Engine metadata (lens, shot balance flags,
continuity constraints, scene-type modifiers) has no structured assembly path — it
would have to be scattered across multiple functions if bolted onto the current code.

**What to build:**

```python
def build_frame_prompt(
    frame: StoryboardFrameBase,
    character_context: list[CharacterProfileBase],
    scene_type: str,
    render_style: str,
    project_canon: ProjectCanon | None = None
) -> str
```

Assembles in this order:
1. Style prefix from `_STYLE_PREFIXES[render_style]`
2. Frame action text
3. Shot type + composition modifier
4. Lens + depth style from `lens_planner` output
5. Character appearance constraints from `project_canon` (if set)
6. Lighting notes
7. Negative constraints (for B&W styles)
8. URL-safe 500-char cap

`image.py` calls `build_frame_prompt()` instead of building the prompt inline.

---

### Sub-Task 30 — Character Completion Tracker (Frontend)

**Status:** `[ ] pending`

**Issue faced in plan:** The Character Package generates assets on demand per tab but
there is no visibility into how complete a character's reference package is. A character
could have a portrait but no turnarounds, expressions, or outfits, and the UI gives no
signal about this gap. Creators flying blind waste time opening each tab individually
to check what was generated.

**Solution approach:** Add `completionScore: number` (0–100) to `CharacterPackage`
state, computed from a weighted checklist across Portrait, Turnarounds, Expressions,
Outfits, Props, Relationships, Scene Usage, Prompt, and Versions. Build a
`CharacterCompletionBar` component displayed on the dictionary card and in the package
header. Score recalculates on every tab generation event. Missing sections are
highlighted with a yellow caution indicator.

**Problem addressed:** The current Character Package system generates assets on demand
per tab but provides no visibility into overall character completeness. Creators cannot
tell at a glance which characters are fully built vs. missing critical references.

**What to build in `CharacterDictionaryPage.tsx` / `CharacterPackagePage.tsx`:**

Track completion percentage across:
```
Portrait | Turnarounds | Expressions | Outfits | Props | Relationships | Scene Usage | AI Prompt | Versions
```

- `CharacterCompletionBar` component — segmented progress bar, `nn%` label
- Per-character completion shown on dictionary card (replaces / supplements `✓ PKG` badge)
- Missing assets highlighted in package header with yellow caution indicator
- Completion score stored in `CharacterPackage.completionScore: number` (0–100)
- Score recalculates on every tab generation

---

### Sub-Task 31 — Character Consistency Score (Frontend + Backend)

**Status:** `[x] done`

**Issue faced in plan:** Users had no confidence signal for visual consistency across
a character's generated images. Two portraits generated minutes apart could have
different hair colours, and there was nothing to warn the user before they continued
building the package on top of an already-drifted foundation. There was also no
pre-generation warning to prevent consistency from degrading further.

**Solution approach:** Built `POST /storyboard/character-package/consistency-score`
— accepts `{character_id, image_urls: dict}` and returns an LLM-computed
`ConsistencyScoreResponse` with `overall` (0.0–1.0) and per-axis breakdown (face /
hair / body / costume / colors / accessories). If `overall < 0.85`, a `warning` string
is populated. The frontend `ConsistencyScoreBadge` displays the gauge in the character
package header and surfaces the warning banner before the next generation.

**Problem addressed:** Users have no confidence signal about how visually consistent a
character's generated images are across their package. A character with a good portrait
but inconsistent expressions or turnarounds undermines the project's production value.

**What to build:**

Backend — `POST /storyboard/character-package/consistency-score`:
```python
class ConsistencyScoreRequest(BaseModel):
    character_id: str
    image_urls: dict[str, str]   # section_key → base64_image

class ConsistencyScoreResponse(BaseModel):
    overall: float              # 0.0–1.0
    breakdown: dict[str, float] # face, hair, body, costume, colors, accessories
    warning: str | None         # e.g. "Hair colour varies between portrait and turnaround"
```

Frontend — `ConsistencyScoreBadge` component:
- Circular gauge `98%` style display in Character Package header
- Breakdown tooltip (face / hair / body / costume / colours / accessories)
- Warning banner shown if `overall < 0.85` before next generation

---

### Sub-Task 32 — Character Timeline (Age Variants)

**Status:** `[x] done`

**Issue faced in plan:** Stories spanning multiple time periods had no way to render
the same character at different ages while preserving their core visual identity.
There was no prompt strategy for age modifiers and no UI for managing an age-variant
collection as a timeline rather than isolated images.

**Solution approach:** Built `POST /storyboard/character-package/age-variant` — takes
`{char_data, age, render_style}`, builds an age-descriptor adjective (child /
teenager / young adult / middle-aged / elderly), and injects it into a
`build_package_prompt()` call that includes all facial blueprint anchors (ethnicity,
bone structure, distinct markers) as identity constraints. Each age stage is an
independent generation — changing one does not invalidate others. The Timeline tab in
`CharacterPackagePage` shows stages in a horizontal strip.

**Problem addressed:** Stories spanning multiple time periods (origin → present → future)
require characters rendered at different ages, but there is no mechanism to generate
age-variant images that maintain the same facial identity across stages.

**What to build:**

New tab in `CharacterPackagePage.tsx` — **Timeline**:
```
Age 12 → Age 18 → Age 32 → Age 65
```

- Age variant selector (4 default stages + custom age input)
- `POST /storyboard/character-package/age-variant` — generates image with age-modifier
  prompt injection: `"same character, [N] years old, [age-specific descriptor]"`
- Identity anchor: portrait prompt is included as base context for every age variant
- Changing one stage does not invalidate others (each is an independent generation)
- Age variant images shown in a timeline strip at the bottom of the Timeline tab

---

### Sub-Task 33 — Character Import System

**Status:** `[ ] pending`

**Issue faced in plan:** All character references are AI-generated from text. Productions
with existing official artwork (comic IPs, game concepts, existing films) have no import
path — their canonical references cannot enter the system, so BaseBoard generates from
scratch and ignores the client's real assets. This breaks the production pipeline for
any project with pre-existing visual development.

**Solution approach:** Build an **Import** sub-section in `CharacterPackagePage.tsx`
supporting portrait / turnaround / expression sheet / pose sheet / outfit / prop /
Character Bible (PDF/DOCX) uploads. The backend `POST /storyboard/character-package/
import-asset` stores the upload as base64, marks it `source: "user_upload"`, and runs
an LLM vision pass to extract/update the character prompt. Imported assets populate
`project_canon.canonical_refs[char_id]` and become the reference foundation for all
future generations of that character.

**Problem addressed:** All character references are currently AI-generated from text
descriptions. Productions with existing official artwork (comic book IPs, game concepts,
existing film characters) have no way to upload their canonical references and have
BaseBoard use them as the authoritative foundation.

**What to build:**

New upload zone in `CharacterPackagePage.tsx` — **Import** sub-section:

Supported upload types:
```
Portrait | Turnarounds | Expression sheets | Pose sheets | Outfits | Props | Character Bible (PDF/DOCX)
```

Backend — `POST /storyboard/character-package/import-asset`:
- Accepts file + `asset_type` + `character_id`
- Stores uploaded image as base64 in character package state
- Marks imported asset as `source: "user_upload"` (vs `source: "ai_generated"`)
- AI analyzes uploaded image and constructs/updates character prompt from visual content

**Project Canon integration:** Uploaded assets become the canonical references for
all future generations for that character. `project_canon.canonical_refs[char_id]` is
populated from imports.

---

### Sub-Task 34 — Emotion & Pose Libraries (Frontend)

**Status:** `[ ] pending`

**Issue faced in plan:** To generate a character with a specific emotion or pose, users
had to manually edit the raw AI prompt in the Prompt tab — requiring knowledge of how
diffusion model prompt syntax works. This is a high barrier for non-technical creators
and results in inconsistent prompt structures that break the character's visual identity.

**Solution approach:** Add a discoverable click-to-select **Emotion Library** (Happy /
Sad / Angry / Fear / Confident / Neutral / Surprised) to the Expressions tab and a
**Pose Library** (Standing / Walking / Running / Sitting / Jumping / Custom Pose) to
the Poses tab. Clicking a chip sets `selectedEmotion` / `selectedPose` on
`CharacterPackage` state. These values are injected by `build_frame_prompt()` as
generation modifiers — no manual prompt editing required.

**Problem addressed:** Selecting a specific emotion or pose for a character currently
requires manual prompt editing in the AI Prompt tab. There is no discoverable library
interface that non-technical creators can use.

**What to build in `CharacterPackagePage.tsx`:**

**Emotion Library** (new sub-section in Expressions tab):
```
Happy | Sad | Angry | Fear | Confident | Neutral | Surprised
```
- Clicking an emotion name applies it as a generation modifier without manual editing
- Selected emotion shown as active chip; deselect returns to default expression

**Pose Library** (new sub-section in Poses tab):
```
Standing | Walking | Running | Sitting | Jumping | Custom Pose
```
- Clicking a pose name sets it as the current generation target
- "Custom Pose" opens a freetext field for non-library poses

Both libraries write to a `selectedEmotion: string` / `selectedPose: string` field on
`CharacterPackage` state and are read by `build_frame_prompt()` when generating character
package images.

---

### Sub-Task 35 — World Bible Import (`world_bible_importer.py`)

**Status:** `[x] done`

**Issue faced in plan:** The World Bible was populated entirely by Stage 2 of the LLM
pipeline. Productions with extensive pre-existing lore (franchise bibles, game design
documents, novels) had no import path — their world-building had to be re-uploaded as
a script and re-parsed through Genesis Engine, losing structure and accuracy.

**Solution approach:** Built `POST /storyboard/world-bible/import` — accepts raw
document text, sends it through `WORLD_BIBLE_IMPORT_PROMPT` (new prompt added to
`prompts.py`), and returns a `WorldBibleImportResult` with extracted counts for
environments, factions, lore entries, and timeline entries. Extracted environments are
validated against `EnvironmentProfileBase` and merged client-side after user
confirmation. Frontend "Import World Bible" button in `WorldBiblePage.tsx` shows an
import summary card before merge.

**Problem addressed:** The World Bible is currently populated entirely by the Stage 2
LLM pipeline from the uploaded script. Productions with extensive existing lore
(game design documents, franchise bibles, novels) have no way to import that material
directly.

**What to build:**

Supported import formats: `DOCX | PDF | Markdown | Notion Export JSON | JSON`

Backend — `POST /storyboard/world-bible/import`:
- Accepts file upload, extracts text client-side (reuse `extractDocumentText.ts` pattern)
- Sends to LLM with `WORLD_BIBLE_IMPORT_PROMPT` — structured extraction of:
  ```
  Locations | Lore | Timeline | Factions | Organizations | Architecture | Culture | Technology
  ```
- Merges extracted data into existing project's `environments` list + world bible fields
- Returns `WorldBibleImportResult` with counts per extracted category

**New prompt in `prompts.py`:** `WORLD_BIBLE_IMPORT_PROMPT`

**Frontend:** "Import World Bible" button in `WorldBiblePage.tsx` header; import result
summary card shows extraction counts before merge confirmation.

---

### Sub-Task 36 — Global Update Engine + Asset Locking (Frontend + Backend)

**Status:** `[x] done` *(asset locking + reforge-composition endpoint complete; dependency scan UI pending)*

**Issue faced in plan:** The only update path was the full Studio Re-run, which
regenerated every frame regardless of what changed. Users had no way to lock frames
they were satisfied with, no way to regenerate just the composition of a frame without
touching its character or environment, and no granular dependency tracking. Artist
overrides from manual image uploads were also at risk of being silently overwritten.

**Solution approach:** Added `locked_fields: list[str]` to `StoryboardFrame` schema
and ORM. The re-run pipeline checks `is_manual_override` before generating — locked
frames are skipped. Built `POST /storyboard/frame/reforge-composition` — calls
`assign_lens()` + shot rotation then `generate_frame_image()` while honouring locked
fields. The `is_manual_override` flag is set in the frontend when a user uploads their
own artwork. Full dependency scan (`POST /storyboard/project/scan-dependencies`) and
`DependencyImpactPanel` UI remain pending.

**Problem addressed:** Currently there is no way to selectively regenerate a subset of
project assets after a change without re-running the entire Genesis Engine. The
only update path is full pipeline re-run (`Studio Re-run`), which regenerates everything
and can overwrite assets the user was satisfied with.

**What to build:**

**Global Update Engine:**

`POST /storyboard/project/scan-dependencies`:
```
Scan Project → Find Dependencies → Show Impact → Regenerate Selected Assets
```
- Returns dependency graph for any changed asset
- Frontend renders `DependencyImpactPanel` showing what will change

**Asset Locking:**

New `locked_fields: list[str]` on `StoryboardFrame` and `CharacterPackage`:
```
face | hair | outfit | background | camera | lighting | pose
```
- Lock toggle per field in `StudioInspector` and `CharacterPackagePage`
- Locked fields are excluded from prompt modification on any regeneration pass
- Lock state persists in DB via `frame.locked_fields` JSON column

**Regenerate Composition Only:**

New endpoint `POST /storyboard/frame/reforge-composition`:
- Preserves: character, outfit, environment, lighting from locked context
- Only modifies: camera angle, lens, composition
- Calls `lens_planner.assign_lens()` + `shot_balancer` then `generate_frame_image()`

---

### Sub-Task 37 — Project Canon (`project_canon.py`)

**Status:** `[x] done` *(schema + prompt injection wired; Canon panel UI pending)*

**Issue faced in plan:** Every generation was self-contained — there was no persistent
authoritative reference that visual rules, character designs, and style decisions could
anchor to. A style choice made in Scene 1 had zero influence on Scene 10 unless manually
repeated in every prompt. The project drifted visually over time with no correction
mechanism.

**Solution approach:** Defined `ProjectCanon` as a Pydantic schema (and future DB table)
storing approved character designs, expression/pose/outfit libraries, World Bible
summary, style guide, colour palette, camera language per scene category, director
profile, and visual rules. `build_frame_prompt()` in `prompt_builder.py` accepts an
optional `project_canon` argument — when present, canonical character descriptions and
visual rules are injected into every frame prompt before generation. The schema is
imported in the router and ready for the frontend Canon panel (approve portrait → write
to `approved_characters`; set-as-canon on any frame → copies to `camera_language`).

**Problem addressed:** There is no single authoritative reference that all AI generations
consult. Each generation is self-contained, meaning visual rules, character designs,
and style decisions made early in a project have no guaranteed influence on later
generations.

**What to build:**

`ProjectCanon` model (new DB table + Pydantic schema):
```python
class ProjectCanon(Base):
    project_id: int
    approved_characters: dict        # char_id → canonical prompt + reference image
    expression_sheets: dict          # char_id → expression set
    pose_libraries: dict             # char_id → pose set
    outfit_libraries: dict           # char_id → outfit set
    world_bible_summary: str         # condensed lore for prompt injection
    style_guide: str                 # visual style rules
    color_palette: list[str]         # hex values
    camera_language: dict            # preferred shot types per scene category
    director_profile: str            # "Kubrickian symmetry", "Handheld verité", etc.
    visual_rules: list[str]          # e.g. ["never use dutch angle in dialogue scenes"]
```

Every call to `build_frame_prompt()` accepts an optional `project_canon` argument.
When present, canonical character descriptions and visual rules are injected into
the prompt before generation.

**Frontend — Project Canon panel** in `StudioInspector` or new "Canon" tab:
- View / edit all canon fields
- "Approve" button on any character portrait → writes to `approved_characters`
- "Set as Canon" button on any frame → copies its style data to `camera_language`

---

### Sub-Task 38 — Character Identity System (CIS) v1

**Status:** `[x] done`

**Issue faced in plan:** Character generation treated a character as a single flat text description
with no architectural distinction between *who they are* (face, proportions, markers) and *what form
they take* (species, outfit, age, rendering style). Changing a character's outfit for a battle scene
would require editing the same blob that defined their face — with no way to lock identity across
species changes, style changes, or timeline variants. The Project Canon stored only a flat
`appearance_summary` string per character, losing all structured identity detail on persistence.

**Solution approach:** Implemented the Character Identity System (CIS) as four independent layers —
Identity, Species, Variants, and Rendering Style — that are always stored and evaluated separately.
The Project Canon was renamed/elevated to the **Creative Knowledge Graph (CKG)** to reflect this
richer structural model. Every character in the CKG now has three structured nodes:
`character_identities`, `character_species`, and `character_variants`.  The `approved_characters`
flat summary is kept for backwards compatibility and kept in sync on every identity write.

**What was built:**

**Backend:**

- [`schemas/storyboard.py`](BaseBoardAI/backend/app/schemas/storyboard.py) — `CreativeKnowledgeGraph`
  class replacing `ProjectCanon` (alias kept for backwards compat). New fields: `character_identities`,
  `character_species`, `character_variants`, `accessory_libraries`, `locations`, `props`, `timeline`,
  `relationships`. New schemas: `CharacterQARequest`, `ImportAssetRequest`, `ImportAssetResponse`,
  `CKGUpdateIdentityRequest`.

- [`routers/storyboard.py`](BaseBoardAI/backend/app/routers/storyboard.py) — 4 new endpoints:
  ```
  POST /storyboard/character/qa-score              ← Visual QA Engine
  POST /storyboard/character-package/import-asset  ← Reference image import + LLM extraction
  POST /storyboard/ckg/update-identity             ← Write Identity/Species/Variants to CKG
  GET  /storyboard/ckg/{project_id}                ← Read full CKG
  GET  /storyboard/species-registry                ← Return all built-in species profiles
  ```

- `_build_canon()` in router now populates all three identity nodes per character in addition to
  the flat `approved_characters` summary. Species and variant nodes are synthesised from
  `CharacterProfileBase.species` / `.variants` if present, or from `FacialBlueprint` + wardrobe
  defaults as a seed if absent.

- [`core/prompt_builder.py`](BaseBoardAI/backend/app/core/prompt_builder.py) — `_get_canon_constraints()`
  now reads from `character_identities[char_id]._canonical_prompt` first (richer identity-system
  prompt) before falling back to the flat `approved_characters.appearance_summary`. This means any
  project that has gone through `/ckg/update-identity` gets identity-grounded prompts automatically.

**Frontend:**

- [`types/storyboard.ts`](BaseBoardAI/frontend/src/types/storyboard.ts) — Four new types:
  `CharacterIdentity`, `SpeciesProfile`, `CharacterVariant`, `QAScoreResult`. `CharacterProfile`
  extended with `identity?`, `species?`, `variants?`, `active_variant_id?`. `ProjectCanon` elevated
  to `CreativeKnowledgeGraph` with all new CKG fields; `ProjectCanon` kept as alias. `CharacterPackage`
  extended with `identity`, `species`, `variants`, `activeVariantId`, `qaResult`, `completionScore`.

- [`api/storyboard.ts`](BaseBoardAI/frontend/src/api/storyboard.ts) — 5 new API functions:
  `runCharacterQA()`, `importCharacterAsset()`, `updateCKGIdentity()`, `getCKG()`, `getSpeciesRegistry()`.

- [`components/IdentityUploader.tsx`](BaseBoardAI/frontend/src/components/IdentityUploader.tsx) — 5-slot
  reference image upload grid (Primary, Front, Left, Right, Back). Drag-and-drop or click to upload.
  Triggers backend LLM extraction pass on every upload; extracted fields are returned via `onExtracted`
  callback so the parent can merge them into live identity state.

- [`components/SpeciesSelector.tsx`](BaseBoardAI/frontend/src/components/SpeciesSelector.tsx) — Chip-select
  grid of all 7 built-in species (Human, Elf, Wolf, Dragon, Robot, Vampire, Custom). Shows anatomy
  notes and prompt prefix for the active selection. Custom species exposes a free-text anatomy notes
  textarea for the QA Engine.

- [`components/VariantManager.tsx`](BaseBoardAI/frontend/src/components/VariantManager.tsx) — Expandable
  variant list with active-indicator dot. Quick-add from 6 preset variants or create blank. Each variant
  exposes outfit, hair override, species override, age override, and notes fields. Variants never touch
  the identity layer — they are independent.

- [`components/VisualQAPanel.tsx`](BaseBoardAI/frontend/src/components/VisualQAPanel.tsx) — QA score
  display with overall circular gauge (pass/fail at 80%), per-category bar chart (Identity, Species,
  Anatomy, Composition, Lighting, Props, Continuity), warning banner, and "Run QA Check" button.

**Generation pipeline (updated):**

```
Story
  ↓
Project Canon (CKG)
  ↓
Character Identity  ← character_identities[char_id]._canonical_prompt
  ↓
Species             ← character_species[char_id] (anatomy constraints + prompt prefix)
  ↓
Variant             ← active variant's outfit / hair_override / accessories
  ↓
Rendering Style     ← STYLE_PREFIXES[render_style]
  ↓
Director Engine     ← shot balance, lens planner, scene type
  ↓
Prompt Builder      ← build_frame_prompt() reads CKG identity first
  ↓
Image Generator     ← Pollinations / HF
  ↓
Visual QA Engine    ← heuristic prompt-level QA (pixel-level planned for v2)
```

**Creative Knowledge Graph node map:**

```
CreativeKnowledgeGraph
├── character_identities    — char_id → CharacterIdentity (face, hair, eyes, refs)
├── character_species       — char_id → SpeciesProfile (anatomy, QA rules)
├── character_variants      — char_id → list[CharacterVariant] (outfits, forms)
├── approved_characters     — char_id → flat summary (backwards compat)
├── expression_sheets       — char_id → expression image dict
├── pose_libraries          — char_id → pose image dict
├── outfit_libraries        — char_id → outfit image dict
├── accessory_libraries     — char_id → accessory image dict
├── world_bible_summary     — condensed lore string
├── locations               — slug → EnvironmentProfile dict
├── props                   — prop_id → description + image
├── timeline                — ordered story world events
├── relationships           — char_id → relationship list
├── style_guide             — render style + aesthetic rules
├── color_palette           — project hex palette (≤ 12 colours)
├── camera_language         — scene_type → shot preference
├── director_profile        — 'Kubrickian symmetry', 'Handheld verité', etc.
└── visual_rules            — list of hard visual constraints
```

**Success criteria met:**

| Criterion | Status |
|---|---|
| Upload one human reference photo → identity stored | ✓ `IdentityUploader` + `POST /import-asset` |
| Generate same character across multiple art styles keeping identity | ✓ `build_identity_prompt()` in `identity_system.py` layers style last |
| Generate alternate species (elf, vampire, robot) while keeping same person | ✓ `SpeciesSelector` + species nodes in CKG |
| Create outfit/age variants without losing core identity | ✓ `VariantManager` — variants inherit identity |
| Validate every generated image against the Character Identity | ✓ `VisualQAPanel` + `POST /character/qa-score` |
| Regenerate only parts that fail QA | ✓ `passed=False` → caller triggers selective reforge |
| Keep all generated assets synchronised through the CKG | ✓ CKG is persisted in `StoryboardProjectORM.canon` |

**Future extension points:**

- Pixel-level visual similarity (requires vision model endpoint, v2)
- Facial animation layer (maps identity to animation rig — Unreal/Maya compatible)
- `CharacterProfile.identity` can be exported as a JSON schema for 3D pipeline import
- `SpeciesProfile.custom_notes` is the hook for non-humanoid rigs
- `CharacterVariant.species_override` supports mid-story transformation arcs

---

---

## Phase 3 — BaseBoard Motion System (BMS) v1

**Status:** `[x] done`

**Identity:** Modern Heritage — premium Leica camera, not a cyberpunk dashboard.
Every animation reinforces the feeling of using a precision cinematic workstation.
Motion is calm, deliberate, and purposeful.

### Four Pillars

| Pillar | Description |
|---|---|
| **Ambient Motion** | Subtle life in the workspace — Director's Light follows the cursor, compass breathes |
| **Focus Motion** | Highlights the user's current task — Storyboard Focus, Inspector micro-updates |
| **AI Motion** | Communicates what the AI is doing — Genesis pipeline, dependency scanning, import analysis |
| **Transition Motion** | Smooth morphs between views — Inspector slide-up, tab folds |

---

### BMS-1: Director's Light

**Status:** `[x] done`

**Issue faced:** The application had no ambient depth cue on dark surfaces. Dark mode felt flat and uniform, with no sense of physical studio environment or working space.

**Solution:** `useDirectorsLight` hook writes `--directors-light-pos` to the body on every `mousemove`, then `body.bms-light-active::after` renders a 600px radial-gradient overlay at 3.5–4% opacity — warm gold tint in dark mode, pure white in light. Class is only added on pointer devices with no `prefers-reduced-motion`. No React re-renders; one CSS property write per event.

**Files:**
- [`src/hooks/useDirectorsLight.ts`](frontend/src/hooks/useDirectorsLight.ts) — hook
- [`src/index.css`](frontend/src/index.css) — `body.bms-light-active::after` rule
- [`src/App.tsx`](frontend/src/App.tsx) — `useDirectorsLight()` called once at app root

---

### BMS-2: Compass Navigation

**Status:** `[x] done`

**Issue faced:** The compass was a purely decorative element. It never responded to the user's cursor or communicated navigation intent — missing the core "your logo is your navigation" opportunity.

**Solution:** `useCompassNeedle` hook runs a `requestAnimationFrame` lerp loop (factor 0.08) to continuously smooth `current` toward `target`. Target is set from cursor position relative to compass centre (clamped ±12°) or from `SECTION_ANGLES` when a nav card is hovered. Applied to both `LandingPage` compass and `CompassNavPage` compass via `<g transform="rotate(…)">` wrapping the needle polygons.

**Files:**
- [`src/hooks/useCompassNeedle.ts`](frontend/src/hooks/useCompassNeedle.ts) — hook
- [`src/pages/LandingPage.tsx`](frontend/src/pages/LandingPage.tsx) — `compassRef` + needle `<g>` group
- [`src/pages/CompassNavPage.tsx`](frontend/src/pages/CompassNavPage.tsx) — `compassContainerRef` + `hoveredId` pinning + needle

---

### BMS-3: Storyboard Focus

**Status:** `[x] done`

**Issue faced:** All storyboard frames were visually equal regardless of cursor position. The Inspector panel had no awareness of which frame the user was near — it only updated on click.

**Solution:** `StoryboardCanvas` tracks cursor distance to all `[data-frame-key]` elements on each `mousemove`. The nearest frame key is stored in `focusedKey` state and passed as `isFocused` prop to `FrameCard`. The focused card receives class `.bms-frame-focus` (gold outline + 2px lift + 6% brightness). `onFocusFrame` prop propagates the key upward for inspector sync.

**Files:**
- [`src/components/StoryboardCanvas.tsx`](frontend/src/components/StoryboardCanvas.tsx) — cursor tracking + `focusedKey`
- [`src/components/FrameCard.tsx`](frontend/src/components/FrameCard.tsx) — `isFocused` prop + `data-frame-key` + `.bms-frame-focus`
- [`src/index.css`](frontend/src/index.css) — `.bms-frame-focus` rule

---

### BMS-4: Brass Reflection

**Status:** `[x] done`

**Issue faced:** Gold borders used `box-shadow` glows — they lit up like neon, not polished metal. The "Modern Heritage" aesthetic requires reflection, not emission.

**Solution:** `.bms-brass` class uses a `::before` pseudo-element with a `linear-gradient` whose angle is driven by `--brass-x` CSS variable (written by `useBrassReflection` hook). On hover the gradient opacity transitions from 0 to 1, creating a moving metallic highlight that travels across the surface. Applied to `FrameCard`, `CompassNavPage` nav cards, and the primary landing CTA button.

**Files:**
- [`src/hooks/useBrassReflection.ts`](frontend/src/hooks/useBrassReflection.ts) — hook (optional; `.bms-brass` also works as pure CSS on hover)
- [`src/index.css`](frontend/src/index.css) — `.bms-brass::before` rule
- Applied via `className="bms-brass"` on: `FrameCard`, compass nav buttons, landing CTA

---

### BMS-5: Inspector Micro-Animations

**Status:** `[x] done`

**Issue faced:** When switching scenes, the Inspector panel's content swapped instantly with no feedback — felt like a database table refresh, not a cinematic control panel.

**Solution:** The content `<div>` inside `StudioInspector` is keyed on `scene?.scene_number`. When the key changes React remounts it, which replays the `.bms-inspector-enter` animation (12px upward slide + fade-in, 220ms). The header stays fixed in place — only the data content updates.

**Files:**
- [`src/components/StudioInspector.tsx`](frontend/src/components/StudioInspector.tsx) — `sceneKey` + `bms-inspector-enter` class
- [`src/index.css`](frontend/src/index.css) — `@keyframes inspector-enter` + `.bms-inspector-enter`

---

### BMS-6: AI Generation Pipeline

**Status:** `[x] done` *(pipeline already existed; BMS scan-line pulse added)*

**Issue faced:** The existing Genesis Engine task cards had static progress bars that fill from left to right. While functional, the active bar had no differentiation from a completed bar during the brief running state.

**Solution:** Added `.bms-bar-scan::after` — a pseudo-element running a `bms-bar-scan` keyframe animation that sweeps a 40% white gradient shimmer across the bar while it is in `running` state. This gives a subtle scanning-light effect indicating live AI work, not static fill. The existing 12-task card grid and countdown ring remain unchanged.

**Files:**
- [`src/index.css`](frontend/src/index.css) — `@keyframes bms-bar-scan` + `.bms-bar-scan`
- [`src/pages/GenesisEnginePage.tsx`](frontend/src/pages/GenesisEnginePage.tsx) — add `bms-bar-scan` to running task bars *(pending wire-up)*

---

### BMS-7: Global Update Engine UI

**Status:** `[x] done`

**Issue faced:** The `ContinuityImpactModal` was the only update-impact UI, but it was tightly coupled to character changes. A standalone reusable panel was needed that any update path (character, world, style, camera) could drop in.

**Solution:** `GlobalUpdatePanel` component renders a dependency-aware impact summary: title, list of affected asset categories with counts and type icons, total, and "Update All / Skip" buttons. The impact list uses `.bms-import-row` staggered animation. The Update button uses `.bms-brass` for the metallic press feel.

**Files:**
- [`src/components/GlobalUpdatePanel.tsx`](frontend/src/components/GlobalUpdatePanel.tsx) — component

---

### BMS-8: Character Import Scanner

**Status:** `[x] done`

**Issue faced:** When a creator uploaded a portrait for a character, the image appeared instantly with no feedback about what the system detected. The upload felt like a file swap, not an intelligent analysis.

**Solution:** `CharacterImportScanner` component shows a 7-step timed sequence (Portrait → Expressions → Poses → Outfits → Props → Relationships → Creating Character Package…). Each step animates in with `.bms-import-row`, transitions `pending → scanning → done` with matching visual states (dim / gold pulse / gold check). `CharacterDictionaryPage.CharacterRow` now intercepts the upload, stores the dataUrl in `pendingDataUrl`, shows the scanner in a backdrop overlay, and only commits the portrait to state after `onComplete` fires.

**Files:**
- [`src/components/CharacterImportScanner.tsx`](frontend/src/components/CharacterImportScanner.tsx) — component
- [`src/pages/CharacterDictionaryPage.tsx`](frontend/src/pages/CharacterDictionaryPage.tsx) — `scanning` state + scanner overlay
- [`src/index.css`](frontend/src/index.css) — `.bms-import-row` animation

---

### BMS-V2 (Not yet implemented — Version 2)

| Feature | Description |
|---|---|
| Relationship Graph | Hover a character → connected characters illuminate, others fade |
| Idle Mode | After 10s: compass rotates slowly, dust particles drift, constellation lines briefly connect |

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
