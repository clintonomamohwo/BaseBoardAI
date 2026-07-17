<p align="center">
  <img src="logo transparent.png" width="180" alt="BaseBoard AI">
</p>

<h1 align="center">BaseBoard AI</h1>
<p align="center"><em>Where Stories Become Worlds.</em></p>

<p align="center">
  <strong>July IBM Bob Challenge — Reimagine Creative Industries with AI</strong>
</p>

---

## Problem Statement

Turning a screenplay or story document into a visual production blueprint is one of the most expensive and time-consuming bottlenecks in film, animation, and game development. A professional pre-visualization pass — storyboards, character sheets, location art, relationship maps — typically requires a team of concept artists, a storyboard supervisor, and weeks of iteration before a single frame reaches the director.

Independent filmmakers, solo game designers, animation students, and small creative studios cannot afford this. Their stories stay trapped as text documents.

There is no tool that takes a story as input and returns a production-ready visual package as output — until now.

---

## Solution Description

**BaseBoard AI** is a cinematic pre-visualization platform that transforms a screenplay, novel excerpt, or story document into a fully produced creative production package in under a minute.

You give it a story. It gives you back:

- A **locked Character Bible** — facial blueprints, wardrobe defaults, story roles, and a relationship graph for every character in the script
- A **World Bible** — location profiles with spatial textures, lighting keys, factions, lore, and timeline
- A **Director-driven Storyboard** — scene-by-scene shot cards with shot type, camera angle, camera movement, lighting notes, mood, dialogue, and a cinematographer's rationale for every frame
- **AI-generated frame images** for every shot in the storyboard
- A full **Character Package** for every character — hero portrait, 5-view turnaround sheet, facial expression library, action pose library, and outfit variant sheets

The platform is built for writers who want to see their story, directors who need to pitch a visual language, and small studios that cannot afford a full pre-production team.

---

## Selected Challenge Theme

> **July Challenge Theme — Reimagine Creative Industries with AI**

BaseBoard AI directly addresses the creative industry bottleneck described above. Pre-visualization is the invisible gatekeeping layer of professional filmmaking — it is what separates a story idea from a greenlit production, and it has historically been inaccessible to anyone outside a well-funded studio.

By combining IBM WatsonX's large-language reasoning with Google Gemini's vision and image generation through a structured multi-stage pipeline, BaseBoard AI removes that barrier entirely. Any creator — regardless of budget — can produce a professional-grade storyboard and character bible from nothing but their story document.

The platform reimagines three core creative industry workflows:

| Workflow | Traditional | BaseBoard AI |
|---|---|---|
| Character concepting | Weeks with a concept artist | Seconds from script text |
| Storyboard production | Days with a storyboard supervisor | Under a minute, full shoot |
| Pre-vis package | $10,000–$50,000+ for a short film | Free, open-source, self-hosted |

---

## AI Approach and Architecture

### The Three-Stage Reasoning Pipeline

Every project runs through a sequential three-stage LLM pipeline. Each stage builds on the output of the previous one, and all three are validated by strict Pydantic schemas before the next stage begins.

```
User Input (screenplay / story document)
        │
        ▼
 Stage 1 — Character Standardizer  (IBM WatsonX / Gemini)
   • Extracts every character from the raw script text
   • Assigns facial blueprint, wardrobe, story role (Protagonist / Antagonist /
     Supporting / Other), and inferred relationships (ally / enemy / romantic /
     mentor / family / rival / neutral)
   • Output: validated list of CharacterProfileBase objects
        │
        ▼
 Stage 2 — World Architect  (IBM WatsonX / Gemini)
   • Extracts all locations from the script
   • Assigns spatial textures and lighting keys per location
   • Output: validated list of EnvironmentProfileBase objects
        │
        ▼
 Stage 3 — Storyboard Orchestrator  (IBM WatsonX / Gemini)
   • Ingests character context + world context + raw screenplay
   • Produces scene-by-scene shot lists with full cinematographer metadata
   • Applies shot distribution rules by director style (balanced / cinematic /
     dialogue / action / intimate)
   • Scene chunking: large scripts are split at sluglines, each chunk
     processed in a separate LLM call to avoid output-token truncation
   • Output: validated list of ScriptSceneBase → StoryboardFrame objects
        │
        ▼
 Director Engine
   • Classifies each scene (action / dialogue / establishing / intimate)
   • Assigns lens profile (24mm → 100mm) and depth style per frame
   • Stores rationale so every shot decision is explainable
        │
        ▼
 Image Generation  (Pollinations / Gemini Imagen / HuggingFace)
   • One image generated per frame using the visual_action description
   • Character appearance anchored by the Creative Knowledge Graph (CKG)
   • Visual DNA Tokens (Gemini Vision) bridge the latent-space gap between
     Gemini reference sheets and open-source storyboard frame models
        │
        ▼
 SQLite Persistence → StoryboardProject JSON → React Studio
```

