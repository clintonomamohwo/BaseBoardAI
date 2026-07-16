# BaseBoard AI
https://drive.google.com/file/d/1qPPvrVyjubg6FgaXcdVag_3COmzipL6t/view?usp=drive_link

> *Where Stories Become Worlds.*

**BaseBoard AI** is a cinematic pre-visualization platform that transforms a screenplay, novel, or story document into a fully produced storyboard — complete with a locked character bible, scene-by-scene world map, and AI-generated frame imagery — in under a minute.

Built on IBM watsonx AI, React 19, and FastAPI. No drawing skills required.

---

## Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- An [IBM watsonx](https://www.ibm.com/watsonx) account with a Project ID and API key

### 1. Clone the Repository

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` with your credentials:

```dotenv
# IBM watsonx — required
WATSONX_API_KEY=your_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=meta-llama/llama-3-3-70b-instruct

# Image generation — Pollinations requires no API key
IMAGE_PROVIDER=pollinations

# Only required if IMAGE_PROVIDER=huggingface
HF_API_TOKEN=
HF_IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
HF_IMG2IMG_MODEL=stabilityai/stable-diffusion-xl-refiner-1.0

# Canvas dimensions
POLLINATIONS_WIDTH=768
POLLINATIONS_HEIGHT=512
```

Start the backend:

```bash
uvicorn app.main:app --reload
# API runs at  http://localhost:8000
# Auto-docs at http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Optional: override backend URL (defaults to http://localhost:8000)
# Create .env.local and add:
# VITE_API_URL=http://localhost:8000

# Start the dev server
npm run dev
# App runs at http://localhost:5173
```

Open `http://localhost:5173` in your browser. You are ready.

---

## What is BaseBoard AI?

BaseBoard AI is built for writers, directors, game designers, and creative teams who need to move from idea to visual production blueprint without an army of artists or weeks of pre-production.

Upload a PDF, Word document, screenplay, or Markdown file. The **Genesis Engine** — a three-stage IBM watsonx AI pipeline — automatically:

1. Extracts your characters and builds a facial blueprint for each one
2. Maps every location into a world bible with environmental and lighting data
3. Breaks your script into cinematography-ready scenes and frames
4. Runs the **Director Engine** to plan shot composition, lens selection, and rhythm before any image is generated
5. Generates storyboard thumbnails for every frame

The result is a premium dark-mode **Studio** with a three-column storyboard canvas, animatic player, character dictionary, world bible, and a full **Character Package** system for every character.

---

## Key Features

