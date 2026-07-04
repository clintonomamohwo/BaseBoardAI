# BaseBoardAI — Full Implementation Plan

## Top-Level Overview

**Goal:** Wire the IBM WatsonX Granite LLM into the existing FastAPI backend to activate the
four currently-stubbed pipeline endpoints, add a user-selectable image generation layer that
produces a visual thumbnail for every storyboard frame, and build a client-side export layer
that processes the cached `generated_image_url` data properties — supporting individual frame
PNG downloads and batch export preparation.

**Scope:**
- Environment config loading (`app/core/config.py`)
- LLM client module (`app/core/llm.py`) using `ibm-watsonx-ai` + LangChain
- Strengthened prompt templates (`app/core/prompts.py`)
- Wiring of all four pipeline endpoints in `app/routers/storyboard.py`
- `python-dotenv` dependency + `.env` file setup
- Image generation module (`app/core/image.py`) — user selects Pollinations.ai or Hugging Face
- `generated_image_url` field added to `StoryboardFrameBase` schema and `StoryboardFrameORM`
- Client-side export utility (`src/utils/exportFrames.ts`) — individual PNG download + batch hooks
- Export UI components (`FrameExportButton`, `BatchExportBar`) wired to the canvas workspace

**Non-goals:**
- Server-side ZIP generation (export is 100% client-side — no backend changes)
- Async/streaming endpoints
- Alembic migrations (SQLite auto-create on startup is sufficient for now)
- Rate limiting, auth, monitoring
- Local Stable Diffusion (requires GPU — out of scope)

**Approach:** Sequential — sub-tasks 1–8 cover the backend pipeline (all complete). Sub-tasks
9–10 cover the new client-side export layer on the React frontend.

---

## Sub-Tasks

---

### Sub-Task 1 — Add `python-dotenv` and create `.env`

**Status:** `[ ] pending`

**Intent:**
The app currently has no way to load environment variables from a file. `python-dotenv` must
be added to `requirements.txt` and a `.env` file must be created at the backend root so that
WatsonX credentials are available at runtime without being hardcoded.

**Expected Outcomes:**
- `python-dotenv` present in `requirements.txt`
- `BaseBoardAI/backend/.env` file exists with the four required variables as placeholders
- `.env` is referenced in `.gitignore` (or a note is added) so credentials are never committed

**Todo List:**
1. Add `python-dotenv>=1.0.0` to `BaseBoardAI/backend/requirements.txt`
2. Create `BaseBoardAI/backend/.env` with the following keys (placeholder values):
   ```
   WATSONX_API_KEY=your_ibm_cloud_api_key_here
   WATSONX_PROJECT_ID=your_project_uuid_here
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
   ```
3. Create `BaseBoardAI/backend/.env.example` (safe to commit) with the same keys but empty values as documentation
4. Confirm `.env` is listed in `.gitignore` (create one if absent)

**Relevant Context:**
- `BaseBoardAI/backend/requirements.txt` — add dependency here
- `BaseBoardAI/backend/app/db/session.py` — already uses `os.getenv()` as the pattern to follow

---

### Sub-Task 1b — Add image provider config keys to `.env`

**Status:** `[ ] pending`

**Intent:**
Extend the `.env` file and settings model to include the two image provider credentials and
the provider selector switch. Doing this alongside Sub-Task 1 keeps all credential setup in
one place before any code is written.

**Expected Outcomes:**
- `.env` includes `IMAGE_PROVIDER`, `HF_API_TOKEN`, and `POLLINATIONS_WIDTH` / `POLLINATIONS_HEIGHT`
- `.env.example` documents the same keys with empty values
- `config.py` (Sub-Task 2) will read these keys from the same `Settings` model

**Todo List:**
1. Add the following keys to `BaseBoardAI/backend/.env`:
   ```
   IMAGE_PROVIDER=pollinations
   HF_API_TOKEN=your_huggingface_token_here
   HF_IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
   POLLINATIONS_WIDTH=768
   POLLINATIONS_HEIGHT=512
   ```
2. Mirror the same keys (empty values) in `BaseBoardAI/backend/.env.example`

**Relevant Context:**
- `IMAGE_PROVIDER` accepts exactly two values: `pollinations` or `huggingface`
- `HF_API_TOKEN` only required when `IMAGE_PROVIDER=huggingface`; ignored otherwise
- Pollinations.ai requires no account or token — zero-config default