### The Creative Knowledge Graph (CKG)

The CKG is the single source of truth that prevents the AI from "forgetting" what a character looks like across scenes. Every image generation call reads from it.

It stores:
- `approved_characters` — canonical name, appearance summary, prompt, wardrobe, age
- `character_identities` — Layer 1: face, hair, eyes, body proportions, accessories
- `character_species` — Layer 2: anatomy type (Human, Elf, Wolf, Robot, etc.)
- `character_variants` — Layer 3: appearance at different story points
- `character_abilities` — influences Director Engine shot selection
- `locations`, `relationships`, `style_guide`, `color_palette`, `camera_language`

### The Visual DNA System

When a character reference sheet is generated via Gemini Imagen, Gemini Vision analyzes the image and writes a **Visual DNA Token** — a dense single-paragraph description capturing species, build, skin/fur color, facial features, outfit, accessories, and art style. This token is prepended to every storyboard frame prompt featuring that character, anchoring their appearance even when switching from Gemini to a different image model.

### The Director Engine

The Director Engine runs over every frame after the LLM produces raw JSON. It:

1. Classifies the scene — action / dialogue / establishing / intimate
2. Enforces shot distribution rules based on the chosen `director_style`
3. Assigns a lens profile — 24mm (epic wide), 35mm (dynamic action), 50mm (natural dialogue), 85mm (intimate portrait), 100mm (detail insert)
4. Writes a depth style — deep focus / shallow / split
5. Records rationale — every shot decision is visible in the Studio Inspector

### Provider Routing

Three independent AI axes, each switchable in `.env` with no code changes:

```
TEXT_PROVIDER   = watsonx | gemini
IMAGE_PROVIDER  = pollinations | gemini | huggingface
VISION_PROVIDER = gemini
```

**IBM WatsonX automatic fallback chain** — on 429 rate-limit, the pipeline retries through four models before surfacing an error:

1. `meta-llama/llama-3-3-70b-instruct` (primary)
2. `mistralai/mistral-small-3-1-24b-instruct-2503`
3. `mistralai/mistral-medium-2505`
4. `mistral-large-2512`

### AI Models at a Glance

| Task | Default Model | Alternative |
|---|---|---|
| Character extraction | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| World bible extraction | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| Storyboard planning | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| Frame image generation | Pollinations (Flux) | `IMAGE_PROVIDER=gemini` (Imagen) |
| Character sheet generation | Google Gemini Imagen | — |
| Vision / anatomy audit | Google Gemini Flash | — (only provider) |
| Visual DNA extraction | Google Gemini Flash | — (only provider) |

---

## How IBM Bob Was Used

IBM Bob was the AI engineering partner throughout the entire development of BaseBoard AI. It was used to:

