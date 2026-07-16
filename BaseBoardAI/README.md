# Baseboard AI

> *Where Stories Become Worlds.*

**Baseboard AI** is a cinematic pre-visualization platform that transforms a raw screenplay, novel, or story document into a fully produced storyboard — complete with a locked character bible, a scene-by-scene world map, and AI-generated frame imagery — in under a minute.

---

## Overview

Baseboard AI is built for writers, directors, game designers, and creative teams who need to move from idea to visual production blueprint without an army of artists or weeks of pre-production. Upload a PDF, Word document, screenplay, or Markdown file and the **Genesis Engine** — a three-stage IBM watsonx AI pipeline — automatically extracts your characters, constructs a world bible, breaks your script into cinematography-ready scenes and frames, and generates storyboard thumbnails for every shot.

The result lands in a premium dark-mode **Studio** interface with a three-panel storyboard canvas, an animatic player, a character dictionary, a world bible, export tools, and a full **Character Package System** that produces portrait sheets, turnaround sheets, expression grids, pose libraries, outfit variants, and material close-ups for every character in the story.

---

## Inspiration

Creativity has always moved faster than the tools available to it. A writer can conceive an entire cinematic universe in an afternoon; turning that vision into something a director of photography, an animator, or a game art director can work from used to take months and a full pre-production staff.

Baseboard AI was built around a single conviction: **AI should not replace the creative voice — it should accelerate the distance between imagination and execution**. When a storyteller uploads their script, they are not handing control to a machine. They are handing a tedious, time-consuming layer of translation work — character standardization, world mapping, cinematography breakdown, shot illustration — to an AI partner that performs those tasks in seconds rather than weeks.

The platform directly answers:

- **How can AI help people create faster?** The Genesis Engine collapses weeks of pre-production into a single pipeline execution. A solo creator can hold a complete visual production bible in under ten minutes.
- **How can AI bridge the gap between imagination and execution?** Baseboard takes raw prose — unformatted notes, a rough screenplay, a novel chapter — and outputs structured, production-ready assets without requiring the creator to know anything about cinematography or visual design.
- **How can AI become a creative partner instead of simply generating content?** The Studio is non-destructive. Every AI decision is visible, editable, and re-runnable. Users select render styles, upload visual reference images for img2img consistency, regenerate individual frames, reorder scenes, lock specific shots into an export cut, and write custom generation prompts per character. The AI handles the volume; the human handles the taste.
- **How can AI unlock entirely new creative experiences?** The Character Package System — generating portrait sheets, 360° turnarounds, nine expression states, seven pose types, seven outfit variants, and material close-ups for any character — is a workflow that has no manual equivalent at this speed and price point.

---

## The Problem

Pre-visualization — the process of planning and illustrating a film, animation, or game before production begins — is one of the most expensive and time-consuming phases of any creative project. For studio productions, pre-vis teams can spend months storyboarding scenes that will change during shooting. For independent creators and small studios, pre-vis is simply unaffordable: hiring illustrators, writing shot lists, maintaining character consistency across hundreds of frames, and building location references takes resources that most projects do not have.

**Who experiences this problem?**

- Independent filmmakers who need to pitch their vision to investors before they can afford a cinematographer
- Game narrative designers who need character reference sheets and location art before concept art budgets are approved
- Animation studios in early development who need to establish visual consistency before a full art team is hired
- Writers and showrunners who want to share a visual treatment with collaborators without waiting for an artist

**Why existing solutions are insufficient:**

Current AI image tools generate individual images well but produce no structure. They have no concept of a screenplay, no understanding of scene continuity, no way to maintain character consistency across frames, and no output format that a production team can use. Storyboarding software requires artists to draw every frame manually. Neither solves the core problem: translating a document into a production-ready visual plan automatically, at scale, with consistent characters and a coherent world.

---

## Our Solution

Baseboard AI solves this by treating the entire pre-visualization workflow as a structured, AI-orchestrated pipeline with a polished human-in-the-loop editing environment.

### User Workflow