---

### Sub-Task 2 — Create `app/core/config.py`

**Status:** `[ ] pending`

**Intent:**
Centralise all environment variable access in one validated settings object. Every other module
imports from here instead of calling `os.getenv()` directly. This makes credential errors fail
loudly at startup rather than silently at request time.

**Expected Outcomes:**
- `BaseBoardAI/backend/app/core/config.py` exists
- A `Settings` Pydantic model loads and validates all four WatsonX variables on import
- `app/core/__init__.py` exports the settings instance
- If any required variable is missing, the app raises a clear `ValidationError` on startup

**Todo List:**
1. Create `BaseBoardAI/backend/app/core/config.py` with a Pydantic `BaseSettings` class
   containing all of the following fields:
   - `WATSONX_API_KEY: str`
   - `WATSONX_PROJECT_ID: str`
   - `WATSONX_URL: str`
   - `WATSONX_MODEL_ID: str` (default: `"ibm/granite-13b-chat-v2"`)
   - `IMAGE_PROVIDER: str` (default: `"pollinations"`)
   - `HF_API_TOKEN: str` (default: `""`)
   - `HF_IMAGE_MODEL: str` (default: `"stabilityai/stable-diffusion-xl-base-1.0"`)
   - `POLLINATIONS_WIDTH: int` (default: `768`)
   - `POLLINATIONS_HEIGHT: int` (default: `512`)
   - Load `.env` automatically via `model_config = SettingsConfigDict(env_file=".env")`
2. Instantiate a module-level `settings = Settings()` singleton at the bottom of the file
3. Update `BaseBoardAI/backend/app/core/__init__.py` to export `settings`

**Relevant Context:**
- Pydantic v2 settings use `pydantic-settings` package — check if it is installed; if not, add
  `pydantic-settings>=2.0.0` to `requirements.txt` (it is separate from `pydantic` in v2)
- `BaseBoardAI/backend/app/core/__init__.py` — currently exports only prompt constants

---

### Sub-Task 3 — Strengthen prompt templates in `app/core/prompts.py`

**Status:** `[ ] pending`

**Intent:**
The current prompts are minimal stubs — they instruct the model to return JSON but provide no
schema reference, no examples, and no output constraints. IBM Granite requires explicit schema
specification in the prompt to reliably return structured JSON that matches the Pydantic models.

**Expected Outcomes:**
- `CHARACTER_PROMPT` instructs Granite to return a **single** JSON object matching
  `CharacterProfileBase` with all required fields defined inline in the prompt
- `WORLD_PROMPT` instructs Granite to return a JSON array of `EnvironmentProfileBase` objects
  (one per unique location slug found in the screenplay), with schema inline
- `STORYBOARD_PROMPT` instructs Granite to return a JSON array of `ScriptSceneBase` objects
  with each scene's frames nested inside, with schema inline
- All three prompts include a one-shot example of the expected output shape
- All three prompts explicitly forbid markdown fences, prose, or commentary in the output

**Todo List:**
1. Rewrite `CHARACTER_PROMPT` — embed the `CharacterProfileBase` + `FacialBlueprint` JSON
   schema as a comment block inside the prompt; add a one-shot example; explicitly state
   "Return ONLY raw JSON, no markdown fences, no explanation"
2. Rewrite `WORLD_PROMPT` — embed `EnvironmentProfileBase` schema; instruct model to produce
   one entry per unique slugline location; add one-shot example
3. Rewrite `STORYBOARD_PROMPT` — embed `ScriptSceneBase` + `StoryboardFrameBase` schema;
   instruct model to produce 3-hex color_palette derived from emotional tone; reference the
   injected character and environment context by their `id` and `location_name` keys;
   add one-shot example of a single scene with two frames
4. Keep template variables identical: `{raw_character_notes}`, `{raw_world_notes}`,
   `{character_context}`, `{world_context}`, `{raw_script_text}`

**Relevant Context:**
- `BaseBoardAI/backend/app/core/prompts.py` — rewrite in place
- `BaseBoardAI/backend/app/schemas/storyboard.py` — source of truth for all field names and
  types; copy field names verbatim into the prompt schema blocks

---

### Sub-Task 4 — Create `app/core/llm.py`

