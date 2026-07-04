# BaseBoard AI — Master Implementation Plan

## Top-Level Overview

**Goal:** Bring the BaseBoard AI frontend from a bare Vite/React skeleton into a
fully-functional PreViz workstation that satisfies the locked Master Technical Brief.
The backend pipeline (Sub-Tasks 1–8) is **100% complete** and ships with:

- 3-Stage Granite LLM pipeline (character → world → storyboard)
- Pollinations.ai + Hugging Face image generation, base64-encoded, stored in SQLite
- Full FastAPI CRUD + 4 pipeline endpoints
- Pydantic v2 schemas and SQLAlchemy ORM with deferred image column

Everything remaining is **frontend work** — building the React workspace to match the
`Menu.html` reference and the full feature set from the Master Technical Brief.

**Priority order (as specified):**
1. Script parsing → scene breakdown (core UI wiring)
2. Image generation per frame (already done in backend; frontend must display it)
3. Basic frame viewer / gallery (core canvas)
4. Animatic player (demo wow-factor)
5. Render style selector (variety)
6. Download / export (practical)
7. Line tinting, color overrides, lighting controls (stretch goals, fully client-side)

**Scope:**
- TypeScript types mirroring backend Pydantic schemas
- Navigation shell with 3 left links + Granite status badge (right)
- Screenplay scene list (left panel)
- Storyboard frame stream / gallery (center canvas)
- Pipeline trigger UI (3-step input → `POST /storyboard/forge-pipeline`)
- Per-frame image display (`<img src={generated_image_url} />`)
- Backend `render_style` field added to `PipelineExecutionRequest` (explicit `Literal` — not `global_aesthetic`)
- Render style selector (`bw_sketch | flat_color | full_shaded`) wired to the new backend field
- Animatic player using `frame_number` + `duration_seconds`
- Director's palette inspector with interactive color picker swatches
- Shadow/lighting dropdown re-render controls
- Line tinting CSS filter (client-side, `bw_sketch` mode only)
- The Vault (all variations gallery)
- The Locked Cut Folder (curated timeline, `is_selected: true`)
- Per-frame PNG download (anchor link, no server round-trip)
- Batch ZIP export via `jszip` with `production_manifest.md`
- Project Library page (saved project grid from `GET /storyboard/`)
- Docs page (script template shortcuts)
- `jszip` + `@types/jszip` added to `package.json`

**Non-goals:**
- Server-side ZIP generation
- Alembic migrations (SQLite auto-create on startup is sufficient)
- Auth, rate limiting, monitoring
- Local Stable Diffusion
- Persisting `is_selected` to the database (deferred stretch task — see note at bottom)

**Approach:** Sequential sub-tasks. Each is independently reviewable.
Sub-tasks 1–8 are already **[x] done** (backend). Sub-task 8b adds the `render_style`
backend field. Sub-tasks 9–21 are the frontend build, ordered by priority from the brief.

---

## Sub-Tasks

---

### Sub-Task 1 — Add `python-dotenv` and create `.env`

**Status:** `[x] done`

**Intent:** Load WatsonX credentials at runtime from a `.env` file.

**Relevant Context:** `BaseBoardAI/backend/requirements.txt`, `BaseBoardAI/backend/.env.example`

---

### Sub-Task 1b — Add image provider config keys to `.env`

**Status:** `[x] done`

**Intent:** Extend `.env` with `IMAGE_PROVIDER`, `HF_API_TOKEN`, `POLLINATIONS_*` keys.

**Relevant Context:** `BaseBoardAI/backend/.env.example`

---

### Sub-Task 2 — Create `app/core/config.py`

**Status:** `[x] done`

**Intent:** Central Pydantic `Settings` model for all credentials and provider switches.

**Relevant Context:** `BaseBoardAI/backend/app/core/config.py`

---

### Sub-Task 3 — Strengthen prompt templates

**Status:** `[x] done`

**Intent:** Rewrite prompts with inline JSON schemas and one-shot examples for Granite.

**Relevant Context:** `BaseBoardAI/backend/app/core/prompts.py`

---

### Sub-Task 4 — Create `app/core/llm.py`

**Status:** `[x] done`

**Intent:** LLM orchestration — three stage functions using WatsonxLLM + LangChain.

**Relevant Context:** `BaseBoardAI/backend/app/core/llm.py`

---

### Sub-Task 5 — Wire pipeline endpoints

**Status:** `[x] done`

**Intent:** Replace 501 stubs with real LLM pipeline calls in `storyboard.py`.

**Relevant Context:** `BaseBoardAI/backend/app/routers/storyboard.py`

---

### Sub-Task 6 — Add `generated_image_url` to schema and ORM

**Status:** `[x] done`

**Intent:** Deferred BLOB column on `StoryboardFrameORM`; field on `StoryboardFrameBase`.

**Relevant Context:** `BaseBoardAI/backend/app/db/models.py`, `BaseBoardAI/backend/app/schemas/storyboard.py`

---

### Sub-Task 7 — Create `app/core/image.py`

**Status:** `[x] done`

**Intent:** Unified base64 image downloader (Pollinations.ai + Hugging Face).

**Relevant Context:** `BaseBoardAI/backend/app/core/image.py`

---

### Sub-Task 8 — Wire image generation into pipeline

**Status:** `[x] done`

**Intent:** Image generation loop after `invoke_storyboard_stage()` in both pipeline endpoints.

**Relevant Context:** `BaseBoardAI/backend/app/routers/storyboard.py`

---

### Sub-Task 8b — Add `render_style` field to backend `PipelineExecutionRequest`

**Status:** `[ ] pending`

**Intent:**
Add an explicit, validated `render_style` field to `PipelineExecutionRequest` in the
backend Pydantic schema. This is a strict `Literal` type — not a free-form string — so
the backend rejects any value that isn't one of the three defined render modes at
validation time. It is kept **separate** from `global_aesthetic` so that aesthetic tone
(e.g., "Neon Cyberpunk") and rendering pipeline mode (e.g., `bw_sketch`) are never
conflated in the same field and can be injected into the Granite prompt independently.

`StoryboardProjectResponse` and `StoryboardProjectCreate` are also updated to carry
`render_style` so the client can read back what style was used when loading a saved
project from the library.

**Expected Outcomes:**
- `PipelineExecutionRequest` in `BaseBoardAI/backend/app/schemas/storyboard.py` has a
  new field: `render_style: Literal['bw_sketch', 'flat_color', 'full_shaded'] = 'bw_sketch'`
- `StoryboardProjectCreate` carries the same field with the same default
- `StoryboardProjectResponse` includes `render_style: str` (read-back, no default needed)
- `StoryboardProjectORM` in `BaseBoardAI/backend/app/db/models.py` gains a
  `render_style: Mapped[str]` column (non-nullable, default `'bw_sketch'`)
- `BaseBoardAI/backend/app/routers/storyboard.py` passes `render_style` into
  `_build_project_orm()` and reads it back in `_orm_to_response()`
- The `STORYBOARD_PROMPT` in `app/core/prompts.py` is updated to inject
  `render_style` as a separate variable so Granite receives it as an explicit draw
  mode instruction, distinct from the `global_aesthetic` tone descriptor
- Existing endpoints that do not yet pass `render_style` default to `'bw_sketch'`
  without breaking — the field has a default value

**Todo List:**
1. In `BaseBoardAI/backend/app/schemas/storyboard.py`:
   - Add `from typing import Literal` at the top of the file
   - Add `render_style: Literal['bw_sketch', 'flat_color', 'full_shaded'] = Field('bw_sketch', description="Visual rendering pipeline mode")`
     to `PipelineExecutionRequest`
   - Add the same field to `StoryboardProjectCreate`
   - Add `render_style: str` (no default) to `StoryboardProjectResponse`
2. In `BaseBoardAI/backend/app/db/models.py`:
   - Add `render_style: Mapped[str] = mapped_column(String, nullable=False, default='bw_sketch')`
     to `StoryboardProjectORM`
3. In `BaseBoardAI/backend/app/routers/storyboard.py`:
   - In `_build_project_orm()`: pass `render_style=project.render_style`
   - In `_orm_to_response()`: pass `render_style=project.render_style`
4. In `BaseBoardAI/backend/app/core/prompts.py`:
   - Add `{render_style}` as a template variable to `STORYBOARD_PROMPT`
   - Inject it with a direct instruction replacing the generic `bw_sketch` description:
     `"Draw mode: {render_style}. Apply this strictly: bw_sketch = fine-tip fineliner ink pen drawing with cross-hatching shadows, maximum black line contrast, pure white negative space, zero color fills, absolutely no color tones or gradients; flat_color = smooth solid cell-shaded digital vector illustration, completely flat uniform color block fills, zero pen texture, zero cross-hatching, zero ink lines, clean crisp structural outlines only, no gradients, no shadows; full_shaded = cinematic depth-of-field render with dramatic ambient occlusion shadows and volumetric lighting."`
   - `bw_sketch` and `flat_color` are mutually exclusive texture spaces:
     `bw_sketch` owns all pen/ink/hatching instructions; `flat_color` explicitly
     forbids every pen texture so the model cannot bleed fineliner artefacts into
     cell-shaded output — the negative constraints (`zero pen texture`, `zero cross-hatching`,
     `zero ink lines`) are load-bearing and must not be removed
   - The `bw_sketch` pure-white-background guarantee is the technical prerequisite for the
     `mix-blend-mode: multiply` overlay in Sub-Task 20 to recolor linework with zero bleed
