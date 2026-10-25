<p align="center">
  <img src="logo transparent.png" width="180" alt="BaseBoard AI logo">
</p>

<h1 align="center">BaseBoard AI</h1>
<p align="center"><em>Where Stories Become Worlds.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/IBM%20Bob%20Challenge-July%202025-054ADA?style=flat-square" alt="IBM Bob Challenge">
  <img src="https://img.shields.io/badge/Theme-Reimagine%20Creative%20Industries%20with%20AI-7C3AED?style=flat-square" alt="Challenge Theme">
  <img src="https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%2019%20%7C%20WatsonX%20%7C%20Gemini-gold?style=flat-square" alt="Stack">
</p>

---

## 🏆 Challenge Submission

> **July IBM Bob Challenge — Reimagine Creative Industries with AI**

BaseBoard AI began as a submission for the July IBM Bob Challenge. The project has continued to evolve since that challenge; the workflow, feature, and setup descriptions below reflect the current repository.

---

## 1. Problem Statement

Turning a screenplay, story draft, or early idea into a visual production plan involves several connected decisions: who appears, where scenes happen, how the story is divided into shots, and what visual details must stay consistent.

Those decisions can be difficult to explore early, particularly for independent creators and small teams without a dedicated pre-visualization department. BaseBoard AI helps turn story material into an editable starting point for visual planning. It is designed to support creative review and iteration, not to replace a production team or a creator's judgment.

---

## 2. Solution Description

**BaseBoard AI** is a story-development and cinematic pre-visualization workspace. A creator can develop an idea into an outline and script, bring existing material, or start with a blank project, then build and revise a storyboard.

For idea development, enter a premise and a free-text project format; title, genre, and notes are optional. Leaving genre blank keeps the story genre-open. Existing material can be uploaded as PDF, DOCX, TXT, Final Draft (`.fdx`), or Markdown; the project selector also offers a downloadable story template and a blank-project option.

The workflow can produce:

| Output | What it contains |
|---|---|
| **Story development draft** | An editable outline and script developed from an idea, with the chosen format and optional genre and notes saved with the project |
| **Character Bible** | Character profiles, appearance details, narrative roles, relationships, and visual references |
| **World Bible** | Locations and environmental details, including spatial and lighting cues |
| **Storyboard** | Scene and shot cards with action, camera, lighting, mood, dialogue, timing, and continuity information |
| **Storyboard images** | Draft images generated through the configured image provider and selected render style |
| **Character reference package** | Portraits, turnarounds, expressions, poses, and outfit references; extended reference sets depend on server configuration |
| **Production Pack** | A ZIP with project data, a shot-list CSV, a manifest, and available storyboard images |

The platform is built for:
- **Writers** who want to explore a story visually while keeping the writing editable
- **Directors** who want a structured storyboard draft to review and revise
- **Small creative teams** who need a portable project and shot-list handoff

---

## 3. Selected Challenge Theme

> **July Challenge Theme — Reimagine Creative Industries with AI**

The challenge framing focused on making creative workflows easier to explore with AI. BaseBoard AI applies that idea to the path from story material to visual planning: it connects story development, character and world references, shot planning, image drafts, and export in one reviewable project.

### How it reimagines three core creative industry workflows

| Workflow | Traditional starting point | BaseBoard AI |
|---|---|---|
| **Character concepting** | Separate character notes and visual-reference work | Structured character profiles and optional generated reference sheets |
| **Storyboard production** | Manual scene breakdown and shot-list drafting | AI-assisted shot planning and storyboard images that creators can review and edit |
| **Pre-vis handoff** | Story notes, shot lists, and images managed across separate files | A project library and downloadable Production Pack with shot data and available images |

### What makes this genuinely new

The aim is not to make one-off images stand in for filmmaking. BaseBoard AI links visual drafts to a story and a project record:
- It **keeps story context together** with the creator-approved idea, outline, script, character notes, and world details when available
- It **structures shots for review** with camera, action, lighting, mood, dialogue, timing, and continuity fields
- It **carries visual canon forward** through character identities, references, world details, and other project facts used during generation
- It **preserves creator decisions** in the project library and export, including frame review states