**Status:** `[ ] pending`

**Intent:**
Build the single module that owns all LLM interaction. It initialises the WatsonX Granite
model via the `ibm-watsonx-ai` SDK, wraps each of the three prompts in a LangChain
`PromptTemplate` + `LLMChain`, and exposes three clean functions — one per pipeline stage.
Each function is responsible for calling the model, stripping any markdown fences from the
response, parsing the JSON, and validating it against the relevant Pydantic schema.

**Expected Outcomes:**
- `BaseBoardAI/backend/app/core/llm.py` exists
- `build_llm()` initialises and returns a `WatsonxLLM` instance using `settings`
- `invoke_character_stage(raw_notes: str) → list[CharacterProfileBase]` — runs
  `CHARACTER_PROMPT`, parses response, returns validated list
- `invoke_world_stage(raw_notes: str) → list[EnvironmentProfileBase]` — runs `WORLD_PROMPT`,
  parses, returns validated list
- `invoke_storyboard_stage(characters, environments, raw_script_text, global_aesthetic) → list[ScriptSceneBase]`
  — serialises character and environment lists to JSON strings, runs `STORYBOARD_PROMPT`,
  parses, returns validated list
- All three functions raise `HTTPException(502)` with a clear message if the LLM call fails
  or the output cannot be parsed/validated
- `app/core/__init__.py` updated to export the three stage functions

**Todo List:**
1. Create `BaseBoardAI/backend/app/core/llm.py`
2. Import `WatsonxLLM` from `langchain_ibm` (or `langchain.llms`) and `settings` from
   `app.core.config`; confirm the correct import path for the installed LangChain version
   (`langchain==0.2.5`)
3. Implement `build_llm()` — instantiate `WatsonxLLM` with `apikey`, `project_id`, `url`,
   `model_id` from `settings`; set `max_new_tokens=1500`, `temperature=0.2`
4. Implement a private `_parse_json_response(raw: str) → Any` helper that strips markdown
   code fences (` ```json ... ``` `) and calls `json.loads()`; raises `ValueError` on failure
5. Implement `invoke_character_stage()` using `PromptTemplate` + LLM call; validate each
   item in the returned list against `CharacterProfileBase.model_validate()`
6. Implement `invoke_world_stage()` using `PromptTemplate` + LLM call; validate each item
   against `EnvironmentProfileBase.model_validate()`
7. Implement `invoke_storyboard_stage()` — serialise character and environment lists with
   `json.dumps([c.model_dump() for c in characters])` before injecting into prompt; validate
   each scene against `ScriptSceneBase.model_validate()`
8. Wrap all LLM calls in `try/except` — catch any exception and raise
   `HTTPException(status_code=502, detail=f"LLM inference failed: {e}")`
9. Update `BaseBoardAI/backend/app/core/__init__.py` to export the three stage functions

**Relevant Context:**
- `BaseBoardAI/backend/app/core/config.py` (created in Sub-Task 2) — credentials source
- `BaseBoardAI/backend/app/core/prompts.py` (updated in Sub-Task 3) — prompt strings
- `BaseBoardAI/backend/app/schemas/storyboard.py` — Pydantic models used for validation
- LangChain 0.2.5 — `WatsonxLLM` may live in `langchain_ibm` package; verify exact import
  from installed packages in `.venv` before writing

---

### Sub-Task 5 — Wire pipeline endpoints in `app/routers/storyboard.py`

**Status:** `[ ] pending`

**Intent:**
Replace the four `HTTP 501` stubs with real implementations that call the LLM stage functions
from `app/core/llm.py`, assemble the results, and either return them directly (single-stage
endpoints) or persist and return a full project (pipeline endpoints).

**Expected Outcomes:**
- `POST /storyboard/forge-pipeline` — runs all 3 stages sequentially, builds a
  `StoryboardProjectCreate` from the outputs, persists it via `_build_project_orm()`, and
  returns `HTTP 201 StoryboardProjectResponse`
- `POST /storyboard/parse-single-character` — calls `invoke_character_stage()`, returns the
  first parsed `CharacterProfileBase` (or list, if the prompt returns multiple)
- `POST /storyboard/parse-single-environment` — calls `invoke_world_stage()`, returns the
  first parsed `EnvironmentProfileBase`