1. **Upload** — The user drops a screenplay, novel, script, game design document, or Markdown file (PDF, DOCX, TXT, FDX, or `.md`) onto the **New Project** screen.
2. **Genesis Engine** — The platform extracts the full document text client-side and runs it through a three-stage IBM watsonx AI pipeline. A 12-card animated progress screen shows each analysis step completing in real time.
3. **Creative Director's Report** — When the pipeline completes, an AI-generated summary card shows detected genre, estimated runtime, scene count, character count, emotional themes, and unique locations — before the user even enters the Studio.
4. **Studio** — The main editing environment presents a three-column layout: Scene Index (left), Storyboard Canvas (centre), and Studio Inspector (right). Users browse scenes, review and lock individual frames, open the Animatic Player to preview the visual sequence, and export their cut as a production ZIP.
5. **Character Dictionary** — A searchable list of every character in the production bible, each expandable to reveal their facial blueprint, estimated age, bone structure, distinct markers, and AI-generated portrait. One click opens the full **Character Package** — a multi-tab reference suite that generates portrait, turnaround (5-angle), expression grid (9 states), pose library (7 poses), outfit variants (7 looks), prop reference, and a 360° premium turnaround sheet on demand.
6. **World Bible** — Every detected location listed with its emotional tone, color palette, environmental type, time-of-day descriptor, and all storyboard frames that were shot there — with a clickable lightbox gallery and ZIP download.

### Key Features

- **Genesis Engine** — One-click full pipeline: characters → world → storyboard → images
- **Three-Stage LLM Pipeline** — Sequential IBM watsonx inference: Character Standardizer → World Architect → Storyboard Orchestrator
- **Automatic Model Fallback** — On 429 rate-limit, the backend automatically walks a chain of four watsonx models until one succeeds
- **AI Frame Image Generation** — Every storyboard frame gets a generated thumbnail via Pollinations.ai (Flux model) or Hugging Face Inference API
- **Reference Style Image (img2img)** — Users upload a visual reference; all frame images are generated via img2img with configurable strength
- **Three Render Styles** — B&W Sketch (sparse line art), Flat Color (cel-shaded), and Full Shaded (cinematic volumetric)
- **Character Package System** — Complete character reference suite: portrait, 5-angle turnaround, 9 expressions, 7 poses, 7 outfits, props, 360° premium turnaround, premium poses, material close-ups
- **LLM Character Overview** — AI-generated biography, personality, goals, fears, strengths, weaknesses, occupation, nationality, and role for every character
- **Locked Cut** — Users flag individual frames to build a curated export selection
- **Batch ZIP Export** — Export selected frames as PNG files + a production manifest Markdown file
- **Animatic Player** — Step through frames with action descriptions and sound cues
- **Studio Re-run** — Re-execute the pipeline with a different render style or global aesthetic without re-uploading the script
- **Project Library** — Persisted project list loaded from the backend database
- **Dark / Light Theme** — System-aware with persistent preference
- **Drag & Drop Upload** — PDF, DOCX, TXT, FDX, and Markdown extracted client-side before sending to backend
- **Cinematic UI** — Film-grain overlay, gold compass compass navigation, idle-state animations, pulse effects

---

## AI & Technical Approach

### Architecture

```
┌─────────────────────────────────────────────┐
│  React 19 / TypeScript / Vite / Tailwind    │  Frontend
│  Single-page app — no router library        │
└────────────────────────┬────────────────────┘
                         │ REST (JSON / Base64)
┌────────────────────────▼────────────────────┐
│  FastAPI 0.111 / Python 3.13 / Uvicorn      │  Backend
│  SQLAlchemy ORM · SQLite (swap for Postgres) │
└──────────┬─────────────┬────────────────────┘
           │             │
  ┌────────▼────┐  ┌─────▼──────────────────┐
  │ IBM watsonx │  │  Pollinations.ai (Flux) │
  │ (LLM stage) │  │  or Hugging Face API   │
  └─────────────┘  └────────────────────────┘
```

### AI Models & APIs

| Service | Role | Models |
|---|---|---|
| **IBM watsonx** | LLM inference for all three pipeline stages | `meta-llama/llama-3-3-70b-instruct` (primary); fallback chain: Mistral Small 3.1, Mistral Medium, Mistral Large |
| **LangChain IBM** | watsonx integration layer (`WatsonxLLM`) | `langchain-ibm >= 0.1.0` |
| **Pollinations.ai** | Text-to-image and img2img frame generation | Flux (via `image.pollinations.ai`) — zero config, no API key |
| **Hugging Face Inference API** | Optional alternative image provider | `stabilityai/stable-diffusion-xl-base-1.0` (t2i), `sdxl-refiner-1.0` (img2img) |