| Feature | Description |
|---|---|
| **Genesis Engine** | One-click full pipeline: characters → world → storyboard → Director Engine → images |
| **Director Engine** | Cinematic planning layer between LLM output and image generation |
| **Shot Balancer** | Tracks 10 shot-type categories, enforces composition diversity across all frames |
| **Lens Planner** | 13 focal length profiles (24mm Anamorphic, 85mm Portrait, 35mm Tracking, etc.) |
| **Continuity Engine** | Scans the entire project for impact when any canonical asset changes |
| **Three-Level Action** | `narrative_action` (author) / `visual_action` (AI staging) / `animation_beats` (Maya/Unreal) |
| **Character Package** | Portrait, 5-angle turnaround, 9 expressions, 7 poses, 7 outfits, props, 360° premium pack |
| **Character Identity System** | Identity / Species / Variants / Rendering Style stored as independent layers |
| **Visual QA Engine** | Per-frame confidence score across Identity, Species, Anatomy, Composition, Lighting, Props, Continuity |
| **Creative Knowledge Graph** | Single source of truth for every AI generation in the project |
| **Three Render Styles** | B&W Sketch, Flat Color, Full Shaded |
| **Reference Image (img2img)** | Upload a visual reference; all frames generated with img2img consistency |
| **Asset Locking** | Lock frames, specific fields, or entire characters so re-runs never overwrite approved work |
| **Regenerate Selectively** | Regenerate one frame's image, staging direction, or composition without touching anything else |
| **Continuity Impact Modal** | Shows exactly which frames and assets are affected before any regeneration begins |
| **World Bible Import** | Import a DOCX, PDF, or Markdown world-building document directly into the project |
| **Animatic Player** | Step through frames with captions and sound cues |
| **Locked Cut + Export** | Flag frames, build a curated cut, export as PNG + production manifest ZIP |
| **Project Library** | All projects persisted in the backend database |
| **BMS Motion System** | "Modern Heritage" micro-animation system (Director's Light, Compass, Brass Reflection) |
| **LLM Fallback Chain** | Auto-walks four watsonx models on rate-limit; never drops the pipeline |
| **Dark / Light Theme** | System-aware with localStorage persistence |

---

## Usage

### Creating a Project

1. Open `http://localhost:5173` and click **New Project**.
2. Choose a creation path:
   - **Upload Story** — drag and drop a PDF, DOCX, TXT, FDX, or Markdown file, pick a render style, click **Analyse Script →**
   - **Use Template** — download the structured Markdown scaffold, fill it in, upload it (highest AI accuracy)
   - **Start Blank** — open the Studio with an empty project and the manual pipeline form
3. Watch the Genesis Engine process 12 analysis tasks in real time.
4. Review the **Creative Director's Report** — genre, runtime estimate, character and scene counts, detected themes.
5. Click **Enter Studio →**.

### Working in the Studio

- **Scene Index** (left column) — click any scene to load its frames. Drag to reorder. Delete scenes you do not need.
- **Storyboard Canvas** (centre) — each frame shows the generated image, shot type, camera movement, duration, and visual action. Click the image for a full-screen gallery lightbox. Use **▼ Full Sheet** to expand the complete production sheet.
- **Action Timeline** — click the toggle below the frame grid to reveal the per-scene beat sheet with running timestamps and dialogue indicators.
- **Regenerate Visual Action** — in any expanded production sheet, click **↺ Regenerate Visual Action** to get a new AI staging direction without regenerating the image.
- **Studio Inspector** (right column) — scene metadata, color palette, emotional tone, lighting notes, and a reference image uploader for img2img.
- **Animatic Player** — click the **Player** tab to step through frames with action breakdowns as captions.
- **Vault** — the **Vault** tab shows every frame in every scene in a gallery grid.
- **Locked Cut** — toggle frames (★) to lock them, then open the **Locked Cut** tab to see your curated selection. Use **Batch Export** to download as a ZIP.
- **Re-run** — click **↺ Re-run** to re-execute the pipeline with a new render style or aesthetic. Artist-uploaded frames (marked ◈) are never overwritten.

### Character Dictionary

1. Navigate to the **CHARACTERS** tab in the top bar.
2. Each character is listed with an AI-generated portrait thumbnail (generated on first expand).
3. Click any character to expand their facial blueprint, wardrobe, and portrait.
4. Edit character fields inline — the Continuity Engine scans for affected frames and shows the **Continuity Impact Modal** before regenerating.
5. Click **✦ Full Package** to open the Character Package suite.

### Character Package

Each character has a full reference suite across these tabs:

- **Identity** — upload up to 5 canonical reference images (Primary, Front, Left, Right, Back). BaseBoard extracts identity fields automatically from every upload. A single portrait is enough.
- **Overview** — LLM-generated biography, personality, goals, and fears.
- **Portrait** — hero portrait image.
- **Turnaround** — 5-angle character sheet (front, ¾ front, side, ¾ back, back).
- **Expressions** — 9-state expression grid (neutral, happy, laughing, angry, sad, surprised, fearful, thinking, crying).
- **Poses** — 7 standard poses (standing, walking, running, sitting, pointing, holding object, hero pose).
- **Outfits** — 7 outfit variants (default, casual, formal, travel, combat, winter, summer).
- **Props** — auto-detected prop references from the wardrobe description.
- **Species** — select the character's anatomy type (Human, Elf, Wolf, Dragon, Robot, Vampire, Custom). Species controls QA Engine anatomy validation and injects the appropriate prompt prefix. Human is the default.
- **Variants** — manage appearance variants: Default, Battle Armor, Winter Outfit, Elf Form, Vampire Form, Future Version, or create your own. Variants inherit the base identity — only outfit, hair, accessories, species, and age change.
- **Relationships** — SVG node graph of connections to other characters (ally, enemy, romantic, mentor, family, rival).
- **Quality** — Visual QA Engine: overall confidence score (0–100%) and per-category breakdown across Identity, Species, Anatomy, Composition, Lighting, Props, and Continuity.

Click **Full Pack** to generate the premium 360° turnaround (8 angles), premium poses (T-pose, A-pose, fighting stance, etc.), and material close-ups (face, hair, fabric, hands, eyes). All generated sections are version-tracked.

### World Bible

Navigate to the **WORLD** tab to see every detected location with its emotional tone, color palette, environmental type, time-of-day descriptor, and all storyboard frames shot there. Upload a location reference image to propagate it as an img2img anchor across all frames in that location. Import an external world-building document via **Import World Bible**.

---

## How It Works

### Pipeline Overview

```
Document Upload (PDF / DOCX / TXT / FDX / MD)
         │
         ▼  client-side extraction
Stage 1 — Character Standardizer       (IBM watsonx LLM)
         │  Extracts: FacialBlueprint, wardrobe, CHAR_ID tokens
         ▼
Stage 2 — World Architect              (IBM watsonx LLM)
         │  Extracts: location slugs, spatial textures, lighting keys
         ▼
Stage 3 — Storyboard Orchestrator      (IBM watsonx LLM, Hollywood Director persona)
         │  Produces: scenes + frames with shot_type, camera_angle, action, mood,
         │  dialogue, director_notes, camera_movement, animation_beats
         ▼
Stage 4 — Director Engine              (Python, no LLM)
         │  Shot Balancer  → enforces composition diversity across all frames
         │  Lens Planner   → assigns focal length + depth style per frame
         │  Rhythm check   → no more than N consecutive identical shot types
         ▼
Creative Knowledge Graph (CKG)         (built from pipeline outputs)
         │  character_identities, species, variants, world bible,
         │  style guide, camera language, visual rules
         ▼
Prompt Builder                         (8-step assembly)
         │  CKG identity → species → variant → style prefix →
         │  lens suffix → action → lighting → negatives
         ▼
Image Generator                        (Pollinations Flux / Hugging Face)
         │  t2i or img2img based on reference image presence
         ▼
Visual QA Engine                       (heuristic, prompt-level)
         │  Validates: identity markers, anatomy, composition, lighting, props
         ▼
Studio                                 (React 19)
```

### Character Identity System

BaseBoard separates every character into four independent layers:

| Layer | What it controls | Can it change? |
|---|---|---|
| **Identity** | Face, hair, eyes, body proportions, distinct markers, signature accessories, reference images | Never — immutable across all variants and styles |
| **Species** | Anatomy type, anatomy QA rules, prompt prefix | Per-variant via `species_override`; human by default |
| **Variants** | Outfit, hair override, accessories, species form, age | Per story point |
| **Rendering Style** | Artistic register (B&W Sketch, Flat Color, Full Shaded) | Freely switchable |

When you upload a reference photo, BaseBoard extracts structured identity fields via LLM, writes them to the Creative Knowledge Graph, and validates every subsequent generation against those fields — regardless of art style or species variant.

### AI Models

| Service | Role |
|---|---|
| **IBM watsonx** — `meta-llama/llama-3-3-70b-instruct` | Primary LLM for all three pipeline stages |
| **LLM Fallback chain** | Mistral Small 3.1 → Mistral Medium → Mistral Large (auto on rate-limit) |
| **Pollinations.ai (Flux)** | Text-to-image and img2img frame generation — no API key required |
| **Hugging Face Inference API** | Optional alternative image provider (`IMAGE_PROVIDER=huggingface`) |

### REST API Reference

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/storyboard/forge-pipeline` | Run full Genesis Engine pipeline |
| `GET` | `/storyboard/` | List all saved projects |
| `GET` | `/storyboard/{db_id}` | Load a specific project |
| `DELETE` | `/storyboard/{db_id}` | Delete a project |
| `POST` | `/storyboard/generate-image` | Generate a single image from a prompt |
| `POST` | `/storyboard/character-package/generate` | Generate character package sections |
| `POST` | `/storyboard/character-package/generate-one` | Regenerate a single package section |
| `POST` | `/storyboard/character-package/generate-full-pack` | Generate premium 360° + poses + close-ups |
| `POST` | `/storyboard/character-package/import-asset` | Import a reference image into a character identity slot |
| `POST` | `/storyboard/character/qa-score` | Run the Visual QA Engine against a prompt + identity |
| `POST` | `/storyboard/ckg/update-identity` | Write Identity / Species / Variants to the CKG |
| `GET` | `/storyboard/ckg/{project_id}` | Read the full CKG for a project |
| `GET` | `/storyboard/species-registry` | Return all built-in species profiles |
| `POST` | `/storyboard/continuity/scan` | Scan project for continuity impact of an asset change |
| `POST` | `/storyboard/frame/reforge-composition` | Regenerate only the image for a frame |
| `POST` | `/storyboard/frame/regenerate-visual-action` | Regenerate only the Level-2 staging (no image change) |
| `POST` | `/storyboard/world-bible/import` | Import a World Bible document |

Auto-generated interactive docs available at `http://localhost:8000/docs` when the backend is running.

---

## Project Structure

```
BaseBoardAI/
├── backend/                          Python / FastAPI
│   ├── app/
│   │   ├── main.py                   FastAPI entry point, CORS, lifespan
│   │   ├── core/
│   │   │   ├── config.py             Pydantic-settings env loader
│   │   │   ├── llm.py                IBM watsonx orchestration + 3-stage pipeline + fallback chain
│   │   │   ├── image.py              Image generation (Pollinations / HF), t2i + img2img
│   │   │   ├── prompts.py            All LLM prompt templates
│   │   │   ├── director_engine.py    Cinematic planning orchestrator (post-LLM, pre-image)
│   │   │   ├── shot_balancer.py      10-type composition scoring + diversity enforcement
│   │   │   ├── lens_planner.py       13 focal length profiles mapped to scene/shot type
│   │   │   ├── continuity_engine.py  Asset change → dependency scan → impact list
│   │   │   ├── identity_system.py    Character Identity System — build_identity_prompt + compute_qa_score
│   │   │   └── prompt_builder.py     8-step cinematography-aware prompt assembly
│   │   ├── db/
│   │   │   ├── models.py             SQLAlchemy ORM models
│   │   │   └── session.py            SQLite / Postgres session factory
│   │   ├── routers/
│   │   │   └── storyboard.py         All REST endpoints
│   │   └── schemas/
│   │       └── storyboard.py         Pydantic v2 request/response schemas
│   ├── requirements.txt
│   ├── .env.example
│   └── baseboard.db                  SQLite database (auto-created on first run)
│
└── frontend/                         React 19 / TypeScript / Vite
    └── src/
        ├── App.tsx                   View-state machine (7 views), idle timer, BMS Director's Light
        ├── api/storyboard.ts         All fetch calls + CKG + QA + continuity helpers
        ├── types/storyboard.ts       TypeScript interfaces (mirrors backend schemas exactly)
        ├── hooks/
        │   ├── useDirectorsLight.ts  BMS-1: ambient light tracking
        │   ├── useCompassNeedle.ts   BMS-2: cursor-driven compass needle
        │   └── useBrassReflection.ts BMS-4: specular reflection on brass UI elements
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── CompassNavPage.tsx
        │   ├── NewProjectPage.tsx
        │   ├── GenesisUploadPage.tsx
        │   ├── GenesisEnginePage.tsx
        │   ├── CreativeDirectorReport.tsx
        │   ├── StudioPage.tsx
        │   ├── CharacterDictionaryPage.tsx
        │   ├── CharacterPackagePage.tsx
        │   ├── WorldBiblePage.tsx
        │   └── ProjectLibraryPage.tsx
        ├── components/
        │   ├── FrameCard.tsx                 Frame card + Production Sheet
        │   ├── StoryboardCanvas.tsx          Frame grid + BMS-3 cursor tracking
        │   ├── ActionTimeline.tsx            Per-scene beat sheet
        │   ├── AnimaticPlayer.tsx            Frame-by-frame player
        │   ├── GalleryLightbox.tsx           Full-screen scene gallery
        │   ├── SceneIndex.tsx                Left-column scene list
        │   ├── StudioInspector.tsx           Right-column metadata panel
        │   ├── IdentityUploader.tsx          5-slot reference image grid (CIS)
        │   ├── SpeciesSelector.tsx           Species chip-select (CIS)
        │   ├── VariantManager.tsx            Variant list + editor (CIS)
        │   ├── VisualQAPanel.tsx             QA score gauge + category bars (CIS)
        │   ├── ContinuityImpactModal.tsx     Pre-regeneration impact dialog
        │   ├── GlobalUpdatePanel.tsx         Multi-asset dependency update panel
        │   ├── CharacterImportScanner.tsx    Step-by-step import analyzer
        │   └── ...                           (+ 10 supporting components)
        └── utils/
            ├── extractDocumentText.ts        PDF/DOCX/TXT/FDX/MD extraction
            └── exportFrames.ts               ZIP and production manifest generation
```

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| **Backend framework** | FastAPI | 0.111.0 |
| **ASGI server** | Uvicorn | 0.30.1 |
| **LLM orchestration** | LangChain + LangChain IBM | 0.2.5 / ≥0.1.0 |
| **AI platform** | IBM watsonx AI | ≥1.1.2 |
| **Data validation** | Pydantic v2 | ≥2.9.0 |
| **ORM** | SQLAlchemy | ≥2.0.36 |
| **Database migrations** | Alembic | 1.13.1 |
| **HTTP client** | httpx | ≥0.27.0 |
| **Database** | SQLite (dev) / PostgreSQL (prod) | — |
| **Frontend framework** | React | 19 |
| **Language** | TypeScript | ~6.0 |
| **Build tool** | Vite + Rolldown | 8 |
| **CSS framework** | Tailwind CSS | v4 |
| **PDF parsing** | pdfjs-dist | ≥5.6 |
| **DOCX parsing** | mammoth | ≥1.12 |
| **Export / ZIP** | JSZip + file-saver | 3.10 / 2.0 |
| **Image generation** | Pollinations.ai (Flux) | — |
| **Image generation (alt)** | Hugging Face Inference API | — |

---

## Architecture Deep Dive

### The Director Engine

The Director Engine solves one of the hardest problems in AI image generation for film: **AI models default to the same shot type every time**.

Without explicit direction, both LLMs and diffusion models gravitate toward medium close-ups of speaking characters. Left unconstrained, a storyboard looks like this:

```
Frame 01 — Medium Close-Up, Emma at doorway
Frame 02 — Medium Close-Up, Kai responds
Frame 03 — Medium Close-Up, Emma reacts
Frame 04 — Medium Close-Up, Kai advances
```

This is not a storyboard. It is a transcript illustrated with the same camera position twelve times in a row.

The Director Engine sits between Stage 3 LLM output and the image loop. It never calls an AI — it applies hard cinematography rules:

**Shot Balancer** — tracks 10 composition categories across the whole storyboard and injects missing types when any category exceeds its threshold. Close shots are capped at 40% of total frames. Every rebalanced frame is flagged with `shot_balance_flag` so the change is traceable.

**Lens Planner** — assigns an explicit focal length to every frame based on scene type:

```
Establishing  →  24mm Anamorphic, deep focus
Dialogue      →  50mm, shallow bokeh
Intimate      →  85mm Portrait, shallow bokeh
Action        →  35mm Tracking, deep focus
Epic          →  18mm Ultra Wide, deep focus
Horror        →  28mm, unsettling distortion
```

**Scene-Type Profiles** — auto-detects genre (Dialogue, Action, Romance, Horror, Mystery, Fantasy, Sci-Fi, Adventure) and applies genre-specific composition ratios before any image is generated.

**Rhythm enforcement** — prevents more than N consecutive identical shot types anywhere in the storyboard.

### The Creative Knowledge Graph (CKG)

The CKG is the single authoritative node graph for every project. Every AI generation reads from it before producing output.

```
CreativeKnowledgeGraph
├── character_identities    — WHO each character is (face, hair, eyes, reference images)
├── character_species       — WHAT each character is (anatomy + QA rules)
├── character_variants      — HOW each character looks at each story point
├── expression_sheets       — per-character expression reference images
├── pose_libraries          — per-character pose images
├── outfit_libraries        — per-character outfit images
├── world_bible_summary     — condensed lore string injected into every frame prompt
├── locations               — location slug → EnvironmentProfile
├── style_guide             — render style + aesthetic rules
├── camera_language         — scene_type → preferred shot distribution
├── director_profile        — 'Kubrickian symmetry', 'Handheld verité', etc.
└── visual_rules            — hard constraints: ['never dutch angle in dialogue scenes']
```

---

## Challenges

**LLM JSON reliability** — Models do not always return pure JSON despite instructions. The parser in `llm.py` implements a two-pass strategy: strip markdown code fences; if that fails, use regex to extract the first complete `[...]` or `{...}` block from raw output.

**Model rate limiting** — IBM watsonx enforces consumption limits per model. `_invoke_with_fallback` walks a four-model chain (Llama 3.3 70B → Mistral Small 3.1 → Mistral Medium → Mistral Large) automatically on 429 or deprecation errors.

**Image style consistency** — Getting an image model to respect style directives (line art vs. cel-shaded vs. cinematic) requires style-prefix injection. `bw_sketch` mode appends explicit negative constraints (no shading, no crosshatch, no color) and caps prompts at 500 characters for the Pollinations GET URL limit.

**LLM compositional bias** — The Storyboard LLM generates 70–80% medium/close shots by default. The Director Engine was introduced as a post-LLM planning layer to rebalance distributions before images are generated.

**Three-level action decoupling** — The original `action_breakdown` field conflated the author's intent, the director's plan, and animation cues. Splitting these into `narrative_action` / `visual_action` / `animation_beats` required schema migration, backwards-compatible ORM fields, and a separate `VISUAL_ACTION_PROMPT`.

**Base64 storage** — All images are stored as `data:image/png;base64,...` TEXT in SQLite. The SQLAlchemy column is marked `deferred` so large blobs are not loaded on list queries — only when a specific project is fetched.

**CORS preflight** — FastAPI's default CORS handling does not include `OPTIONS` preflight for custom headers. Adding `CORSMiddleware` with `allow_methods=["*"]` and `allow_headers=["*"]` resolved 405 errors from the Vite dev server.

---

## Future Improvements

- **Pixel-level Visual QA** — replace heuristic prompt-level QA with a vision model that compares generated images directly against identity reference photos
- **Director Presets** — named styles ("Kubrick: symmetrical wide", "Nolan: intercutting") that configure the Director Engine's shot profiles, lens preferences, and rhythm rules
- **Camera Movement Planning** — extend `animation_beats` with camera choreography (dolly path, crane arc, shake intensity) exportable to Maya/Unreal
- **Shot List Export** — one-click export of the Director Engine's full shot plan as a production PDF or CSV
- **Animatic to Video** — render the frame sequence as an MP4 using per-frame AI timing estimates
- **Comic Layout Renderer** — output frames into comic page grids (2×3, 3×3, splash panels) instead of storyboard strips
- **Facial Animation Layer** — map the Character Identity to an animation rig for Unreal/Maya export
- **Real-time streaming** — stream Genesis Engine stages via Server-Sent Events for live progress instead of animated simulation
- **Character Completion Score** — visual progress bar tracking which package sections have been generated per character
- **Pose & Emotion Library UI** — click-to-select chips for poses and emotions instead of manual prompt editing
- **User authentication** — multi-user support with per-user project libraries (JWT / OAuth)
- **Collaborative editing** — real-time multi-user editing via WebSocket
- **PostgreSQL migration** — swap from SQLite to PostgreSQL for production (already supported via `DATABASE_URL` env var)
- **Custom model fine-tuning** — fine-tune a watsonx model on structured screenplay data for higher accuracy

---

## License

```
MIT License

Copyright (c) 2025 BaseBoard AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