- `POST /storyboard/forge-standalone-storyboard` — calls `invoke_storyboard_stage()` with
  the pre-parsed characters from the payload, builds a project, returns response (does NOT
  persist to DB — returns unsaved project with `db_id=None`)
- Prompt constants re-imported (uncomment the import line)

**Todo List:**
1. Uncomment `from app.core.prompts import CHARACTER_PROMPT, WORLD_PROMPT, STORYBOARD_PROMPT`
   (currently commented out at line 36 of `storyboard.py`)
2. Add import: `from app.core.llm import invoke_character_stage, invoke_world_stage, invoke_storyboard_stage`
3. Implement `forge_storyboard_pipeline()`:
   - Call `invoke_character_stage(payload.raw_character_notes)` → `characters`
   - Call `invoke_world_stage(payload.raw_world_notes)` → `environments`
   - Call `invoke_storyboard_stage(characters, environments, payload.raw_script_text, payload.global_aesthetic)` → `scenes`
   - Build `StoryboardProjectCreate(project_title=payload.project_title, global_aesthetic=payload.global_aesthetic, characters=characters, scenes=scenes)`
   - Persist via `_build_project_orm()`, `db.add()`, `db.commit()`
   - Return `_orm_to_response(_load_project_or_404(project.db_id, db))`
   - Re-add `db: DbSession` parameter (was removed in the bug-fix pass)
4. Implement `parse_single_character()`:
   - Call `invoke_character_stage(payload.raw_notes)` → `characters`
   - Return `characters[0]`
5. Implement `parse_single_environment()`:
   - Call `invoke_world_stage(payload.raw_notes)` → `environments`
   - Return `environments[0]`
6. Implement `forge_standalone_storyboard()`:
   - Call `invoke_storyboard_stage(payload.characters, [], payload.raw_script_text, payload.global_aesthetic)` → `scenes`
   - Build and return `StoryboardProjectResponse(project_title=payload.project_title, global_aesthetic=payload.global_aesthetic, characters=payload.characters, scenes=scenes, db_id=None)` — no DB write

**Relevant Context:**
- `BaseBoardAI/backend/app/routers/storyboard.py` — file to edit
- `BaseBoardAI/backend/app/core/llm.py` (created in Sub-Task 4) — functions to import
- `BaseBoardAI/backend/app/schemas/storyboard.py` — `StoryboardProjectCreate` used for assembly
- Note: `forge_storyboard_pipeline` had its `db: DbSession` parameter removed in the recent
  bug-fix pass — it needs to be added back for this endpoint to persist results

---

### Sub-Task 6 — Add `generated_image_url` to schema and ORM (BLOB + deferred load)

**Status:** `[ ] pending`

**Intent:**
Every storyboard frame stores its generated image as a self-contained base64 data URL
(`data:image/png;base64,...`) that the React canvas renders directly via
`<img src={frame.generated_image_url} />` — no cross-origin fetching, no remote dependencies.

The field is stored as a **deferred BLOB column** on the ORM. Deferred loading means the
image bytes are NOT fetched when listing all projects (`GET /storyboard/`) — they are only
loaded when a specific project is requested (`GET /storyboard/{db_id}`). This prevents
megabytes of base64 strings from being pulled into memory on every list query.

**Expected Outcomes:**
- `StoryboardFrameBase` in `app/schemas/storyboard.py` has a new optional field:
  `generated_image_url: str | None = Field(None, description="Self-contained base64 data URL rendered directly via <img src={...} /> on the canvas.")`
- `StoryboardFrameORM` in `app/db/models.py` has a new deferred nullable column using
  SQLAlchemy's `deferred()` loader so it is excluded from list queries automatically
- `_build_scene_orm()` in `storyboard.py` maps the new field from schema to ORM
- `_orm_to_response()` in `storyboard.py` maps the new field back from ORM to schema
- `list_storyboard_projects()` does NOT load the deferred column — list queries stay fast
- `_load_project_or_404()` explicitly undefers the column so individual project fetches
  include the full image data
- All existing CRUD tests still pass — the field defaults to `None` throughout

**Todo List:**
1. Add `generated_image_url: str | None = Field(None, description="Self-contained base64 data URL...")` to
   `StoryboardFrameBase` in `BaseBoardAI/backend/app/schemas/storyboard.py`