### Three-Stage LLM Pipeline

```
Stage 1 — Character Standardizer
  Input:  raw_character_notes (freeform text)
  Prompt: CHARACTER_PROMPT — extracts structured character profiles with
          FacialBlueprint (ethnicity, age, bone structure, markers),
          wardrobe defaults, and a unique CHAR_ID token
  Output: list[CharacterProfileBase]

Stage 2 — World Architect
  Input:  raw_world_notes (freeform text)
  Prompt: WORLD_PROMPT — extracts location slugs with spatial textures
          and lighting keys
  Output: list[EnvironmentProfileBase]

Stage 3 — Storyboard Orchestrator
  Input:  characters + environments (as JSON context) + raw_script_text
  Prompt: STORYBOARD_PROMPT — Hollywood director persona, injects
          character and world context, applies cinematography rules
          (over-the-shoulder for dialogue, establishing wide for
          entrances, close-up for dramatic beats), outputs per-scene
          color palettes and per-frame shot/angle/action/lighting/sound
  Output: list[ScriptSceneBase]
```

### Prompt Engineering

All three prompts enforce strict JSON-only output with no prose wrapping. The response parser strips markdown code fences and falls back to regex extraction of the first `[...]` or `{...}` block if a model prepends prose despite instructions. Temperature is set to `0.2` with greedy decoding for reliable, consistent structured output.

### Image Generation

All generated images are stored as self-contained `data:image/png;base64,...` strings — no external URLs, no cross-origin fetching in the browser. The image module has three dispatch branches:

1. **bw_sketch + reference** → img2img with sketch constraints injected and `strength=0.78`
2. **other style + reference** → img2img with `strength=0.55`
3. **no reference** → text-to-image

Style prefixes are prepended to every prompt to enforce the correct visual register (line art, cel-shaded, or cinematic) regardless of scene content.

### Backend Technologies

| Component | Technology |
|---|---|
| API Framework | FastAPI 0.111 + Uvicorn |
| ORM | SQLAlchemy 2.0 with mapped columns |
| Database | SQLite (default) / PostgreSQL (swap via `DATABASE_URL`) |
| Validation | Pydantic v2 + pydantic-settings |
| LLM Client | LangChain 0.2 + langchain-ibm |
| HTTP Client | httpx (async-compatible, used for image downloads) |
| Config | pydantic-settings loading from `.env` |

### Frontend Technologies

| Component | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 + Rolldown |
| Styling | Tailwind CSS v4 (PostCSS integration) |
| Document Parsing | pdfjs-dist (PDF), mammoth (DOCX), FileReader (TXT/FDX/MD) |
| Export | JSZip + file-saver |
| State Management | React `useState` / `useCallback` — no external store |
| Routing | View state machine in `App.tsx` — no router library |

### State Management

The application uses a view-state machine pattern in [`App.tsx`](BaseBoardAI/frontend/src/App.tsx): a single `AppView` union type controls which top-level component renders. Project state (`StoryboardProject`) is held in a single root-level `useState` and passed down via props. This keeps the state model simple enough to follow without a global store while supporting all navigation transitions.

### Performance Optimisations

- `generated_image_url` columns are `deferred` in SQLAlchemy — excluded from `SELECT *` on list queries and loaded only when a specific project is fetched, preventing large base64 blobs from being transmitted on the project library screen.
- Document text extraction uses dynamic imports (`import('pdfjs-dist')`, `import('mammoth')`) so heavy parsing libraries are code-split and loaded only when a file is uploaded.
- Image generation is non-fatal — failures return `None` and the pipeline continues, ensuring a partial storyboard is always returned even if an image service is unavailable.
- Character Package images are fetched lazily per tab: only the sections the user navigates to are requested from the backend.

---

## Why This Matters in the Context of Racing

Racing — whether on a circuit, in a startup, or in creative production — is fundamentally about the gap between position and potential. The fastest teams are not necessarily the ones with the best raw talent; they are the ones who iterate the fastest. A Formula 1 team that can simulate a tyre strategy in twenty minutes has a structural advantage over one that takes two hours — not because their engineer is smarter, but because they have more attempts per race weekend.