---

## 4. AI Approach and Architecture

### The Three-Stage Reasoning Pipeline

The storyboard pipeline runs three main LLM stages. Structured results are validated against Pydantic schemas; the creator can then review and revise the project in the Studio.

```
Creator input
  ├─ Develop an idea → editable outline → editable script
  ├─ Upload a story document
  └─ Start blank and add material in Studio
        │
        ▼
Genesis Engine (for a script-based project)
   Stage 1 — Character planning  (configured text provider)
     • Builds character profiles from the script and supplied character notes
     • Captures appearance, narrative roles, and relationships
        │
        ▼
   Stage 2 — World planning  (configured text provider)
     • Builds location and environment profiles from the script and world notes
     • Records spatial and lighting details where available
        │
        ▼
   Stage 3 — Storyboard planning  (configured text provider)
     • Uses the script with character and world context
     • Produces scene-by-scene frames and cinematography metadata
     • Supports chunking for long scripts; partial output can be marked if a model limit is reached
        │
        ▼
   Draft image generation  (configured image provider)
     • Generates frame images in the selected visual style
     • Progress is streamed to the browser while the pipeline runs
        │
        ▼
Creative Director Report → Studio review → SQLite project library → Production Pack export
```

### The Creative Knowledge Graph (CKG)

The project canon, represented in the code as a Creative Knowledge Graph, stores structured creative facts alongside a project. Generation can use available canon context to help keep characters, locations, and visual direction aligned. The creator can review and update project material in Studio.

| CKG Node | What it stores |
|---|---|
| `approved_characters` | Character appearance summaries and canonical prompts |
| `character_identities` | Identity details such as face, hair, eyes, proportions, and distinguishing features |
| `character_species` | Species and anatomy profiles used for character visuals and QA |
| `character_variants` | Appearance variants for different story points |
| `character_abilities` | Character abilities used by prompt and shot-planning logic |
| `character_visual_rules` | Creator-specified visual rules for a character |
| `character_portraits` | Creator-selected character reference portraits |
| `locations` and `props` | World locations and story-relevant objects |
| `relationships` | Character relationship data |
| `style_guide`, `color_palette`, `camera_language` | Project-level visual and directing guidance |

### The Visual DNA System

When a character reference image is available and Gemini Vision is configured, the visual QA utilities can extract a **Visual DNA Token**: a text description of the character's appearance. Available tokens can be added to storyboard image prompts to help preserve identity across image providers. This is conditional on the reference, provider configuration, and successful extraction; it is not a guarantee that every image will match perfectly.

### Provider Routing — No Code Changes Required

The supported provider axes are configured independently in `backend/.env`:

```
TEXT_PROVIDER   = watsonx | gemini
IMAGE_PROVIDER  = pollinations | huggingface | gemini
VISION_PROVIDER = gemini
```

The checked-in `.env.example` defaults to WatsonX for text, Pollinations for images, and Gemini for vision. WatsonX model fallback values are configurable in the same file. Provider credentials and model availability are subject to each provider's current requirements.
Image generation uses the selected provider's current service limits and terms; check its pricing and availability before use.

### AI Models at a Glance

| Task | Checked-in default | Alternatives |
|---|---|---|
| Character and world planning | WatsonX text provider | Gemini (`TEXT_PROVIDER=gemini`) |
| Storyboard planning | WatsonX text provider | Gemini (`TEXT_PROVIDER=gemini`) |
| Draft frame images | Pollinations | Gemini or Hugging Face, as configured |
| Visual QA and Visual DNA extraction | Gemini Vision | No other vision provider is currently configured |

---

## 5. How IBM Bob Was Used

The project was originally presented as an IBM Bob Challenge submission. The challenge-era README credited IBM Bob as an AI engineering partner; the application and repository have continued to change since that submission.