2. Add the deferred column to `StoryboardFrameORM` in `BaseBoardAI/backend/app/db/models.py`:
   ```python
   from sqlalchemy.orm import deferred
   generated_image_url: Mapped[Optional[str]] = deferred(mapped_column(Text, nullable=True))
   ```
3. In `_build_scene_orm()` in `storyboard.py`, pass `generated_image_url=frame.generated_image_url`
   when constructing each `StoryboardFrameORM`
4. In `_orm_to_response()` in `storyboard.py`, pass `generated_image_url=f.generated_image_url`
   when constructing each `StoryboardFrameBase`
5. In `_load_project_or_404()`, add `undefer(StoryboardFrameORM.generated_image_url)` to the
   `.options()` chain so individual project fetches include the image data
6. Confirm `list_storyboard_projects()` does NOT call `undefer` — the column stays lazy there
7. Delete `BaseBoardAI/backend/baseboard.db` so SQLite recreates the table with the new column
   on next startup (dev only — no migration needed at this stage)

**Relevant Context:**
- `BaseBoardAI/backend/app/schemas/storyboard.py` — `StoryboardFrameBase` on line 40
- `BaseBoardAI/backend/app/db/models.py` — `StoryboardFrameORM` on line 112
- `BaseBoardAI/backend/app/routers/storyboard.py` — `_build_scene_orm()` line 69,
  `_orm_to_response()` line 93, `_load_project_or_404()` line 133
- SQLAlchemy `deferred()` docs: columns marked deferred are excluded from SELECT by default
  and only loaded when accessed or explicitly undeferred via `undefer()` in a query option

---

### Sub-Task 7 — Create `app/core/image.py` (unified base64 downloader)

**Status:** `[ ] pending`

**Intent:**
Build a single image generation module where both providers output an identical
`data:image/png;base64,...` string — the exact format the React canvas needs for direct
`<img src={...} />` rendering with no external fetching.

Both providers follow the same contract:
- **Pollinations.ai** — construct the image URL, make a real `httpx.get()` call to download
  the image bytes, then base64-encode them. The URL-only approach is NOT used because the
  output must be a self-contained data URL for canvas rendering.
- **Hugging Face** — POST to the Inference API, receive binary image bytes, base64-encode them.

A shared `_convert_bytes_to_data_url(content: bytes) -> str` utility handles the encoding
for both, ensuring output is always `data:image/png;base64,...` regardless of provider.

**Expected Outcomes:**
- `BaseBoardAI/backend/app/core/image.py` exists
- `_build_image_prompt(frame, scene) -> str` assembles a cinematic prompt from frame fields,
  capped at 200 characters
- `_convert_bytes_to_data_url(content: bytes) -> str` is the single shared encoding point:
  `"data:image/png;base64," + base64.b64encode(content).decode("utf-8")`
- `_generate_pollinations(prompt) -> str | None` downloads bytes via `httpx.get()` (30s timeout)
  and passes them to `_convert_bytes_to_data_url`
- `_generate_huggingface(prompt) -> str | None` POSTs to HF Inference API and passes response
  bytes to `_convert_bytes_to_data_url`; returns `None` on 503 cold start
- `generate_frame_image(frame, scene) -> str | None` is the public entry point — non-fatal,
  returns `None` on any failure, never raises
- `app/core/__init__.py` updated to export `generate_frame_image`

**Todo List:**
1. Add `httpx>=0.27.0` to `BaseBoardAI/backend/requirements.txt` (make explicit)
2. Create `BaseBoardAI/backend/app/core/image.py`
3. Imports: `base64`, `urllib.parse`, `logging`, `httpx`; `settings` from `app.core.config`;
   `StoryboardFrameBase`, `ScriptSceneBase` from `app.schemas.storyboard`
4. Implement `_build_image_prompt(frame, scene) -> str`:
   - Combine `frame.shot_type`, `frame.camera_angle`, `frame.action_breakdown`,
     `frame.lighting_notes`, and `"color palette: " + ", ".join(scene.color_palette)`
   - Cap at 200 characters
5. Implement `_convert_bytes_to_data_url(content: bytes) -> str`:
   - `return "data:image/png;base64," + base64.b64encode(content).decode("utf-8")`
   - This is the single encoding point — used by both providers