Pre-visualization works the same way. The first storyboard is never the final storyboard. Directors revise, producers cut scenes, editors restructure sequences. Every revision cycle that requires waiting for an artist slows the race. Baseboard AI removes the bottleneck: when a director wants to see the same scene shot in three different render styles, or wants to test how a sequence reads with a completely different visual aesthetic, they can re-run the pipeline in under two minutes rather than commissioning new artwork.

The platform also compresses the **idea-to-decision window** — the time between having a creative thought and being able to evaluate it visually. That compression is where creative races are won. Teams that can evaluate ten visual directions per hour will always outpace teams that can evaluate one per week. Baseboard AI does not just make individual steps faster; it changes the velocity at which creative decisions can be made.

---

## Features

- **Genesis Engine** — Upload one document, receive a complete production bible
- **3-Stage IBM watsonx AI pipeline** — Character extraction, world building, storyboard generation
- **Automatic LLM fallback chain** — 429-safe; walks four models until one succeeds
- **AI-generated storyboard frame thumbnails** — Every frame illustrated via Pollinations.ai Flux or Hugging Face
- **Reference style image (img2img)** — Upload a reference to guide the visual style of all generated frames
- **Three render modes** — B&W Sketch, Flat Color, Full Shaded
- **Character Package System** — Portrait, 5-angle turnaround, 9 expressions, 7 poses, 7 outfits, props, premium 360° turnaround, material close-ups
- **LLM character biographies** — AI-written backstory, personality, goals, fears, strengths, weaknesses per character
- **Character relationship graph** — Visual SVG node graph of inter-character relationships derived from shared scenes
- **Animatic Player** — Step through a scene's frames with action and sound cue annotations
- **Locked Cut** — Curate a selection of frames for export
- **Batch ZIP export** — PNG frames + production manifest Markdown in one download
- **World Bible** — Location index with color palettes, emotional tones, and frame lightbox
- **Studio Re-run** — Re-execute the pipeline with new render style or aesthetic
- **Project Library** — Persisted project history from the SQLite database
- **Drag & Drop file upload** — PDF, DOCX, TXT, FDX, Markdown
- **Creative Director's Report** — Post-analysis summary card before entering Studio
- **Dark / Light theme** — Persistent user preference
- **Downloadable story template** — Structured Markdown format optimised for Genesis Engine accuracy
- **Per-frame and per-scene JSON export** — Download raw structured data for any character or location

---

## Project Structure

```
baseboard/
└── BaseBoardAI/
    ├── backend/                  Python / FastAPI
    │   ├── app/
    │   │   ├── main.py           FastAPI app entry point, CORS, lifespan
    │   │   ├── core/
    │   │   │   ├── config.py     Pydantic-settings env loader
    │   │   │   ├── llm.py        IBM watsonx orchestration + 3-stage pipeline
    │   │   │   ├── image.py      Image generation (Pollinations / HF), t2i + img2img
    │   │   │   └── prompts.py    All LLM prompt templates
    │   │   ├── db/
    │   │   │   ├── models.py     SQLAlchemy ORM models
    │   │   │   └── session.py    SQLite / Postgres session factory
    │   │   ├── routers/
    │   │   │   └── storyboard.py All REST endpoints (pipeline, CRUD, character package)
    │   │   └── schemas/
    │   │       └── storyboard.py Pydantic v2 request/response schemas
    │   ├── requirements.txt
    │   ├── .env.example
    │   └── baseboard.db          SQLite database (auto-created on first run)
    │
    └── frontend/                 React 19 / TypeScript / Vite
        └── src/
            ├── App.tsx           View-state machine, top-level routing
            ├── api/
            │   └── storyboard.ts All fetch calls to the backend API
            ├── pages/
            │   ├── LandingPage.tsx
            │   ├── NewProjectPage.tsx
            │   ├── GenesisEnginePage.tsx
            │   ├── CreativeDirectorReport.tsx
            │   ├── StudioPage.tsx         Main 3-column editor
            │   ├── CharacterDictionaryPage.tsx
            │   ├── CharacterPackagePage.tsx  Full character reference suite
            │   ├── WorldBiblePage.tsx
            │   └── ProjectLibraryPage.tsx
            ├── components/               Reusable UI building blocks
            │   ├── PipelineForm.tsx       Manual pipeline input form
            │   ├── StoryboardCanvas.tsx   Frame grid view
            │   ├── AnimaticPlayer.tsx     Frame-by-frame player
            │   ├── VaultGrid.tsx          Full-project image grid
            │   ├── LockedCutFolder.tsx    Selected frame export view
            │   ├── BatchExportBar.tsx     ZIP export controls
            │   ├── SceneIndex.tsx         Left-column scene list
            │   ├── StudioInspector.tsx    Right-column metadata panel
            │   ├── ShotPlanner.tsx        Per-frame shot planning
            │   ├── ConstellationLoader.tsx Loading animation
            │   └── GraniteNotification.tsx Toast notifications
            ├── types/
            │   └── storyboard.ts         TypeScript interfaces (mirrors backend schemas)
            └── utils/
                ├── extractDocumentText.ts  PDF/DOCX/TXT/FDX/MD extraction
                └── exportFrames.ts         ZIP and manifest generation
```