### What Bob built

The original project notes credited Bob with work across these areas. The descriptions below name capabilities in the current application rather than claiming that every present-day implementation is unchanged from the challenge version.

| Area | Contribution described in the challenge-era project notes |
|---|---|
| **Pipeline architecture** | Character and world analysis followed by structured storyboard planning |
| **Prompt and provider setup** | Prompt templates and configurable text, image, and vision integrations |
| **Director and continuity tools** | Shot-planning metadata, character visual references, and continuity-aware review |
| **FastAPI backend** | API routes for generation, project storage, and project editing |
| **React frontend** | Studio views for storyboard, characters, world details, and saved projects |
| **Validation and persistence** | Structured request and response schemas with SQLite-backed projects |

### How Bob was used in practice

The earlier project description said Bob was used in Agent mode to inspect repository context, make targeted code changes, and run TypeScript and backend validation. That statement describes the original challenge-era development process; it should not be read as a claim about every later change to the repository.

---

## Key Features

| Feature | Description |
|---|---|
| **Idea-to-script development** | Generate and revise an outline, then draft and revise a script before storyboard generation |
| **Multiple project starts** | Develop an idea, upload a supported document, download and fill the story template, or start blank |
| **Genesis Engine** | Runs the character, world, storyboard, and image stages with live progress updates |
| **Director-style shot planning** | Balanced, cinematic, dialogue, action, and intimate shot-planning styles |
| **Creative Knowledge Graph** | Project-level character, world, identity, and visual-direction context for generation |
| **Character identity system** | Identity, species/anatomy, variants, abilities, and visual rules are stored separately |
| **Character references** | Portraits, turnarounds, expressions, poses, outfits, and optional extended packs |
| **World Bible** | Locations and environment descriptions that can be reviewed and updated |
| **Visual QA tools** | Project-aware checks and repair suggestions for supported character, vehicle, and image categories |
| **Visual DNA Token** | Optional Gemini Vision description that can be added to matching image prompts |
| **Shot review and approval** | Mark frames approved or pending and reopen them for revision |
| **Continuity review** | Tracks shot dependencies and can flag dependent frames for review after upstream edits |
| **Frame controls** | Edit shot details, replace or regenerate images, and adjust visual direction |
| **Animatic Player** | Preview the storyboard sequence using per-frame timing, playback, and scrubbing |
| **Production Pack export** | Download a ZIP containing project JSON, shot CSV, manifest, and available frame images |
| **Project Library** | Save, browse, load, update, and delete projects stored in SQLite |
| **Multi-provider text** | WatsonX or Gemini, selected through `TEXT_PROVIDER` |
| **Multi-provider images** | Pollinations, Gemini, or Hugging Face, selected through `IMAGE_PROVIDER` |
| **Optional premium frame render** | Explicit per-frame Nano Banana 2.1 rendering; disabled by default and requires server-side opt-in and a Gemini API key |
| **Demo project** | “The Last Broadcast” can be opened without uploading a story |
| **Dark mode** | The app defaults to dark mode and stores the theme preference in the browser |
| **Local API documentation** | FastAPI interactive docs are available at `/docs` while the backend is running |

---

## Quick Start

### Prerequisites

- Python 3.11 or newer
- Node.js and npm (use a current Node.js LTS release compatible with Vite 8)
- API credentials for the providers you select. The checked-in defaults use WatsonX for text and require its API key and project ID, Gemini for vision, and Pollinations for images; a Pollinations API key is recommended.

> **Gemini text option:** Set `TEXT_PROVIDER=gemini` and provide `GEMINI_API_KEY` to use Gemini for text as well as the default Gemini vision provider. Pollinations remains the default image provider; its API key is recommended because the unauthenticated legacy endpoint may be unreliable.

---

### 1. Clone

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
```

---

### 2. Backend — the easy way (`baseboard`)

The `baseboard` launcher at the repository root creates the backend environment and starts the API:

```bash
# Copy the provider template, then edit backend/.env with your chosen providers and credentials.
cp backend/.env.example backend/.env