6. Implement `_generate_pollinations(prompt: str) -> str | None`:
   - URL-encode: `urllib.parse.quote(prompt)`
   - Build URL: `https://image.pollinations.ai/prompt/{encoded}?width={W}&height={H}&nologo=true`
   - `httpx.get(url, timeout=30)` — download image bytes
   - On status 200: return `_convert_bytes_to_data_url(response.content)`
   - On non-200: return `None`
7. Implement `_generate_huggingface(prompt: str) -> str | None`:
   - POST to `https://api-inference.huggingface.co/models/{settings.HF_IMAGE_MODEL}`
   - Headers: `{"Authorization": f"Bearer {settings.HF_API_TOKEN}"}`
   - Body: `{"inputs": prompt}`
   - On status 200: return `_convert_bytes_to_data_url(response.content)`
   - On non-200 (including 503 cold start): return `None`
8. Implement `generate_frame_image(frame, scene) -> str | None`:
   - Build prompt via `_build_image_prompt(frame, scene)`
   - Route to `_generate_pollinations` or `_generate_huggingface` via `settings.IMAGE_PROVIDER`
   - Wrap entire body in `try/except Exception as e`; log the error; return `None`
9. Update `BaseBoardAI/backend/app/core/__init__.py` to export `generate_frame_image`

**Relevant Context:**
- `BaseBoardAI/backend/app/core/config.py` (Sub-Task 2) — provider settings
- The data URL is stored in the deferred BLOB column (Sub-Task 6) and rendered directly as
  `<img src={frame.generated_image_url} />` in React — zero cross-origin requests
- HF Inference API may return `503` on cold start — `None` is correct, not an error
- `httpx` uses synchronous calls here — async upgrade is a non-goal for now

---

### Sub-Task 8 — Wire image generation into the pipeline + smoke test

**Status:** `[ ] pending`

**Intent:**
Call `generate_frame_image()` for each frame after the storyboard stage completes, populate
`generated_image_url` on each frame before persisting, and then validate the full end-to-end
flow from a single `POST /storyboard/forge-pipeline` request.

**Expected Outcomes:**
- In `forge_storyboard_pipeline()`, after `invoke_storyboard_stage()` returns scenes, each
  frame in each scene has `generated_image_url` populated by `generate_frame_image()`
- In `forge_standalone_storyboard()`, the same image generation loop runs before the response
  is returned
- `parse-single-character` and `parse-single-environment` do NOT generate images (no frames)
- `pip install -r requirements.txt` completes without errors
- `uvicorn app.main:app` starts without import errors
- `GET /health` → `{"status": "ok"}`
- `POST /storyboard/forge-pipeline` with valid WatsonX credentials → `HTTP 201` response
  where each frame contains a `generated_image_url` string (Pollinations) or `null` (HF cold start)
- `POST /storyboard/forge-pipeline` with placeholder credentials → `HTTP 502` with LLM error
  detail (not `501`) — proving the pipeline wiring is live even without valid credentials

**Todo List:**
1. In `BaseBoardAI/backend/app/routers/storyboard.py` add import:
   `from app.core.image import generate_frame_image`
2. After `invoke_storyboard_stage()` returns `scenes` in `forge_storyboard_pipeline()`, add
   an image generation loop:
   ```
   for scene in scenes:
       for frame in scene.frames:
           frame.generated_image_url = generate_frame_image(frame, scene)
   ```
3. Add the same loop to `forge_standalone_storyboard()` before building the response
4. Run `pip install -r requirements.txt` inside `.venv`
5. Start server: `uvicorn app.main:app --reload` — confirm no import errors
6. Hit `GET /health` — expect `200 {"status": "ok"}`
7. Hit `GET /storyboard/` — expect `200 []`
8. Hit `POST /storyboard/forge-pipeline` with placeholder credentials — expect `502` not `501`
9. With real WatsonX credentials in `.env`, hit `POST /storyboard/forge-pipeline` with a
   short sample script — confirm `HTTP 201` and that frame objects contain `generated_image_url`

**Relevant Context:**
- `BaseBoardAI/backend/app/routers/storyboard.py` — `forge_storyboard_pipeline()` and
  `forge_standalone_storyboard()` are the two functions to update