5. In `BaseBoardAI/backend/app/core/llm.py`:
   - Update `invoke_storyboard_stage()` signature to accept `render_style: str`
   - Pass it into the `PromptTemplate` input dict
6. In `BaseBoardAI/backend/app/routers/storyboard.py`:
   - Pass `payload.render_style` into `invoke_storyboard_stage()` in `forge_storyboard_pipeline()`
   - Pass `payload.render_style` (or default `'bw_sketch'`) in `forge_standalone_storyboard()`
7. Delete `BaseBoardAI/backend/baseboard.db` so SQLite auto-recreates the schema
   with the new `render_style` column on next startup (dev only — no migration needed)

**Relevant Context:**
- `BaseBoardAI/backend/app/schemas/storyboard.py` — current `PipelineExecutionRequest` at line 91;
  `global_aesthetic` remains untouched (free-form tone descriptor — separate concern)
- `BaseBoardAI/backend/app/db/models.py` — `StoryboardProjectORM` receives the new column
- `BaseBoardAI/backend/app/core/prompts.py` — `STORYBOARD_PROMPT` receives new `{render_style}` variable
- `BaseBoardAI/backend/app/core/llm.py` — `invoke_storyboard_stage()` must pass the value through
- This is a backend-only sub-task; no frontend changes required here

---

### Sub-Task 8c — Add `reference_style_image` to schema + img2img image engine

**Status:** `[ ] pending`

**Intent:**
Add an optional `reference_style_image` field to `PipelineExecutionRequest` so the
frontend can pass a user-uploaded inspiration image as a Base64 data URL string.
The backend image engine then uses that reference to steer generation toward the
uploaded style, without requiring any file storage or multipart forms — the Base64
string travels as a plain JSON field.

The image engine (`app/core/image.py`) gains two new provider functions —
`_generate_pollinations_img2img` and `_generate_huggingface_img2img` — and
`generate_frame_image()` is updated to branch between text-only and img2img paths
based on whether `reference_style_image` is present.

**Critical correction from submitted snippet:**
The Pollinations snippet in the addendum constructs a text-only URL, appends a
`scenestrength` parameter that the Pollinations API does not support, then returns
the URL string directly instead of downloading bytes and returning a data URL. That
implementation would silently discard the reference image and break the pipeline
contract. The plan below specifies a working implementation for both providers.

**Expected Outcomes:**
- `PipelineExecutionRequest` in `BaseBoardAI/backend/app/schemas/storyboard.py` has a
  new field: `reference_style_image: str | None = Field(None, description="Optional user-uploaded reference style image encoded as a Base64 data URL string.")` — on `PipelineExecutionRequest` only; never added to any ORM or response model
- `generate_frame_image()` in `app/core/image.py` accepts
  `reference_style_image: str | None = None` and `render_style: str = 'bw_sketch'`
- **Three dispatch branches** inside `generate_frame_image()` — resolved in order:
  1. `render_style == 'bw_sketch'` AND `reference_style_image` present →
     **sketch-reference intersection path** (new, see below)
  2. `reference_style_image` present, any other render style →
     standard img2img path (Pollinations or HF at `strength=0.55`)
  3. No reference image → existing text-to-image path unchanged
- **Sketch-reference intersection path** (Rule 3 from Blueprint Lock):
  - `render_style == 'bw_sketch'` + reference present activates dedicated handling
  - **Prompt injection:** append aggressive negative constraints to the assembled prompt
    before passing to either provider:
    `" Negative: color, color fills, gradients, tones, shading, texture, paint, watercolor, photograph, render. Positive: fine-tip fineliner ink pen, cross-hatching, pure black linework, pure white background only."`
  - **HF strength:** set to `0.78` (mid-point of the locked 0.75–0.80 range) — the
    reference guides composition and silhouette only; ink texture is completely overwritten
  - **Pollinations:** append the negative/positive constraint string to the prompt before
    URL-encoding; use the standard img2img URL with `?image=` parameter at the same
    `strength` value the provider exposes
- **Pollinations img2img path** (standard, non-sketch): strip data URL header → include
  as `?image={encoded_ref}` query parameter → `httpx.get(timeout=30)` → bytes →
  `_convert_bytes_to_data_url()`; on non-200 fall back to text-only (never return `None` silently)
- **Hugging Face img2img path** (standard, non-sketch): POST
  `{"inputs": prompt, "image": base64_string, "parameters": {"strength": 0.55}}`
  → bytes → `_convert_bytes_to_data_url()`; on non-200 fall back to text-only
- **Hugging Face sketch-intersection path**: same as HF img2img but with
  `"strength": 0.78` and the negative-constraint prompt string injected before the call
- Image generation remains non-fatal — any failure returns `None` and logs; no raises
- `app/core/config.py` gains `HF_IMG2IMG_MODEL: str = Field('stabilityai/stable-diffusion-xl-refiner-1.0', ...)`

**Todo List:**
1. In `BaseBoardAI/backend/app/schemas/storyboard.py`:
   - Add `reference_style_image: str | None = Field(None, description="Optional user-uploaded reference style image encoded as a Base64 data URL string.")` to `PipelineExecutionRequest`
   - Do **not** add this field to `StoryboardProjectCreate`, `StoryboardProjectResponse`,
     or any ORM model — the reference image is ephemeral, consumed during generation only,
     and must never be written to any database layer
2. In `BaseBoardAI/backend/app/core/config.py`:
   - Add `HF_IMG2IMG_MODEL: str = Field('stabilityai/stable-diffusion-xl-refiner-1.0', description="HF model used for img2img when reference_style_image is provided")`
3. In `BaseBoardAI/backend/.env.example`:
   - Add `HF_IMG2IMG_MODEL=stabilityai/stable-diffusion-xl-refiner-1.0`
4. In `BaseBoardAI/backend/app/core/image.py`:
   - Add `_strip_data_url_header(data_url: str) -> str`:
     `return data_url.split(',', 1)[1]`
   - Add `_BW_SKETCH_NEGATIVE_CONSTRAINTS` module-level constant (makes the constraint
     string auditable and avoids duplication across provider functions):
     ```python
     _BW_SKETCH_NEGATIVE_CONSTRAINTS = (
         " Negative: color, color fills, gradients, tones, shading, texture, paint, "
         "watercolor, photograph, render. "
         "Positive: fine-tip fineliner ink pen, cross-hatching, "
         "pure black linework, pure white background only."
     )
     ```
   - Add `_inject_sketch_constraints(prompt: str) -> str`:
     `return (prompt + _BW_SKETCH_NEGATIVE_CONSTRAINTS)[:400]`
     (cap at 400 chars — wider than the standard 200-char cap to accommodate the constraints)
   - Add `_generate_pollinations_img2img(prompt: str, reference_base64: str) -> str | None`:
     - Encode prompt and data URL reference; build URL with `?image={encoded_ref}&width=...&height=...&nologo=true`
     - `httpx.get(url, timeout=30, follow_redirects=True)`
     - On 200: `return _convert_bytes_to_data_url(response.content)`
     - On non-200: `logger.warning(...)` → fall back to `_generate_pollinations(prompt)`
   - Add `_generate_huggingface_img2img(prompt: str, reference_base64: str, strength: float = 0.55) -> str | None`:
     - `strength` is a parameter (not hardcoded) so the sketch intersection path can pass `0.78`
     - Payload: `{"inputs": prompt, "image": reference_base64, "parameters": {"strength": strength}}`
     - `httpx.post(url, headers=headers, json=payload, timeout=90)`
     - On 200: `return _convert_bytes_to_data_url(response.content)`
     - On non-200: `logger.warning(...)` → fall back to `_generate_huggingface(prompt)`
   - Update `generate_frame_image()` signature:
     `def generate_frame_image(frame, scene, reference_style_image: str | None = None, render_style: str = 'bw_sketch') -> str | None`
   - Inside the `try` block, implement the three-branch dispatch:
     ```python
     prompt = _build_image_prompt(frame, scene)
     ref_b64 = _strip_data_url_header(reference_style_image) if reference_style_image else None

     # Branch 1: bw_sketch + reference → sketch-intersection path
     if ref_b64 and render_style == 'bw_sketch':
         sketch_prompt = _inject_sketch_constraints(prompt)
         if settings.IMAGE_PROVIDER == "huggingface":
             return _generate_huggingface_img2img(sketch_prompt, ref_b64, strength=0.78)
         return _generate_pollinations_img2img(sketch_prompt, ref_b64)

     # Branch 2: reference present, other render style → standard img2img
     if ref_b64:
         if settings.IMAGE_PROVIDER == "huggingface":
             return _generate_huggingface_img2img(prompt, ref_b64, strength=0.55)
         return _generate_pollinations_img2img(prompt, ref_b64)

     # Branch 3: no reference → text-to-image
     if settings.IMAGE_PROVIDER == "huggingface":
         return _generate_huggingface(prompt)
     return _generate_pollinations(prompt)
     ```