# Start the API with development hot reload:
./baseboard

# Production-like mode without hot reload:
./baseboard --prod
```

On first run, the launcher creates `backend/.venv` and installs `backend/requirements.txt` if needed. If `backend/.env` does not exist, it copies `.env.example` there and exits so you can configure it; run `./baseboard` again after editing the file.

```
API  → http://localhost:8000
Docs → http://localhost:8000/docs
```

**Or run manually the traditional way:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in credentials for selected providers
uvicorn app.main:app --reload
```

---

### 3. Frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
# App → http://localhost:5173 (or the URL printed by Vite)
```

---

### 4. Verify everything is up

```bash
curl http://localhost:8000/health
# Should return JSON with status "ok" and the configured provider details.
```

---

### `.env` reference

The checked-in defaults are shown below. Add credentials only for the providers you use; keep `backend/.env` private and never commit keys.

```dotenv
TEXT_PROVIDER=watsonx          # watsonx | gemini
IMAGE_PROVIDER=pollinations    # pollinations | gemini | huggingface
VISION_PROVIDER=gemini

WATSONX_API_KEY=your_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

GEMINI_API_KEY=your_key
POLLINATIONS_API_KEY=your_key  # recommended for the configured Pollinations API
# HF_API_TOKEN=your_token      # required only for IMAGE_PROVIDER=huggingface
```

For the optional Nano Banana 2.1 render of a selected storyboard frame, explicitly opt in on the backend and supply a Gemini API key:

```dotenv
ENABLE_PREMIUM_IMAGE_GENERATION=true
GEMINI_NANO_BANANA_MODEL=gemini-nano-banana-2.1
```

Premium rendering is disabled by default. It is an explicit per-frame action and may incur provider charges; check the provider's current pricing and terms before enabling it.

---

## Demo Scripts

Three optional batch demo scripts live in `scripts/`. They call the local BaseBoard API and write project JSON and generated images under `scripts/output/`. The normal user workflow is through the web app; these scripts are for running the bundled sample stories.

**Prerequisites:** start the backend in one terminal with `./baseboard` and configure the required provider credentials in `backend/.env`.

### How to run (all scripts)

From the repository root, run a script with the backend virtual-environment Python:

```bash
backend/.venv/bin/python scripts/run_tom_and_jerry.py
```

The launcher creates `backend/.venv` on first run. Each script writes to its own directory under `scripts/output/`.

---

### `run_tom_and_jerry.py` — quickest demo

A classic cat-and-mouse story, configured for flat-color frames.

| | |
|---|---|
| **Render style** | `flat_color` |
| **Director style** | `balanced` |
| **Characters** | Tom Cat and Jerry Mouse |
| **Output** | `scripts/output/tom_and_jerry/` |

```bash
backend/.venv/bin/python scripts/run_tom_and_jerry.py
```

To load its saved project and regenerate only the storyboard images:

```bash
backend/.venv/bin/python scripts/run_tom_and_jerry.py --stage3-only
```

Output tree:
```
scripts/output/tom_and_jerry/
  storyboard/project.json
  characters/<id>/
```

---

### `run_lost_compass.py` — full sci-fi demo

A futuristic adventure with a larger cast, configured for full-shaded frames.

| | |
|---|---|
| **Render style** | `full_shaded` |
| **Director style** | `balanced` |
| **Story** | The Lost Compass |
| **Output** | `scripts/output/lost_compass/` |

```bash
backend/.venv/bin/python scripts/run_lost_compass.py
```

Output tree:
```
scripts/output/lost_compass/
  storyboard/project.json
  characters/<id>/