- `BaseBoardAI/backend/app/core/image.py` (Sub-Task 7) — `generate_frame_image()` to import
- `BaseBoardAI/backend/app/main.py` — entry point for smoke test
- Image generation is non-fatal — a `None` URL must not crash the pipeline or block persistence

---

### Sub-Task 9 — Create `src/utils/exportFrames.ts`

**Status:** `[ ] pending`

**Intent:**
Build a pure TypeScript utility module that owns all export logic. It reads the
`generated_image_url` base64 data URL from a frame object and triggers a programmatic
anchor-link download in the browser — no server round-trip, no external libraries.
It also exposes a `prepareFrameBatch()` hook that collects all non-null frame images
from a project into a structured array ready for future batch ZIP compression.

The export layer is completely decoupled from any component — it only receives plain
data objects and returns nothing (download side-effect) or a typed array (batch hook).

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/utils/exportFrames.ts` exists
- `downloadFramePng(frame: StoryboardFrame, filename?: string) => void` — extracts
  the `generated_image_url`, creates a hidden `<a>` element with `href=data_url` and
  `download=filename.png`, programmatically clicks it, then removes the element.
  If `generated_image_url` is null or missing, the function returns early without error
- `prepareFrameBatch(scenes: StoryboardScene[]) => FrameExportItem[]` — iterates all
  scenes and frames, filters out frames where `generated_image_url` is null, and returns
  an array of `FrameExportItem` objects each containing:
  `{ sceneNumber, frameNumber, filename, dataUrl }` — ready for a future JSZip pass
- TypeScript types `StoryboardFrame`, `StoryboardScene`, and `FrameExportItem` are
  defined in this file (or a companion `src/types/storyboard.ts`) matching the backend
  Pydantic schema field names exactly

**Todo List:**
1. Create `BaseBoardAI/frontend/src/types/storyboard.ts` with TypeScript interfaces
   matching the backend schemas exactly:
   - `FacialBlueprint` — all fields from `app/schemas/storyboard.py`
   - `CharacterProfile` — `id`, `name`, `facial_blueprint`, `wardrobe_defaults`
   - `StoryboardFrame` — all fields including `generated_image_url: string | null`
   - `StoryboardScene` — all fields including `frames: StoryboardFrame[]`
   - `StoryboardProject` — `db_id`, `project_title`, `global_aesthetic`, `characters`, `scenes`
   - `FrameExportItem` — `{ sceneNumber: number; frameNumber: number; filename: string; dataUrl: string }`
2. Create `BaseBoardAI/frontend/src/utils/exportFrames.ts`
3. Implement `downloadFramePng(frame: StoryboardFrame, filename?: string): void`:
   - Guard: if `!frame.generated_image_url` return immediately
   - Default filename: `frame_s{sceneNumber}_f{frameNumber}.png` — but since the frame
     doesn't carry sceneNumber, accept it as an optional parameter or require caller to pass
     a pre-formatted filename string
   - Create `const a = document.createElement('a')`
   - Set `a.href = frame.generated_image_url`
   - Set `a.download = filename ?? 'frame.png'`
   - `document.body.appendChild(a)` → `a.click()` → `document.body.removeChild(a)`
4. Implement `prepareFrameBatch(scenes: StoryboardScene[]): FrameExportItem[]`:
   - Flat-map all scenes and frames
   - Filter out frames where `generated_image_url` is null
   - Map each to `FrameExportItem`:
     `filename = frame_s{scene.scene_number}_f{frame.frame_number}.png`
     `dataUrl = frame.generated_image_url`
   - Return the array sorted by `sceneNumber` then `frameNumber`
5. Export both functions and all types from the module

**Relevant Context:**
- `BaseBoardAI/frontend/src/` — all new files go here
- Backend field names to match: `generated_image_url`, `frame_number`, `scene_number`,
  `shot_type`, `camera_angle`, `duration_seconds`, `action_breakdown`, `lighting_notes`,
  `sound_cue` — from `app/schemas/storyboard.py`
- No external npm packages needed — uses only DOM APIs (`document.createElement`, `a.click()`)
- The `generated_image_url` value is a `data:image/png;base64,...` string — setting it
  as `a.href` and triggering `.click()` causes the browser to save it as a PNG file

---

### Sub-Task 10 — Create `FrameExportButton` and `BatchExportBar` components

**Status:** `[ ] pending`

**Intent:**
Build two small React components that wire the export utility into the canvas workspace UI.
Both components are pure presentational + action — they receive data as props and call
`exportFrames.ts` functions on user interaction.

- `FrameExportButton` — a single download button rendered per frame card on the canvas.
  Disabled and visually muted when `generated_image_url` is null (image not yet generated).
  Enabled and active once the image is present.

- `BatchExportBar` — a toolbar component rendered at the project level. Shows a count of
  how many frames have generated images vs total frames. Contains a "Download All Frames"
  button that iterates `prepareFrameBatch()` output and fires sequential `downloadFramePng()`
  calls with a small delay between each to avoid browser download throttling.

**Expected Outcomes:**
- `BaseBoardAI/frontend/src/components/FrameExportButton.tsx` exists
- `BaseBoardAI/frontend/src/components/BatchExportBar.tsx` exists
- `FrameExportButton` props: `frame: StoryboardFrame`, `sceneNumber: number`
  - Renders a `<button>` with label "Download PNG"
  - Disabled state + muted style when `frame.generated_image_url` is null
  - On click: calls `downloadFramePng(frame, filename)` where filename is
    `frame_s{sceneNumber}_f{frame.frame_number}.png`
  - Styled with Tailwind CSS matching the dark workspace theme (`bg-slate-950`)
- `BatchExportBar` props: `scenes: StoryboardScene[]`
  - Computes ready count: `prepareFrameBatch(scenes).length` vs total frame count
  - Renders a status string: `"{n} of {total} frames ready to export"`
  - Renders a "Download All Frames" button — disabled when ready count is 0
  - On click: calls `downloadFramePng()` for each item in `prepareFrameBatch(scenes)`
    with a `50ms` delay between each using `setTimeout` to avoid browser throttling
  - Styled with Tailwind CSS, dark theme consistent with `bg-slate-950` workspace
- Both components are exported and ready to drop into the canvas workspace layout

**Todo List:**
1. Create `BaseBoardAI/frontend/src/components/FrameExportButton.tsx`:
   - Import `downloadFramePng` from `../utils/exportFrames`
   - Import `StoryboardFrame` type from `../types/storyboard`
   - Implement component with `frame` and `sceneNumber` props
   - Button disabled when `!frame.generated_image_url`
   - On click: `downloadFramePng(frame, \`frame_s\${sceneNumber}_f\${frame.frame_number}.png\`)`
   - Tailwind classes: enabled → `bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded`;
     disabled → `bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded cursor-not-allowed`
2. Create `BaseBoardAI/frontend/src/components/BatchExportBar.tsx`:
   - Import `downloadFramePng`, `prepareFrameBatch` from `../utils/exportFrames`
   - Import `StoryboardScene` type from `../types/storyboard`
   - Compute `const batch = prepareFrameBatch(scenes)` and
     `const totalFrames = scenes.flatMap(s => s.frames).length`
   - Render status: `"{batch.length} of {totalFrames} frames ready to export"`
   - "Download All Frames" button: disabled when `batch.length === 0`
   - On click handler: iterate `batch`, call `downloadFramePng(...)` for each item
     with a `50ms * index` staggered `setTimeout` delay per item
   - Tailwind classes: bar wrapper → `flex items-center gap-4 px-4 py-2 bg-slate-900 border-t border-slate-700`;
     button enabled → `bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded`;
     button disabled → `bg-slate-700 text-slate-500 text-sm px-4 py-1.5 rounded cursor-not-allowed`
3. Export both components as named exports
4. Verify TypeScript compiles without errors: `tsc --noEmit` from `BaseBoardAI/frontend/`

**Relevant Context:**
- `BaseBoardAI/frontend/src/utils/exportFrames.ts` (Sub-Task 9) — utility functions to import
- `BaseBoardAI/frontend/src/types/storyboard.ts` (Sub-Task 9) — shared type definitions
- `BaseBoardAI/frontend/package.json` — React 19, TypeScript ~6.0, Tailwind CSS 4 already installed
- Dark workspace theme: `bg-slate-950` is the canvas background — all components must match
- No routing library installed — components are designed to be dropped into the existing
  canvas layout when the workspace view is built
- The `50ms` stagger on batch download prevents Chrome/Firefox download manager throttling
  when triggering many simultaneous anchor-link downloads