5. In `BaseBoardAI/backend/app/routers/storyboard.py`:
   - Update the image generation loop in `forge_storyboard_pipeline()`:
     ```python
     for scene in scenes:
         for frame in scene.frames:
             frame.generated_image_url = generate_frame_image(
                 frame, scene,
                 reference_style_image=payload.reference_style_image,
                 render_style=payload.render_style,
             )
     ```
   - Apply the same update to `forge_standalone_storyboard()`

**Relevant Context:**
- `BaseBoardAI/backend/app/core/image.py` — `generate_frame_image()` at line 113;
  `_convert_bytes_to_data_url()` at line 37; `_build_image_prompt()` at line 46
- `render_style` is now passed into `generate_frame_image()` from `payload.render_style` —
  this is the first time the image engine is aware of the render mode
- `_BW_SKETCH_NEGATIVE_CONSTRAINTS` is a module constant — do not inline it per-call;
  keeping it named makes it easy to audit and update as the prompt system evolves
- `strength=0.78` for sketch intersection is locked per Blueprint Lock Rule 3 (range 0.75–0.80;
  0.78 chosen as the mid-high point to maximise ink-texture overwrite while retaining silhouette)
- `strength=0.55` for standard img2img remains unchanged from the prior decision
- `reference_style_image` is consumed here and nowhere else — it never reaches the DB

---

### Sub-Task 9 — TypeScript types layer

**Status:** `[ ] pending`

**Intent:**
Create the TypeScript type layer that mirrors the backend Pydantic schemas exactly,
including the new `render_style` field added in Sub-Task 8b. `is_selected` is added
to `StoryboardFrame` as a **client-only field** — it is never sent to the backend and
is not present in the backend schema. It exists solely in React memory state to drive
the Locked Cut Folder curation view and is reset to `false` on each project load.

Additionally, add `jszip` to the frontend `package.json` for the batch ZIP export
sub-task later.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/types/storyboard.ts` exists with all interfaces
- All backend field names match snake_case exactly
- `StoryboardFrame` includes `generated_image_url: string | null`
- `is_selected` is **not** in `StoryboardFrame` — it is a separate client-only overlay
  managed in `WorkspacePage` as `Map<string, boolean>` (key: `s{N}_f{N}`)
- `PipelineExecutionRequest` includes `render_style: RenderStyle`, `global_aesthetic: string`,
  and `reference_style_image: string | null` as **three separate fields**
- `StoryboardProject` includes `render_style: string` (read-back from backend)
- `RenderStyle` union type exported separately for reuse
- `jszip` and `@types/jszip` added to `package.json`
- `file-saver` and `@types/file-saver` added to `package.json`
- `npm install jszip file-saver` runs without errors

**Todo List:**
1. Create `BaseBoardAI/frontend/src/types/storyboard.ts` with:
   - `FacialBlueprint` — `base_ethnicity_or_type`, `estimated_age`, `bone_structure`,
     `distinct_markers`, `fixed_seed_reference` (field names match backend exactly)
   - `CharacterProfile` — `id`, `name`, `facial_blueprint`, `wardrobe_defaults`
   - `StoryboardFrame` — all backend fields + `generated_image_url: string | null`
     (no `is_selected` — that lives in `WorkspacePage` state separately)
   - `StoryboardScene` — all backend fields including `color_palette: string[]`, `frames: StoryboardFrame[]`
   - `StoryboardProject` — `db_id`, `project_title`, `global_aesthetic`, `render_style`, `characters`, `scenes`
   - `FrameExportItem` — `{ sceneNumber: number; frameNumber: number; filename: string; dataUrl: string }`
   - `PipelineExecutionRequest` — `project_title`, `raw_character_notes`, `raw_world_notes`,
     `raw_script_text`, `global_aesthetic: string`, `render_style: RenderStyle`,
     `reference_style_image: string | null` (matches backend exactly — null when no upload)
   - `RenderStyle` — `'bw_sketch' | 'flat_color' | 'full_shaded'` (exported union type)
2. Add `"jszip": "^3.10.1"` to `dependencies` in `BaseBoardAI/frontend/package.json`
3. Add `"@types/jszip": "^3.4.8"` to `devDependencies`
4. Add `"file-saver": "^2.0.5"` to `dependencies`
5. Add `"@types/file-saver": "^2.0.7"` to `devDependencies`
6. Run `npm install jszip file-saver` from `BaseBoardAI/frontend/`

**Relevant Context:**
- Backend source of truth after Sub-Tasks 8b + 8c: `BaseBoardAI/backend/app/schemas/storyboard.py`
- `global_aesthetic` = cinematic tone descriptor (free-form)
- `render_style` = pipeline draw mode (`bw_sketch | flat_color | full_shaded`)
- `reference_style_image` = Base64 data URL of uploaded inspiration image, or `null`
- `is_selected` curation state is managed in `WorkspacePage` as `Map<string, boolean>`,
  not as a property on the frame type — this keeps the type layer clean and avoids
  hydrating every backend frame with a field the backend doesn't know about
- `BaseBoardAI/frontend/package.json` — add `jszip` + `file-saver` here

---

### Sub-Task 10 — App shell, navigation, and routing

**Status:** `[ ] pending`

**Intent:**
Replace the Vite boilerplate `App.tsx` with the BaseBoard AI workspace shell. Build the
three-link navigation bar from the spec (Workspaces · Project Library · Docs) with the
Granite AI Status badge on the far right, and wire client-side routing between the three
views. This is the scaffolding all other sub-tasks plug into.

**Expected Outcomes:**
- `App.tsx` renders the full workspace shell with the correct color palette
- Navigation has exactly 3 left links: **Workspaces**, **Project Library**, **Docs**
- Far-right badge shows: `Granite AI Status: ONLINE` (static, styled with `#00D4FF`)
- Active route is visually indicated
- Three route views exist as empty placeholder pages: `WorkspacePage`, `ProjectLibraryPage`, `DocsPage`
- App background is Off-White (`#F5F5F7`), header uses White/80 backdrop blur as in `Menu.html`
- No external routing library required — use simple `useState`-based client routing

**Todo List:**
1. Create `BaseBoardAI/frontend/src/pages/WorkspacePage.tsx` — placeholder returning `<div>Workspace</div>`
2. Create `BaseBoardAI/frontend/src/pages/ProjectLibraryPage.tsx` — placeholder
3. Create `BaseBoardAI/frontend/src/pages/DocsPage.tsx` — placeholder
4. Rewrite `BaseBoardAI/frontend/src/App.tsx`:
   - `useState<'workspace' | 'library' | 'docs'>` for active page
   - Header matches `Menu.html` layout: logo left (gold pulse dot + "BaseBoard AI" with cyan "AI"),
     nav links center-left, Granite Status badge far right
   - Main area renders the active page component
   - Apply Tailwind tokens: `bg-[#F5F5F7]`, `text-[#2D1B69]`, `border-b border-slate-200`, etc.
5. Replace `App.css` default styles with minimal reset — all styling goes through Tailwind
6. Verify `npm run dev` renders the shell with no console errors

**Relevant Context:**
- `Menu.html` — exact reference for header markup and colour tokens
- `BaseBoardAI/frontend/src/App.tsx` — file to rewrite
- Tailwind CSS 4 is already installed — use `@import "tailwindcss"` in `index.css` (v4 syntax)
- No `react-router-dom` needed; `useState` navigation keeps bundle small

---

### Sub-Task 11 — Pipeline input form + API client

**Status:** `[ ] pending`