```

---

### `run_distance_between_us.py` — romance/drama demo

A contemporary long-distance romance, configured for black-and-white sketch frames.

| | |
|---|---|
| **Render style** | `bw_sketch` |
| **Director style** | `intimate` |
| **Characters** | Emma Clarke, Kai Tanaka, and Lucas Ferreira |
| **Output** | `scripts/output/distance_between_us/` |

```bash
backend/.venv/bin/python scripts/run_distance_between_us.py
```

Output tree:
```
scripts/output/distance_between_us/
  storyboard/project.json
  storyboard/frames/
  characters/<id>/
```

---

### What each script does

The scripts share the same broad flow:

| Stage | What happens |
|---|---|
| **Stage 1** — Story analysis | Calls the API to build character and world context and plan scenes and storyboard frames; saves project JSON. |
| **Stage 2** — Character references | Requests standard character reference images such as portraits, turnarounds, expressions, poses, outfits, and props. |
| **Stage 3** — Storyboard images | Generates or regenerates frame images through the configured image provider and saves the updated project. |

The scripts also try to request extended character reference sheets. Those endpoints are disabled unless `ENABLE_PREMIUM_IMAGE_GENERATION=true`; the sample scripts handle endpoint errors and can continue without those extra sheets. This setting is separate from the optional Nano Banana 2.1 per-frame render described above.

A live progress bar is printed during image generation. If the backend is not running, the script exits with an error indicating that it cannot reach `http://localhost:8000`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy |
| **Database** | SQLite (file-based project storage) |
| **Text generation** | IBM WatsonX or Google Gemini, selected by `TEXT_PROVIDER` |
| **Images** | Pollinations, Google Gemini, or Hugging Face, selected by `IMAGE_PROVIDER` |
| **Vision** | Google Gemini Vision (`VISION_PROVIDER`) |
| **Streaming** | Server-Sent Events (SSE) for live pipeline progress |

---

## Project Structure

```
BaseBoardAI/
├── baseboard                         # backend launcher; creates venv and starts FastAPI
├── backend/
│   ├── .env.example                  # provider and model configuration template
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Environment-based provider settings
│   │   │   ├── story_development.py  # Idea-to-outline and script support
│   │   │   ├── llm.py                # Text-provider routing and story stages
│   │   │   ├── image.py              # Draft and premium frame image generation
│   │   │   ├── ai_factory.py         # Text, image, and vision provider factory
│   │   │   ├── director_engine.py    # Shot-planning and direction logic
│   │   │   ├── identity_system.py    # Character identity, species, and QA logic
│   │   │   ├── continuity_engine.py  # Shot dependencies and edit impact
│   │   │   └── visual_qa.py          # Image QA and Visual DNA helpers
│   │   ├── db/
│   │   │   ├── models.py             # SQLAlchemy project models
│   │   │   └── session.py            # SQLite session and table setup
│   │   ├── routers/
│   │   │   ├── storyboard.py         # Generation, review, export-support APIs
│   │   │   └── standalone.py          # Standalone generation routes
│   │   ├── schemas/storyboard.py     # Pydantic request and project schemas
│   │   └── main.py                   # FastAPI app, CORS, health endpoint
│   └── tests/                        # Backend tests
├── frontend/
│   ├── package.json                 # Development, build, lint, and test scripts
│   └── src/
│       ├── api/storyboard.ts         # API calls and SSE client
│       ├── pages/
│       │   ├── NewProjectPage.tsx    # Project creation choices and upload
│       │   ├── IdeaDevelopmentPage.tsx # Idea, outline, and script workflow
│       │   ├── GenesisEnginePage.tsx # Story analysis and image progress
│       │   ├── StudioPage.tsx        # Storyboard workspace
│       │   └── ProjectLibraryPage.tsx # Saved project library
│       ├── components/               # Storyboard, character, world, and review UI
│       ├── utils/productionPack.ts   # Production Pack ZIP builder
│       └── types/storyboard.ts       # Shared project and frame types
└── scripts/
    ├── run_tom_and_jerry.py
    ├── run_lost_compass.py
    └── run_distance_between_us.py
```

---

## License

No `LICENSE` file is currently present in this repository checkout. Add or confirm a license before redistributing the project.

---