---

## Installation

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- An [IBM watsonx](https://www.ibm.com/watsonx) account with a Project ID and API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd baseboard
```

### 2. Backend Setup

```bash
cd BaseBoardAI/backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```dotenv
# IBM watsonx — required
WATSONX_API_KEY=your_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=meta-llama/llama-3-3-70b-instruct

# Image generation — pollinations requires no API key
IMAGE_PROVIDER=pollinations

# Only required if IMAGE_PROVIDER=huggingface
HF_API_TOKEN=
HF_IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
HF_IMG2IMG_MODEL=stabilityai/stable-diffusion-xl-refiner-1.0

# Canvas dimensions
POLLINATIONS_WIDTH=768
POLLINATIONS_HEIGHT=512
```

Start the backend server:

```bash
uvicorn app.main:app --reload
# Server runs at http://localhost:8000
# Auto-docs at http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd BaseBoardAI/frontend

# Install dependencies
npm install

# Optional: set the backend URL (defaults to http://localhost:8000)
# Create .env.local and add:
# VITE_API_URL=http://localhost:8000

# Start the development server
npm run dev
# App runs at http://localhost:5173
```

---

## Usage

### Creating a Project with Genesis Engine

1. Open `http://localhost:5173` in your browser.
2. Click **New Project** on the landing screen.
3. Drag and drop your screenplay, novel, or story document onto the upload zone (PDF, DOCX, TXT, FDX, or Markdown). Alternatively, click **Use Template** to download a structured Markdown template, fill it in, and upload it — this produces the highest AI accuracy.
4. Confirm the file details on the preview card and click **Analyse Script →**.
5. Watch the Genesis Engine process 12 analysis tasks in real time. The actual IBM watsonx pipeline runs in parallel with the animated UI.
6. Review the **Creative Director's Report** — genre, runtime estimate, character count, scene count, and detected themes.
7. Click **Enter Studio →**.

### Working in the Studio

- **Scene Index** (left column): Click any scene to load its frames on the canvas. Drag to reorder. Delete scenes you do not need.
- **Storyboard Canvas** (centre column): Each frame card shows the generated image, shot type, camera angle, duration, and action description. Click a frame to select/lock it. Click the image for a full-screen lightbox.
- **Studio Inspector** (right column): Scene metadata, color palette, emotional tone, lighting notes, and a reference image uploader for img2img generation.
- **Animatic Player**: Click the **Player** tab to step through frames with action breakdowns as captions.
- **Vault**: The **Vault** tab shows every frame in every scene in a gallery grid.
- **Locked Cut**: Toggle frames to lock them, then open the **Locked Cut** tab to see your curated selection. Use **Batch Export** to download as a ZIP.

### Character Dictionary

1. Navigate to the **CHARACTERS** tab in the top bar.
2. Each character is listed with an AI-generated portrait thumbnail (generated on first expand).
3. Click any character to expand their facial blueprint, wardrobe, and portrait.
4. Click **✦ Full Package** to open the Character Package suite.

### Character Package

On the Character Package screen, tabs provide access to:
- **Overview** — LLM-generated biography, personality, goals, and fears.
- **Portrait** — Hero portrait image.
- **Turnaround** — 5-angle character sheet (front, ¾ front, side, ¾ back, back).
- **Expressions** — 9-state expression grid (neutral, happy, laughing, angry, sad, surprised, fearful, thinking, crying).
- **Poses** — 7 standard poses (standing, walking, running, sitting, pointing, holding object, hero pose).
- **Outfits** — 7 outfit variants (default, casual, formal, travel, combat, winter, summer).
- **Props** — Auto-detected prop references from wardrobe description.
- **Relationships** — SVG node graph of connections to other characters, derived from shared scene appearances.

Click **Full Pack** to generate the premium 360° turnaround (8 angles), premium poses (T-pose, A-pose, fighting stance, etc.), and material close-ups (face, hair, fabric, hands, eyes).

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

## Challenges

**LLM JSON reliability** — Large language models do not always return pure JSON despite explicit instructions. The response parser in [`llm.py`](BaseBoardAI/backend/app/core/llm.py) implements a two-pass strategy: strip markdown code fences first; if that fails, use a regex fallback to extract the first complete `[...]` or `{...}` block from the raw output. This handles models that prepend prose summaries before the JSON array.

**Model rate limiting** — IBM watsonx enforces consumption limits per model. Rather than failing the entire pipeline on a 429, the `_invoke_with_fallback` function walks a four-model chain (Llama 3.3 70B → Mistral Small 3.1 → Mistral Medium → Mistral Large) automatically. The fallback token detection is case-insensitive and also catches model deprecation errors (`"model_no_support_for_function"`, `"not supported"`, `"resource not found"`).

**Image generation consistency across styles** — Getting an image model to respect style directives (line art vs. cel-shaded vs. cinematic) without careful prompt engineering produces noisy results. The solution was style-prefix injection: a fixed prefix string for each render mode is prepended to every prompt before it is sent to the image provider. The `bw_sketch` mode additionally appends explicit negative constraints (no shading, no crosshatch, no color) and caps the combined prompt at 500 characters to stay within URL-length limits for the Pollinations GET endpoint.

**Base64 data URLs for images** — Storing image URLs as external links creates cross-origin and availability problems. All generated images are converted to `data:image/png;base64,...` strings immediately on receipt and stored as TEXT in SQLite. The SQLAlchemy column is marked `deferred` so large blobs are not loaded on list queries — only when a specific project is fetched.

**CORS and Vite dev server** — FastAPI's default CORS handling does not include `OPTIONS` preflight responses for custom headers. Adding `CORSMiddleware` with explicit `allow_methods=["*"]` and `allow_headers=["*"]` resolved 405 errors on preflight requests from the Vite dev server.

**Tailwind v4 PostCSS integration** — Tailwind CSS v4 changed its PostCSS plugin path from `tailwindcss/nesting` to `@tailwindcss/postcss`. The `postcss.config.js` required updating to use the new package name.

**Client-side document extraction** — Heavy parsing libraries (pdfjs-dist, mammoth) would inflate the initial bundle if imported at module level. Both are dynamically imported inside their extraction functions, causing them to be code-split into separate chunks that are only fetched when the user first uploads a file.

---

## Future Improvements
- **Editable Character Packages** — Allow users to upload or replace individual character assets (portraits, expressions, outfits, poses, and turnaround sheets) while preserving AI-generated consistency across the project.
- **Artwork Replacement & Synchronization** — Enable users to replace any AI-generated storyboard image or artwork with their own custom artwork. Once an image is updated, Baseboard AI will automatically propagate the change across every scene, frame, and reference where that artwork or character appears, ensuring visual consistency throughout the storyboard.
- **User authentication** — Multi-user support with per-user project libraries, using JWT or OAuth
- **Real-time streaming** — Stream Genesis Engine stages via Server-Sent Events so the UI reflects actual pipeline progress rather than animated simulation
- **Shot Planner AI** — Auto-suggest optimal shot sequences for a scene based on dramatic tension and character positions
- **Export to PDF** — Export the complete production bible (storyboard + character sheets + world bible) as a formatted PDF for pitch decks
- **Shot continuity checker** — Flag frames where character appearance or location details contradict earlier frames in the same scene
- **Collaborative editing** — Real-time multi-user editing of scenes and frames (WebSocket-based)
- **PostgreSQL migration** — Swap from SQLite to PostgreSQL for production deployment (already supported via `DATABASE_URL` env var)
- **Version history** — Timeline of project re-runs with diffing between versions
- **Video animatic export** — Render the frame sequence as an MP4 with per-frame durations from the AI timing estimates
- **Custom model fine-tuning** — Fine-tune a watsonx model on structured screenplay data for higher storyboarding accuracy

---

## License

```
MIT License

Copyright (c) 2025 Baseboard AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