**Intent:**
Build the `POST /storyboard/forge-pipeline` form and a typed `api.ts` fetch client.
This is the core "Execute 3-Stage Continuity Pipeline" trigger from `Menu.html`.
The form captures the three raw notes fields + project title + render style selector
and fires the backend pipeline on submit. The API client is the single file where all
`fetch()` calls to the backend live — no component should call `fetch` directly.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/api/storyboard.ts` exists with typed functions:
  - `forgePipeline(req: PipelineExecutionRequest): Promise<StoryboardProject>`
  - `listProjects(): Promise<StoryboardProject[]>`
  - `getProject(dbId: number): Promise<StoryboardProject>`
  - `deleteProject(dbId: number): Promise<void>`
- `BaseBoardAI/frontend/src/components/PipelineForm.tsx` renders:
  - Text input: `Project Title`
  - Textarea: `Character Notes`
  - Textarea: `World/Location Notes`
  - Textarea: `Screenplay Text`
  - Render Style selector (Sub-Task 13 style picker, placeholder `<select>` for now)
  - "Execute 3-Stage Continuity Pipeline →" submit button (deep purple, full-width)
  - Loading state: button disabled + spinner text while in-flight
  - Error state: red banner showing backend error detail
- On successful submit, calls a passed `onComplete(project: StoryboardProject)` callback
- Form is styled with Tailwind matching `Menu.html` aesthetic

**Todo List:**
1. Create `BaseBoardAI/frontend/src/api/storyboard.ts`:
   - `BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`
   - `forgePipeline(req: PipelineExecutionRequest)` → `fetch(BASE_URL + '/storyboard/forge-pipeline', { method: 'POST', body: JSON.stringify(req), headers: {'Content-Type': 'application/json'} })`
     - `req.reference_style_image` passes through as-is (null or Base64 string) — no special
       encoding needed; it is a plain JSON string field
   - `listProjects()` → `fetch(BASE_URL + '/storyboard/')`
   - `getProject(id)` → `fetch(BASE_URL + '/storyboard/' + id)`
   - `deleteProject(id)` → `fetch(BASE_URL + '/storyboard/' + id, { method: 'DELETE' })`
   - All functions throw on non-ok responses with the backend `detail` message
2. Create `BaseBoardAI/frontend/src/components/PipelineForm.tsx`
3. Wire `useState` for form fields, loading, and error; add `referenceStyleImage: string | null`
   to form state (populated by `StyleReferenceUploader` from Sub-Task 24)
4. On submit: call `forgePipeline()` with `reference_style_image: referenceStyleImage`,
   call `onComplete(project)` on success
5. Add `VITE_API_URL=http://localhost:8000` to `BaseBoardAI/frontend/.env.local` (create if absent)

**Relevant Context:**
- `BaseBoardAI/backend/app/routers/storyboard.py` — `POST /storyboard/forge-pipeline`
  accepts `PipelineExecutionRequest`; returns `201 StoryboardProjectResponse`
- `BaseBoardAI/frontend/src/types/storyboard.ts` (Sub-Task 9) — `PipelineExecutionRequest` type
- CORS is enabled on the backend via FastAPI's `add_middleware(CORSMiddleware)` in `main.py`

---

### Sub-Task 12 — Screenplay scene list + frame stream canvas

**Status:** `[ ] pending`

**Intent:**
Build the three-panel workspace layout from `Menu.html`:
- **Left (col-span-3):** Screenplay scene list — one button per scene, active state highlighted
- **Center (col-span-6):** Horizontal-scrolling storyboard frame stream displaying frame cards
  with `<img src={generated_image_url} />` or a placeholder skeleton when `null`
- **Right (col-span-3):** Director's Inspector panel (wired in Sub-Task 14)