- **Architect the three-stage pipeline** — Bob designed the `invoke_character_stage → invoke_world_stage → invoke_storyboard_stage` chain, including the scene-chunking strategy for large screenplays that avoids LLM output-token truncation
- **Write and refine the prompt templates** — the `CHARACTER_PROMPT`, `WORLD_PROMPT`, and `STORYBOARD_PROMPT` in [`prompts.py`](backend/app/core/prompts.py) were iteratively developed with Bob, including the cinematographer identity framing, shot distribution rules, and environmental expansion guidelines
- **Build the Director Engine** — Bob designed the shot classification logic, lens profile assignment, and per-director-style distribution targets in [`prompt_builder.py`](backend/app/core/prompt_builder.py)
- **Design the Creative Knowledge Graph** — Bob architected the CKG schema and the identity system (3-layer: Identity → Species → Variants) in [`identity_system.py`](backend/app/core/identity_system.py)
- **Implement the Visual QA engine** — Bob built [`visual_qa.py`](backend/app/core/visual_qa.py) including anatomy mutation detection, Visual DNA token extraction, and the repair action system
- **Build the AIFactory provider abstraction** — Bob wrote [`ai_factory.py`](backend/app/core/ai_factory.py), the provider-agnostic factory that routes text, image, and vision calls to the correct backend without the rest of the codebase importing SDK classes directly
- **Implement the FastAPI backend** — Bob wrote and maintained all endpoints in [`storyboard.py`](backend/app/routers/storyboard.py), including the SSE streaming pipeline, project CRUD, character package generation, scene continuity QA, and render upgrade endpoints
- **Build the React frontend** — Bob implemented the full Studio UI, including the Genesis Engine progress screen, Storyboard Canvas, Character Dictionary, Character Package page (portrait, turnaround, expressions, poses, outfits), UpgradeStyleMenu, SceneContinuityPanel, and Project Library
- **Debug complex state management bugs** — Bob diagnosed and fixed several multi-root-cause bugs in the character package system: `localStorage` quota overflow, stale closure in save effects, missing `key` prop causing React state reuse, and the two-tier localStorage/sessionStorage cache that prevents regeneration on navigation
- **Write all Pydantic schemas** — Bob authored and evolved every schema in [`schemas/storyboard.py`](backend/app/schemas/storyboard.py) including `CharacterProfileBase`, `ScriptSceneBase`, `UpgradeStyleRequest`, `SceneContinuityReport`, and `ProjectSummary`

Bob was used in **Agent mode** throughout — reading files, searching the codebase, applying targeted diffs, running TypeScript type checks, and committing directly to the repository after each completed feature.

---

## Key Features