This is the "basic frame viewer/gallery" priority item.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/SceneList.tsx` — list of scene buttons, emits `onSelectScene(scene)`
- `BaseBoardAI/frontend/src/components/FrameCard.tsx` — single frame card with image, shot metadata, duration badge
- `BaseBoardAI/frontend/src/components/FrameStream.tsx` — horizontal scroll container of `FrameCard` instances
- `WorkspacePage.tsx` renders:
  - 12-column grid: `SceneList` (col-3) + `FrameStream` (col-6) + placeholder inspector (col-3)
  - Pipeline form toggle (button opens `PipelineForm` modal or inline)
  - Active scene selection drives which frames are shown
- Frame card shows:
  - `<img>` when `generated_image_url` is present — full aspect-video fill
  - Placeholder skeleton (`bg-[#2D1B69]/5` with mono label) when image is null
  - Shot label (`Shot N • {shot_type}`) in `#D4A853`
  - Duration in font-mono
  - Action description (2-line clamp)
  - Cyan hover border (`group-hover:border-[#00D4FF]`)
- All styling matches `Menu.html` precisely

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/SceneList.tsx` — maps `scenes` prop to buttons
2. Create `BaseBoardAI/frontend/src/components/FrameCard.tsx` — renders one `StoryboardFrame`
3. Create `BaseBoardAI/frontend/src/components/FrameStream.tsx` — scrollable frame row
4. Update `WorkspacePage.tsx`:
   - Accept a `project: StoryboardProject | null` prop (or load via `getProject`)
   - Render 12-col grid layout matching `Menu.html`
   - `PipelineForm` displayed when no project is loaded
   - Once pipeline completes, render `SceneList` + `FrameStream`
   - Pass selected scene's frames to `FrameStream`
5. Wire `activeScene` state — clicking a scene in `SceneList` updates `FrameStream`
6. `FrameCard` renders `DownloadFrameButton` (placeholder — wired fully in Sub-Task 16)

**Relevant Context:**
- `Menu.html` — exact markup reference for frame card structure and panel layout
- `BaseBoardAI/frontend/src/types/storyboard.ts` — `StoryboardScene`, `StoryboardFrame`
- `FrameCard` hover border must use Tailwind `group` + `group-hover:border-[#00D4FF]`

---

### Sub-Task 13 — Render style selector

**Status:** `[ ] pending`

**Intent:**
Promote the render style `<select>` placeholder in `PipelineForm` into a proper styled
toggle component (`bw_sketch | flat_color | full_shaded`) and wire it to the dedicated
`render_style` field on the pipeline request — **not** `global_aesthetic`. The two fields
serve different purposes: `global_aesthetic` carries a free-form cinematic tone (e.g.,
"Neon Cyberpunk"), while `render_style` is the strict pipeline draw mode added in
Sub-Task 8b. They are sent as independent fields in the JSON body.

Also display the current render style as an aesthetic badge in the `FrameStream` header
(matching the `Menu.html` "Aesthetic: Cinematic High-Contrast" badge).

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/RenderStyleSelector.tsx` exists
- Three styled toggle buttons — one per style — using the brand colours
  - Active state: `bg-[#2D1B69] text-white`
  - Inactive: `border border-slate-200 text-slate-500 hover:border-[#00D4FF]`
- Selected style is sent in `PipelineForm` → `forgePipeline` as `request.render_style`
  (a separate field from `request.global_aesthetic`)
- `FrameStream` header badge reflects the active render style label
- `global_aesthetic` remains a free-form text input in `PipelineForm` — no coupling to
  `render_style`

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/RenderStyleSelector.tsx`
2. Props: `value: RenderStyle`, `onChange: (style: RenderStyle) => void`
3. Render three `<button>` elements for each style option with labels:
   - `bw_sketch` → "B&W Sketch"
   - `flat_color` → "Flat Color"
   - `full_shaded` → "Full Shaded"
4. Replace the placeholder `<select>` in `PipelineForm` with `RenderStyleSelector`
5. In `PipelineForm`, keep `global_aesthetic` as its own text input and `renderStyle` as its
   own state field — they are serialised as two separate keys in the request body
6. Update `FrameStream` header to render a `<span>` badge showing the active style label
7. Default selected style: `bw_sketch`

**Relevant Context:**
- `BaseBoardAI/frontend/src/types/storyboard.ts` — `RenderStyle` union type (Sub-Task 9)
- `BaseBoardAI/frontend/src/components/PipelineForm.tsx` — replace select with new component
- `PipelineExecutionRequest.render_style` is the correct target field (added in Sub-Task 8b)
- `global_aesthetic` and `render_style` are **never** merged — they map to different Granite
  prompt variables (`{global_aesthetic}` for tone, `{render_style}` for draw mode instruction)

---

### Sub-Task 14 — Director's Inspector panel (palette + lighting)

**Status:** `[ ] pending`

**Intent:**
Build the right panel (col-span-3) from `Menu.html` — the "Director's Palette Inspector"
and "Cinematography Settings" section. Color swatches render as interactive `<input type="color">`
pickers that update the displayed palette. The lighting/shadow dropdowns update a local
settings state (no backend re-inference at this stage — that is a stretch goal in Sub-Task 20).

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/InspectorPanel.tsx` exists
- Palette section: renders one swatch per hex in `activeScene.color_palette`
  - Each swatch is a clickable `<input type="color">` positioned over a styled `<div>`
  - On change: updates local swatch state (color mutation is client-side only)
  - Swatch shows hex label in 9px font-mono
- Cinematography section renders two dropdowns:
  - "Lighting Mood" — options: `Chiaroscuro / Cyber`, `Natural Daylight`, `Neon Noir`, `Golden Hour`
  - "Color Valence" — options: `High-Contrast`, `Muted`, `Saturated`, `Monochrome`
- Selected values displayed in their brand colours matching `Menu.html` exactly
- **Style Reference section** (built in Sub-Task 24) is mounted at the bottom of this
  panel, below the Render Style Selector — `StyleReferenceUploader` is rendered here
  and emits `onReferenceChange(dataUrl: string | null)` back to `PipelineForm` state
- Panel is scrollable when content overflows

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/InspectorPanel.tsx`
2. Props: `scene: StoryboardScene | null`, `onReferenceChange: (url: string | null) => void`
3. Palette grid: `grid grid-cols-3 gap-2` — render a swatch div per hex, overlay `<input type="color">`
4. Use `useState` to hold mutable swatch overrides (keyed by index)
5. Cinematography dropdowns: `useState` for `lightingMood` and `colorValence`
6. Mount `<StyleReferenceUploader onReferenceChange={onReferenceChange} />` at the panel bottom
   below a `border-t border-slate-100` divider (component built in Sub-Task 24)
7. Wire `InspectorPanel` into `WorkspacePage.tsx` as the right col-span-3 panel
8. Pass `activeScene` from `WorkspacePage` state into `InspectorPanel`

**Relevant Context:**
- `Menu.html` — exact markup for right panel layout
- `BaseBoardAI/frontend/src/components/FrameStream.tsx` — `activeScene` is derived from the same state
- Color mutation is fully client-side here; Sub-Task 20 adds backend re-render triggers
- `StyleReferenceUploader` (Sub-Task 24) is a drop-in child component — no state lifted
  further than `InspectorPanel` → `PipelineForm`

---

### Sub-Task 15 — Animatic player

**Status:** `[ ] pending`

**Intent:**
Build an interactive playback player inside the center canvas. It cycles through all
frames of the active scene sequentially using each frame's `duration_seconds` as the
interval. This is the "demo wow-factor" priority item.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/AnimaticPlayer.tsx` exists
- Renders the current frame's `generated_image_url` at full canvas size (or placeholder when null)
- Shows frame number + shot type + duration overlay (bottom of frame)
- Play / Pause / Reset controls
- On Play: auto-advances to the next frame after `frame.duration_seconds * 1000` ms
- On reaching the last frame, loops back to frame 0
- Timeline scrubber bar: shows progress through the frame sequence (clickable)
- `WorkspacePage.tsx` has a toggle between "Gallery" mode (Sub-Task 12) and "Player" mode (this)
- Player is only accessible once a project is loaded

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/AnimaticPlayer.tsx`
2. Props: `frames: StoryboardFrame[]`
3. `useState` for `currentIndex` and `isPlaying`
4. `useEffect` with `setTimeout` when `isPlaying`:
   - Wait `frames[currentIndex].duration_seconds * 1000` ms
   - Advance to `(currentIndex + 1) % frames.length`
5. Render current frame image at `aspect-video` aspect ratio in the center
6. Overlay: bottom bar with `Shot {frame_number} • {shot_type}` + duration badge
7. Controls bar below: Play `▶` / Pause `⏸` / Reset `⏮` buttons styled with deep purple
8. Timeline: `<div>` bar with individual frame tick marks; click a tick to jump to that index
9. Add "Player" toggle button to `FrameStream` header in `WorkspacePage.tsx`

**Relevant Context:**
- `BaseBoardAI/frontend/src/types/storyboard.ts` — `StoryboardFrame.duration_seconds`
- `StoryboardFrame.frame_number` used for timeline ordering
- Player works on the currently selected scene's frames

---

### Sub-Task 16 — Export layer (per-frame PNG + batch ZIP)

**Status:** `[ ] pending`

**Intent:**
Build the complete export infrastructure:
- Per-frame single PNG download via programmatic anchor-link (no server round-trip)
- Batch ZIP export: a **single-click** operation using `jszip` + `file-saver` that
  compiles only frames where `is_selected === true` (read from `WorkspacePage`'s
  `Map<string, boolean>` state) into a ZIP archive alongside `production_manifest.md`.
  There is no staggered sequential anchor-link loop — the entire batch is assembled
  in memory by JSZip, then handed to `file-saver`'s `saveAs()` as a single blob download.

This is the "Download/export (practical)" priority item.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/utils/exportFrames.ts` exists
- `downloadFramePng(frame, filename?)` — anchor-link download for individual frames,
  early-return when `generated_image_url` is null
- `prepareFrameBatch(scenes)` — returns `FrameExportItem[]` for all non-null frames
  (used by The Vault view)
- `prepareLockedCut(scenes, selectedKeys: Set<string>)` — filters to only frames whose
  key (`s{sceneN}_f{frameN}`) is present in the `selectedKeys` set **and** whose
  `generated_image_url` is non-null; returns `FrameExportItem[]`
  - Note: `is_selected` is not a property on `StoryboardFrame` — the set is passed in
    from `WorkspacePage` state and evaluated here
- `buildManifestMd(project, items)` — returns a markdown string:
  - Header block: project title, render style, export timestamp
  - Table: `scene | frame | shot_type | duration_seconds | filename`
- `exportLockedCutZip(project, items: FrameExportItem[])` — single-click ZIP compiler:
  - `import JSZip from 'jszip'`
  - `import { saveAs } from 'file-saver'`
  - Creates a zip with a `frames/` subfolder
  - For each item: decode base64 → `dataUrl.split(',')[1]` → `atob` → `Uint8Array`
    → `zip.folder('frames')!.file(item.filename, uint8array)`
  - `zip.file('production_manifest.md', buildManifestMd(project, items))`
  - `const blob = await zip.generateAsync({ type: 'blob' })`
  - `saveAs(blob, \`${project.project_title}_locked_cut.zip\`)` — single download trigger,
    no staggered timeouts, no anchor elements
- `BaseBoardAI/frontend/src/components/FrameExportButton.tsx` — per-frame download button
  - Disabled + muted when `generated_image_url` is null
  - Uses `downloadFramePng` on click
- `BaseBoardAI/frontend/src/components/BatchExportBar.tsx` — project-level toolbar
  - Receives `scenes: StoryboardScene[]` and `selectedKeys: Set<string>` as props
  - Computes `lockedItems = prepareLockedCut(scenes, selectedKeys)` inline
  - Shows `{lockedItems.length} of {totalFrameCount} frames in Locked Cut`
  - "Export Locked Cut ZIP" button — disabled when `lockedItems.length === 0`
  - On click: calls `exportLockedCutZip(project, lockedItems)` — one call, one download
- `FrameExportButton` is added to each `FrameCard`
- `BatchExportBar` is added to the `WorkspacePage` toolbar area

**Todo List:**
1. Create `BaseBoardAI/frontend/src/utils/exportFrames.ts`:
   - Implement `downloadFramePng(frame, filename?)`
   - Implement `prepareFrameBatch(scenes)`
   - Implement `prepareLockedCut(scenes, selectedKeys: Set<string>)` — evaluates
     `selectedKeys.has(\`s\${scene.scene_number}_f\${frame.frame_number}\`)` per frame;
     no `is_selected` property read from the frame object itself
   - Implement `buildManifestMd(project, items)` — project header + frame table
   - Implement `exportLockedCutZip(project, items)`:
     - All frames packed under `frames/` folder inside the zip
     - `saveAs(blob, filename)` from `file-saver` as the single download trigger
     - Function is `async` — `await zip.generateAsync(...)` before calling `saveAs`
2. Create `BaseBoardAI/frontend/src/components/FrameExportButton.tsx`
3. Create `BaseBoardAI/frontend/src/components/BatchExportBar.tsx`:
   - Props: `{ project: StoryboardProject; scenes: StoryboardScene[]; selectedKeys: Set<string> }`
   - No internal stagger logic — calls `exportLockedCutZip` directly on button click
4. Add `FrameExportButton` to `FrameCard.tsx` (bottom of card)
5. Add `BatchExportBar` to `WorkspacePage.tsx` toolbar, pass `selectedKeys` from the
   `Map<string, boolean>` state (convert map keys where value is `true` to a `Set<string>`)
6. Add lock/star toggle button to `FrameCard` that calls `onToggleSelect(key)` — updates
   the `Map<string, boolean>` in `WorkspacePage`, not a frame property

**Relevant Context:**
- `jszip` + `file-saver` added to `package.json` in Sub-Task 9
- `BaseBoardAI/frontend/src/types/storyboard.ts` — `FrameExportItem` (Sub-Task 9);
  `StoryboardFrame` does **not** have `is_selected` — selection lives in `WorkspacePage`
  as `Map<string, boolean>` and is passed as `Set<string>` into export utilities
- Locked Cut Folder = frames whose key exists in `selectedKeys` with value `true`
- The Vault = all frames (`prepareFrameBatch` — no selection filter applied)
- `file-saver`'s `saveAs(blob, filename)` replaces all anchor-element download patterns
  for batch operations; individual `downloadFramePng` may still use an anchor for
  single-file simplicity

---

### Sub-Task 17 — The Vault + Locked Cut Folder UI

**Status:** `[ ] pending`

**Intent:**
Build the two curation folder views from the spec:
- **The Vault** — a grid of every generated frame across all scenes
- **The Locked Cut Folder** — a grid of only `is_selected: true` frames

Both are toggle views accessible from the workspace. Each card shows the frame image, a lock/select toggle, and the single-frame download button.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/VaultGrid.tsx` — responsive grid of all frames with images
- `BaseBoardAI/frontend/src/components/LockedCutFolder.tsx` — same grid but filtered to `is_selected`
- Toggle buttons in `WorkspacePage` header to switch between Gallery / Player / Vault / Locked Cut
- `is_selected` is managed as local React state in `WorkspacePage` as
  `Map<string, boolean>` (key: `s{sceneN}_f{frameN}`) — it is **not** a field on
  `StoryboardFrame` and is **not** in the backend schema
- Toggling a frame's lock in any view (Gallery or Vault) updates shared state and reflects everywhere
- Frame count badge on the Locked Cut tab updates reactively

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/VaultGrid.tsx`
2. Create `BaseBoardAI/frontend/src/components/LockedCutFolder.tsx`
3. Lift `selectedFrames: Set<string>` state into `WorkspacePage` (key: `s{sceneN}_f{frameN}`)
4. Pass `isSelected` and `onToggleSelect` props down to `FrameCard`, `VaultGrid`, `LockedCutFolder`
5. Add four view-mode toggle buttons to `WorkspacePage` header: `Gallery | Player | Vault | Locked Cut`
6. Update `BatchExportBar` to receive the locked selection count and render the correct badge

**Relevant Context:**
- `BaseBoardAI/frontend/src/components/FrameCard.tsx` — needs `isSelected` + `onToggleSelect` props
- `BaseBoardAI/frontend/src/utils/exportFrames.ts` — `prepareLockedCut` uses the is_selected flag

---

### Sub-Task 18 — Project Library page

**Status:** `[ ] pending`

**Intent:**
Wire `ProjectLibraryPage.tsx` to `GET /storyboard/` — renders a grid of saved project cards
from the database. Each card shows project title, scene/frame count, and a "Load" button that
calls `GET /storyboard/{db_id}` and navigates to the Workspace view with that project loaded.

**Expected Outcomes:**
- `ProjectLibraryPage.tsx` loads `listProjects()` on mount via `useEffect`
- Renders project cards in a responsive `grid-cols-3` grid
- Each card: title, scene count, total frame count, "Load" button
- "Load" button calls `getProject(db_id)` then calls a passed `onLoadProject(project)` callback
- `App.tsx` passes `onLoadProject` and switches view to Workspace
- Empty state: styled empty message when no projects exist
- Loading skeleton state while fetch is in-flight
- Delete button per card with confirmation

**Todo List:**
1. Update `ProjectLibraryPage.tsx` to accept `onLoadProject: (p: StoryboardProject) => void` prop
2. `useEffect` → `listProjects()` → `setProjects(data)` on mount
3. Render grid of project summary cards with "Load" and "Delete" actions
4. On "Load": `getProject(project.db_id!)` → call `onLoadProject(fullProject)` → switch to workspace view
5. On "Delete": `deleteProject(db_id)` → remove from local list
6. Wire `onLoadProject` in `App.tsx` — stores project in state, switches active page to `workspace`

**Relevant Context:**
- `BaseBoardAI/frontend/src/api/storyboard.ts` — `listProjects`, `getProject`, `deleteProject`
- `GET /storyboard/` defers image columns — list is fast
- `GET /storyboard/{db_id}` includes full image data

---

### Sub-Task 19 — Docs page (script template shortcuts)

**Status:** `[ ] pending`

**Intent:**
Wire `DocsPage.tsx` as a reference page showing script format templates and input field
guidance. Static content — no API calls. Helps directors know how to format their input
for best results with the 3-stage pipeline.

**Expected Outcomes:**
- `DocsPage.tsx` renders a clean single-column layout with:
  - Screenplay format guide (INT./EXT. scene heading syntax)
  - Character notes template (name, wardrobe, facial blueprint guidance)
  - World notes template (location slugs, lighting keys)
  - Tips for `bw_sketch` vs `flat_color` vs `full_shaded` aesthetic impact
- Styled with Off-White background, deep-purple headings, cyan accent borders
- Copyable code blocks for template snippets

**Todo List:**
1. Rewrite `DocsPage.tsx` with structured static content sections
2. Create a `<CopyBlock>` inline component for copyable template text
3. Style with Tailwind — `prose` equivalent classes using brand tokens

**Relevant Context:**
- Brand palette: `#2D1B69` headings, `#00D4FF` accents, `#F5F5F7` background
- No API calls — fully static

---

### Sub-Task 20 — Line tinting filter (stretch goal)

**Status:** `[ ] pending`

**Intent:**
Implement the "Dynamic Line Tinting Overrides" feature from the spec. When the active
render style is `bw_sketch`, the `InspectorPanel` shows a tint color picker. The selected
tint color is applied as a CSS `mix-blend-mode` filter on the frame image elements — zero
backend re-inference, zero latency.

This is a purely client-side CSS layer on top of the existing `<img>` elements.

**Expected Outcomes:**
- `InspectorPanel` shows a "Line Tint" section when active render style is `bw_sketch`
- Color picker defaults to `#FF1493` (Neon Production Pink) and `#00D4FF` (Viewport Cyan)
  as preset swatches, plus a free `<input type="color">`
- Selected tint color is stored in `WorkspacePage` state and passed to all `FrameCard` components
- Each `FrameCard` wraps the `<img>` in a relative `<div>` with a pseudo-overlay `<div>`
  using `bg-{tintColor}` and `mix-blend-mode: multiply` CSS (applied via inline style)
- Tinting only activates when `renderStyle === 'bw_sketch'` and a tint is selected
- Toggling to `flat_color` or `full_shaded` removes the tint overlay automatically

**Todo List:**
1. Add `lineTintColor: string | null` and `renderStyle: RenderStyle` to `WorkspacePage` state
2. Update `InspectorPanel` props to accept `renderStyle` and `onLineTintChange`
3. Add "Line Tint" section to `InspectorPanel` — only visible when `renderStyle === 'bw_sketch'`
4. Preset swatch buttons: `#FF1493` (Neon Pink), `#00D4FF` (Viewport Cyan), `#FFFFFF` (None)
5. Free `<input type="color">` for custom tint
6. Update `FrameCard` to accept optional `lineTintColor: string | null` prop
7. In `FrameCard` image wrapper: render a sibling `<div>` absolutely positioned over the image
   with `backgroundColor: lineTintColor`, `mixBlendMode: 'multiply'`, `opacity: 0.6`, `inset: 0`
   — only rendered when `lineTintColor !== null`

**Relevant Context:**
- CSS `mix-blend-mode: multiply` on a coloured overlay turns white areas transparent and
  recolors black sketch linework to the chosen tint colour — no image processing needed
- Hardware-accelerated via browser compositor — zero JS computation per render
- `BaseBoardAI/frontend/src/components/FrameCard.tsx` — image wrapper to update
- `BaseBoardAI/frontend/src/components/InspectorPanel.tsx` — add tint controls

---

### Sub-Task 21 — Lighting + shadow re-render controls (stretch goal)

**Status:** `[ ] pending`

**Intent:**
Wire the lighting mood and color valence dropdowns in `InspectorPanel` to trigger a
backend re-render of the selected frame. When the director changes the lighting
setting for a frame, the system POSTs a modified frame request (using
`forge-standalone-storyboard` with the updated `lighting_notes`) and refreshes
the single frame image in-place.

**Expected Outcomes:**
- "Apply" button appears in `InspectorPanel` when lighting/color valence has been changed
- On click: calls a new `reforgeFrame(framePayload)` API function
- The updated frame image replaces the old one in `WorkspacePage` state without re-running
  the full 3-stage pipeline
- Loading spinner on the specific `FrameCard` while re-render is in-flight
- `reforgeFrame` maps to `POST /storyboard/forge-standalone-storyboard` with a single-scene
  single-frame payload constructed from the current project context + new lighting params

**Todo List:**
1. Add `reforgeFrame` to `BaseBoardAI/frontend/src/api/storyboard.ts`
2. Update `InspectorPanel` to track "dirty" state when dropdown values change
3. Render "Apply Lighting →" button when dirty
4. On click: construct minimal `StandaloneStoryboardRequest` with modified `lighting_notes`
5. Call `reforgeFrame`, update the specific frame's `generated_image_url` in `WorkspacePage` state
6. Add per-frame `isRefetching: boolean` prop to `FrameCard` — show spinner overlay when true

**Relevant Context:**
- `BaseBoardAI/backend/app/routers/storyboard.py` — `POST /storyboard/forge-standalone-storyboard`
  is the correct endpoint; it skips character/world stages and returns `db_id: null`
- `BaseBoardAI/frontend/src/components/InspectorPanel.tsx` — dirty state tracking here

---

### Sub-Task 22 — Character Sheet: turnaround layout + expressions grid

**Status:** `[ ] pending`

**Intent:**
Extend the Character Dictionary component so that each character entry renders a
production-standard reference sheet. The sheet has two sections: a **4-angle model
turnaround** (Front, 3/4, Side, Back) and an **expressions grid** (a fixed set of
canonical emotional states). These are layout scaffolds — directors place or
generate images per angle/expression slot. Both layouts are print-ready and
compose cleanly into the batch ZIP export.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/CharacterSheet.tsx` exists
- **Turnaround section** — a row of four labelled image slots:
  - Slot labels: `FRONT`, `3/4 VIEW`, `SIDE`, `BACK`
  - Each slot is a fixed `aspect-[3/4]` card with a placeholder skeleton when empty
  - Each slot accepts a `generated_image_url: string | null` prop
  - Active slots render `<img src={url} />` at full card fill
  - Slot label rendered at bottom in `#D4A853` uppercase font-mono
- **Expressions grid** — a 3×2 grid of labelled image slots:
  - Fixed expression labels: `NEUTRAL`, `DETERMINED`, `FEARFUL`, `ANGRY`, `JOYFUL`, `DEFEATED`
  - Same card/skeleton treatment as turnaround slots
  - Grid label rendered below each card in slate-400 font-mono
- A `CharacterSheetHeader` bar above both sections showing character name and `wardrobe_defaults`
  summary styled in deep purple
- `CharacterSheet` is rendered inside `CharacterDictionaryPanel.tsx` — one sheet per
  character in `project.characters`
- `CharacterDictionaryPanel` is accessible as a new workspace view-mode toggle
  ("Characters") alongside the existing Gallery / Player / Vault / Locked Cut tabs
- All turnaround and expression slot images default to `null` on first render —
  generation is a future trigger; the sheet scaffolding ships independently

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/CharacterSheet.tsx`:
   - Props:
     ```ts
     interface CharacterSheetProps {
       character: CharacterProfile;
       turnaroundUrls?: [string|null, string|null, string|null, string|null]; // F, 3/4, Side, Back
       expressionUrls?: [string|null, string|null, string|null, string|null, string|null, string|null];
     }
     ```
   - Turnaround row: `flex gap-3` — four `TurnaroundSlot` sub-components
   - Expressions grid: `grid grid-cols-3 gap-2` — six `ExpressionSlot` sub-components
   - `TurnaroundSlot` and `ExpressionSlot` are inline sub-components inside the file
     (no separate files needed)
2. `TurnaroundSlot` renders:
   - Outer: `relative aspect-[3/4] w-full rounded-xl bg-[#2D1B69]/5 border border-slate-100 overflow-hidden`
   - When `url` is null: skeleton with centered `FRAME_EMPTY` mono label
   - When `url` is set: `<img src={url} className="absolute inset-0 w-full h-full object-cover" />`
   - Label bar at bottom: `absolute bottom-0 w-full bg-white/80 text-[10px] font-mono text-[#D4A853] uppercase text-center py-1`
3. `ExpressionSlot` uses identical treatment with `aspect-square` (square not 3/4)
4. `CharacterSheetHeader` section above both grids:
   - Character name in `text-lg font-bold text-[#2D1B69]`
   - `wardrobe_defaults` in `text-xs text-slate-400`
   - Cyan separator line below: `border-b border-[#00D4FF]/30 mb-4`
5. Create `BaseBoardAI/frontend/src/components/CharacterDictionaryPanel.tsx`:
   - Props: `characters: CharacterProfile[]`
   - Maps `characters` to `<CharacterSheet>` instances (with empty url arrays as defaults)
   - Scrollable container: `overflow-y-auto space-y-8`
6. Add `'characters'` to the view-mode union type in `WorkspacePage.tsx` and render
   `CharacterDictionaryPanel` when that mode is active
7. Add `Characters` toggle button to the workspace view-mode tab bar

**Relevant Context:**
- `BaseBoardAI/frontend/src/types/storyboard.ts` — `CharacterProfile` type (Sub-Task 9)
- `WorkspacePage.tsx` view-mode state (Sub-Task 17) — add `'characters'` to the union
- Turnaround and expression image generation is deferred — the layout ships as scaffolding
  that directors can populate manually or via a future generation trigger
- Export: `CharacterSheet` should be exportable as part of the batch ZIP in a future pass
  (name pattern: `character_{id}_turnaround.png`, `character_{id}_expr_{label}.png`)

---

### Sub-Task 23 — Silhouette test toggle on character preview cards

**Status:** `[ ] pending`

**Intent:**
Add a one-click silhouette test mode to character preview cards. When activated, a
`.silhouette-test-active` CSS class is toggled onto the card's image element, applying
`filter: brightness(0) contrast(100%)` which collapses all surface detail to pure black.
This allows directors to instantly audit character shape readability — a standard
production quality-control check — without leaving the workspace.

The toggle is a per-card affordance: each card has its own independent silhouette state.

**Expected Outcomes:**
- A `SilhouetteToggleButton` component exists (inline or standalone)
- Pressing it adds/removes `silhouette-test-active` class on the `<img>` inside the card
- The CSS rule is defined in `index.css`:
  ```css
  .silhouette-test-active {
    filter: brightness(0) contrast(100%);
  }
  ```
- The toggle is present on:
  - Each `TurnaroundSlot` image inside `CharacterSheet` (Sub-Task 22)
  - The primary character preview image in `CharacterDictionaryPanel` header
- When silhouette mode is active, the button label changes from `Silhouette` to `Colour`
  and the card gains a `ring-2 ring-[#00D4FF]` border to signal active state
- Toggling works independently per slot — enabling silhouette on the FRONT view does
  not affect the 3/4 or expression slots
- When `generated_image_url` is null (slot is empty), the button is hidden — nothing
  to silhouette-test on an empty slot

**Todo List:**
1. Add to `BaseBoardAI/frontend/src/index.css`:
   ```css
   .silhouette-test-active {
     filter: brightness(0) contrast(100%);
   }
   ```
2. Add `isSilhouette` boolean state (via `useState`) to `TurnaroundSlot` inside
   `CharacterSheet.tsx`
3. On the `<img>` element inside `TurnaroundSlot`:
   - Apply `className={isSilhouette ? 'silhouette-test-active ...' : '...'}`
   - Add `ring-2 ring-[#00D4FF]` to the outer slot container when `isSilhouette` is true
4. Add a toggle button overlay (top-right corner of the slot, `absolute top-1 right-1`):
   - Label: `isSilhouette ? 'Colour' : 'Silhouette'`
   - Style: `text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/70 text-white
     hover:bg-[#2D1B69] cursor-pointer`
   - Only rendered when `url !== null`
   - `onClick`: `setIsSilhouette(prev => !prev)`
5. Apply the same `isSilhouette` toggle pattern to the main character portrait in
   `CharacterDictionaryPanel.tsx` header area if a portrait image field is added later
   (stub the hook now so the pattern is consistent)

**Relevant Context:**
- `BaseBoardAI/frontend/src/components/CharacterSheet.tsx` (Sub-Task 22) — primary target
- `BaseBoardAI/frontend/src/index.css` — add the CSS class here (Tailwind v4 coexists with
  custom classes in the same file via `@layer utilities` or plain class rules)
- `filter: brightness(0) contrast(100%)` is hardware-accelerated via the browser compositor
  layer — identical performance characteristic to the `mix-blend-mode` tinting in Sub-Task 20
- The `silhouette-test-active` class name is kept as a plain CSS class (not a Tailwind
  arbitrary value) so it can be toggled cleanly via `classList` if needed in future without
  Tailwind's JIT purging removing it

---

### Sub-Task 24 — `StyleReferenceUploader` component

**Status:** `[ ] pending`

**Intent:**
Build the drag-and-drop style reference upload component that lives at the bottom of the
`InspectorPanel`. Directors drag or click-to-select a PNG or JPEG inspiration image. The
component immediately converts it to a Base64 data URL string in the browser, stores it in
local state, shows a thumbnail preview with a remove button, and surfaces the value upward
via an `onReferenceChange` callback. No file is ever uploaded to a server — the Base64
string is passed as a JSON field when the pipeline is triggered.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/StyleReferenceUploader.tsx` exists
- Drag-and-drop zone with dashed border:
  - Idle state: dashed border `border-dashed border-2 border-slate-200`, centered label
    "Drop style reference here" + "PNG / JPEG" in `text-[10px] text-slate-400`
  - Drag-over state: border color changes to `border-[#00D4FF]`, background `bg-[#00D4FF]/5`
- Accepts `dragover`, `drop`, and `<input type="file" accept="image/png,image/jpeg">` click
- On file receipt:
  1. Read the file with `FileReader.readAsDataURL()` — produces `data:image/...;base64,...`
  2. Store the data URL string in `useState<string | null>`
  3. Call `onReferenceChange(dataUrl)` to surface the value to `InspectorPanel` → `PipelineForm`
- Preview state (once a file is loaded):
  - Thumbnail: `<img src={dataUrl} className="w-full aspect-video object-cover rounded-lg" />`
  - Below thumbnail: file name in `text-[10px] font-mono text-slate-400`
  - "Remove Style Override" button: `text-[10px] text-red-400 hover:text-red-600 underline cursor-pointer`
  - On remove: clears state, calls `onReferenceChange(null)`
- Section header above the drop zone: `"Style Reference Override"` in
  `text-xs font-bold tracking-wider text-slate-400 uppercase`
- Component is scoped to the Inspector sidebar only — it does not appear on `PipelineForm`
  directly; `PipelineForm` reads the value via `referenceStyleImage` state that
  `InspectorPanel` lifts back through `onReferenceChange`

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/StyleReferenceUploader.tsx`:
   - Props: `onReferenceChange: (dataUrl: string | null) => void`
   - `useState<string | null>(null)` for `previewUrl`
   - `useState<string>('')` for `fileName`
   - `useState<boolean>(false)` for `isDragOver`
   - Hidden `<input type="file" ref={inputRef} accept="image/png,image/jpeg" />`
   - Outer drop zone `<div>` with `onDragOver`, `onDragLeave`, `onDrop`, `onClick` handlers
2. `processFile(file: File)` internal function:
   - Guard: `if (!file.type.startsWith('image/')) return`
   - `const reader = new FileReader()`
   - `reader.onload = (e) => { const url = e.target?.result as string; setPreviewUrl(url); setFileName(file.name); onReferenceChange(url); }`
   - `reader.readAsDataURL(file)`
3. `onDrop` handler: `e.preventDefault(); processFile(e.dataTransfer.files[0])`
4. `onClick` on drop zone: `inputRef.current?.click()` — opens file picker
5. `onChange` on hidden input: `processFile(e.target.files?.[0])`
6. Remove handler: `setPreviewUrl(null); setFileName(''); onReferenceChange(null)`
7. Conditional render:
   - When `previewUrl` is null: render drop zone with idle/drag-over styling
   - When `previewUrl` is set: render thumbnail + filename + remove button
8. Mount in `InspectorPanel.tsx` below the existing Cinematography section,
   behind a `border-t border-slate-100 pt-4 mt-4` spacing block

**Relevant Context:**
- `BaseBoardAI/frontend/src/components/InspectorPanel.tsx` (Sub-Task 14) — parent mount point
- `BaseBoardAI/frontend/src/components/PipelineForm.tsx` (Sub-Task 11) — consumes the value
  via `referenceStyleImage` state, passes as `reference_style_image` in the API request
- `FileReader.readAsDataURL()` produces a fully-formed `data:image/jpeg;base64,...` or
  `data:image/png;base64,...` string — the backend `_strip_data_url_header()` helper
  (Sub-Task 8c) handles both MIME prefixes correctly
- No compression is applied — raw file bytes are Base64-encoded as-is. For large files
  (>5MB) this will increase request payload size significantly. If needed, a canvas
  `drawImage` + `toDataURL('image/jpeg', 0.8)` resize step can be added before encoding,
  but is not required for the initial implementation
- No external drag-and-drop library needed — native HTML5 drag events only

---

## Design Decisions (Locked)

### `render_style` — Explicit Backend Field (not overloaded onto `global_aesthetic`)

**Decision:** `render_style` is added as a first-class `Literal['bw_sketch', 'flat_color', 'full_shaded']`
field on `PipelineExecutionRequest` (Sub-Task 8b). It is never merged with `global_aesthetic`.

**Rationale:** `global_aesthetic` is a free-form cinematic tone descriptor ("Neon Cyberpunk",
"High-Contrast Noir") that feeds into the creative framing of the prompt. `render_style` is a
structural draw-mode instruction that the Granite model must apply deterministically to every
generated asset. Mixing them in one field creates ambiguity in the prompt — Granite would have
to infer which part of the string is a tone hint and which part is an output format command.
Keeping them separate allows the `STORYBOARD_PROMPT` to inject them at different positions with
different grammatical framing, improving output consistency and making the render mode
machine-verifiable at the schema layer via Pydantic `Literal` validation.

---

### `is_selected` — React Memory State Only (backend persistence deferred)

**Decision:** `is_selected` curation state lives exclusively in `WorkspacePage` React memory
as `Map<string, boolean>` (key: `s{sceneN}_f{frameN}`). It is not a field on `StoryboardFrame`
in the TypeScript types, is not sent to the backend, and resets on every project load.

**Rationale:** Implementing backend persistence adds a DB column, an ORM change, and a new
PATCH endpoint — three moving parts that don't increase the demo velocity of the core
pipeline. The Locked Cut feature is fully functional as a session-level curation tool
without persistence. Directors can re-curate in seconds. Persistence is a low-priority
stretch task once the full frontend compilation is stable.

**If persistence is required later:**
1. Add `is_selected: bool = False` to `StoryboardFrameBase` in `app/schemas/storyboard.py`
2. Add `is_selected: Mapped[bool]` column to `StoryboardFrameORM` in `app/db/models.py`
3. Add `PATCH /storyboard/{db_id}/frames/{frame_id}/select` endpoint to `storyboard.py`
4. Add `is_selected: boolean` to the `StoryboardFrame` TS type and remove the `Map` overlay

---

### `reference_style_image` — Ephemeral Input, Never Persisted (Rule 1 — LOCKED)

**Decision:** `reference_style_image` exists on `PipelineExecutionRequest` only. It is not
added to `StoryboardProjectCreate`, `StoryboardProjectResponse`, `StoryboardProjectORM`,
or any other schema, response model, or database layer. The field travels via HTTP payload
for real-time pipeline execution and is consumed entirely within `generate_frame_image()`.
The resulting `generated_image_url` data URL — which already embeds the stylistic influence
of the reference — is what gets persisted. No intermediate representation of the reference
image ever touches the database.

**Enforcement:** Any future sub-task that proposes adding `reference_style_image` to an ORM
model or response schema must be rejected. The memory footprint rationale is permanent:
storing a second large Base64 BLOB per project would require the same deferred-column
mitigation already applied to `generated_image_url`, serves no read-back purpose, and can
be reproduced by the director re-uploading from their filesystem in seconds.

---

### `render_style` Default — Locked to `bw_sketch` (Rule 2 — LOCKED)

**Decision:** The default value of `render_style` is `'bw_sketch'` across all schemas
(`PipelineExecutionRequest`, `StoryboardProjectCreate`) and the ORM column default.
This is non-negotiable and must not be changed to any other value in any future sub-task.

**Rationale:** `bw_sketch` is the foundation mode for two hardware-accelerated client-side
systems that depend on black-linework-on-white-background output:
- Sub-Task 20 — `mix-blend-mode: multiply` line tinting overlay
- Sub-Task 23 — `.silhouette-test-active` CSS filter toggle

Both systems produce incorrect or inert results if the default boot mode is `flat_color`
or `full_shaded`. Directors select other modes explicitly via the `RenderStyleSelector`
toggle in the Inspector panel.

---

### `bw_sketch` + `reference_style_image` Intersection — Sketch-Reference Rule (Rule 3 — LOCKED)

**Decision:** When both `render_style == 'bw_sketch'` and `reference_style_image` is
non-null, a dedicated sketch-reference intersection path activates in `generate_frame_image()`.
This path overrides the standard img2img parameters with two mandatory changes:

1. **Aggressive negative-constraint prompt injection** — before the prompt reaches either
   provider, `_inject_sketch_constraints()` appends the `_BW_SKETCH_NEGATIVE_CONSTRAINTS`
   string to strip all color, texture, gradient, and photographic data from the reference:
   > `Negative: color, color fills, gradients, tones, shading, texture, paint, watercolor, photograph, render. Positive: fine-tip fineliner ink pen, cross-hatching, pure black linework, pure white background only.`
   The negative constraints are load-bearing — without them, the model reads color and
   texture data from the reference image and bleeds it into the output, which would corrupt
   the `mix-blend-mode: multiply` tinting overlay.

2. **Strength parameter raised to `0.78`** — within the locked range of 0.75–0.80 specified
   by Blueprint Lock Rule 3. At this value the provider treats the reference as a loose
   silhouette and composition guide only; the ink-pen texture instruction in the positive
   constraints completely overwrites the reference's visual texture. The standard img2img
   strength of `0.55` is explicitly NOT used on this path — at `0.55` too much reference
   color and texture bleeds through before the negative constraints can neutralise it.

**Why `0.78` specifically:** The midpoint of 0.75–0.80. Values below 0.75 preserve too much
reference texture to reliably yield clean B&W linework. Values above 0.80 risk losing the
silhouette-composition benefit of providing a reference at all. `0.78` is the optimal
balance point; do not adjust without testing against the `mix-blend-mode` tinting pipeline.