| Feature | Description |
|---|---|
| **3-Stage AI Pipeline** | Characters → World Bible → Storyboard, each validated by Pydantic v2 |
| **Genesis Engine** | Live SSE-streamed 12-task pipeline screen with per-stage progress bars |
| **Director Engine** | AI cinematographer — assigns shot type, lens, camera movement, and lighting per frame |
| **Creative Knowledge Graph** | Single source of truth for all generation — characters, species, variants, abilities |
| **Character DNA System** | 3-layer identity (who · what · how) — identity, species, physical form, variants |
| **Character Package** | Auto-generated portrait, 5-view turnaround, expressions, poses, outfit sheets |
| **Visual QA Engine** | Gemini Vision audits every generated image for anatomy mutations and continuity |
| **Visual DNA Token** | Gemini Vision describes appearance as a reusable cross-model prompt prefix |
| **Scene Continuity QA** | Flags character and prop inconsistencies across frames in a scene |
| **Render Upgrade** | 21 style presets across 4 tiers — upgrade any frame, scene, or whole project |
| **Continuity Engine** | Detects which frames are affected when a character or world entry is edited |
| **Animatic Player** | Plays all storyboard frames as a sequential animatic with per-frame timing |
| **Vault Grid** | Gallery view of all generated frame images with lightbox |
| **Locked Cut Folder** | Pin and protect specific frames from pipeline re-runs |
| **Batch Export** | Export selected frames as PNG or JSON |
| **Multi-Provider Images** | Pollinations (free) · Gemini Imagen · HuggingFace — switch via `.env` |
| **Multi-Provider Text** | IBM WatsonX (default) · Google Gemini — switch via `TEXT_PROVIDER` |
| **WatsonX Fallback Chain** | Auto-retries through 4 models on 429 rate-limit |
| **4 Render Styles** | B&W Sketch · B&W Detailed · Flat Color · Full Shaded |
| **5 Director Styles** | Balanced · Cinematic · Dialogue · Action · Intimate |
| **Project Library** | Save, browse, load, and delete projects (SQLite persistence) |
| **World Bible** | Locations, factions, lore entries, timeline — importable from documents |
| **Demo Project** | Instant demo — "The Lost Compass" Sci-Fi adventure, no upload required |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- An [IBM WatsonX](https://www.ibm.com/watsonx) account with a Project ID and API key *(for text / LLM)*
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key *(for vision and image generation)*

> **Zero-credential option:** Set `TEXT_PROVIDER=gemini`, `IMAGE_PROVIDER=pollinations`, `VISION_PROVIDER=gemini` and use only a free Gemini key. No WatsonX account needed.

---

### 1. Clone

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in your keys
uvicorn app.main:app --reload
# API → http://localhost:8000
# Docs → http://localhost:8000/docs
```

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
# App → http://localhost:5173
```

### Environment Variables (`.env`)

```dotenv
# ── Provider routing ──────────────────────────────────────────────────────
TEXT_PROVIDER=watsonx          # watsonx | gemini
IMAGE_PROVIDER=pollinations    # pollinations | gemini | huggingface
VISION_PROVIDER=gemini         # gemini (only option)

# ── IBM WatsonX ───────────────────────────────────────────────────────────
WATSONX_API_KEY=your_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=meta-llama/llama-3-3-70b-instruct

# ── Google Gemini ─────────────────────────────────────────────────────────
GEMINI_API_KEY=your_key
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy |
| **Database** | SQLite (zero-config, file-based) |
| **LLM — Text** | IBM WatsonX (Llama 3.3 70B) · Google Gemini |
| **LLM — Images** | Google Gemini Imagen · Pollinations (Flux) · HuggingFace |
| **LLM — Vision** | Google Gemini Flash |
| **LangChain** | WatsonX LLM client integration |
| **Streaming** | Server-Sent Events (SSE) for live pipeline progress |

---

## Project Structure

```
BaseBoardAI/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py            # Centralised env config — single import point
│   │   │   ├── prompts.py           # CHARACTER, WORLD, STORYBOARD prompt templates
│   │   │   ├── llm.py               # WatsonX LLM orchestration + fallback chain
│   │   │   ├── image.py             # Image generation — Pollinations / Gemini / HF
│   │   │   ├── ai_factory.py        # Provider-agnostic factory (Text / Image / Vision)
│   │   │   ├── prompt_builder.py    # Director Engine — STYLE_PREFIXES, UPGRADE_PIPELINE
│   │   │   ├── director_engine.py   # Shot-type + lens assignment per frame
│   │   │   ├── identity_system.py   # Character DNA + CKG + scene continuity
│   │   │   ├── continuity_engine.py # Frame impact detection on character edits
│   │   │   ├── visual_qa.py         # Gemini Vision anatomy audit + Visual DNA
│   │   │   ├── sheet_layouts.py     # Character package sheet grid layouts
│   │   │   └── sheet_slicer.py      # Crop individual cells from a sheet image
│   │   ├── db/
│   │   │   ├── models.py            # SQLAlchemy ORM models
│   │   │   └── session.py           # Database session + init_db()
│   │   ├── routers/
│   │   │   └── storyboard.py        # All FastAPI endpoints
│   │   ├── schemas/
│   │   │   └── storyboard.py        # All Pydantic v2 schemas
│   │   └── main.py                  # FastAPI app entry point + CORS
│   ├── .env.example
│   └── requirements.txt
│
└── frontend/src/
    ├── api/storyboard.ts            # All API calls + SSE stream client
    ├── components/                  # FrameCard, UpgradeStyleMenu, SceneContinuityPanel…
    ├── pages/                       # Studio, Genesis, Library, CharacterPackage…
    ├── types/storyboard.ts          # TypeScript types — mirrors backend schemas
    ├── types/renderUpgrade.ts       # Style presets, tier labels, upgrade pipeline
    ├── data/demoProject.ts          # Pre-baked demo project
    └── hooks/                       # useDirectorsLight, useCompassNeedle…
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
