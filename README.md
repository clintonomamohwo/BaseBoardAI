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

This project is a submission for the IBM Bob July Challenge. Every line of code — backend, frontend, architecture, prompts, bug fixes, and documentation — was built with IBM Bob as the active AI engineering partner.

---

## 1. Problem Statement

Turning a screenplay or story document into a visual production blueprint is one of the most expensive and time-consuming bottlenecks in film, animation, and game development.

A professional pre-visualization pass — storyboards, character sheets, location art, relationship maps — typically requires:
- A team of **concept artists** spending weeks on character designs
- A **storyboard supervisor** directing shot-by-shot coverage
- A **pre-vis producer** coordinating the full visual package
- A budget of **$10,000–$50,000+** just for a short film

**Independent filmmakers, solo game designers, animation students, and small creative studios cannot afford this.** Their stories stay trapped as text documents, never reaching a visual form that can be pitched, funded, or produced.

There is no tool that takes a story as input and returns a complete production-ready visual package as output — until now.

---

## 2. Solution Description

**BaseBoard AI** is a cinematic pre-visualization platform that transforms a screenplay, novel excerpt, or story document into a fully produced creative production package in under a minute.

You give it a story. It gives you back:

| Output | What it contains |
|---|---|
| **Character Bible** | Facial blueprints, wardrobe defaults, story roles, relationship graph for every character |
| **World Bible** | Location profiles with spatial textures, lighting keys, factions, lore, and timeline |
| **Director-Driven Storyboard** | Shot cards per frame: shot type, camera angle, movement, lighting, mood, dialogue, rationale |
| **AI-Generated Frame Images** | One image per storyboard frame, anchored to character appearance |
| **Character Package** | Hero portrait, 5-view turnaround, expression library, pose library, outfit variants per character |

The platform is built for:
- **Writers** who want to see their story before it goes into production
- **Directors** who need to pitch a visual language to investors or collaborators
- **Small studios** that cannot afford a full pre-production department

---

## 3. Selected Challenge Theme

> **July Challenge Theme — Reimagine Creative Industries with AI**

Pre-visualization is the invisible gatekeeping layer of professional filmmaking. It is what separates a story idea from a greenlit production, and it has historically been inaccessible to anyone without a well-funded studio behind them.

BaseBoard AI removes that barrier entirely. By combining IBM WatsonX's large-language reasoning with Pollinations and Google Gemini's vision and image generation through a structured multi-stage pipeline, any creator — regardless of budget — can produce a professional-grade storyboard and character bible from nothing but their story document.

### How it reimagines three core creative industry workflows

| Workflow | Traditional approach | BaseBoard AI |
|---|---|---|
| **Character concepting** | Weeks of iteration with a concept artist | Seconds — extracted and visualised from script text |
| **Storyboard production** | Days with a storyboard supervisor | Under a minute — full cinematographer-directed shoot |
| **Pre-vis package** | \$10,000–\$50,000+ for a short film | Free, open-source, self-hosted |

### What makes this genuinely new

Most AI image tools generate one-off pictures. BaseBoard AI does something different:

- It **understands narrative structure** — extracting characters, locations, and relationships from raw story text
- It **thinks like a cinematographer** — applying shot distribution rules, lens profiles, and director styles to every frame
- It **maintains identity across scenes** — the Creative Knowledge Graph and Visual DNA system prevent the AI from "forgetting" what a character looks like
- It **persists decisions to a database** — so a project saved today is identical when opened next week

---

## 4. AI Approach and Architecture

### The Three-Stage Reasoning Pipeline

Every project runs through a sequential three-stage LLM pipeline. Each stage builds on the output of the previous one, and all outputs are validated by strict Pydantic v2 schemas before the next stage begins.

```
User Input (screenplay / story document)
        │
        ▼
 Stage 1 — Character Standardizer  (IBM WatsonX / Gemini)
   • Extracts every character from the raw script text
   • Assigns: facial blueprint, wardrobe, story role (Protagonist / Antagonist /
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
   • Ingests: character context + world context + raw screenplay
   • Produces: scene-by-scene shot lists with full cinematographer metadata
   • Applies: shot distribution rules per director style
     (balanced / cinematic / dialogue / action / intimate)
   • Scene chunking: large scripts split at sluglines, each chunk in a
     separate LLM call — avoids output-token truncation on long scripts
   • Output: validated list of ScriptSceneBase → StoryboardFrame objects
        │
        ▼
 Director Engine
   • Classifies each scene: action / dialogue / establishing / intimate
   • Assigns lens profile (24mm wide → 100mm portrait) and depth style
   • Enforces shot variety rules — no more than 2 identical shots in a row
   • Stores rationale so every shot decision is explainable in the UI
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

The CKG is the single source of truth stored alongside every saved project. Every image generation call reads from it. This is what prevents the AI from "forgetting" what a character looks like across scenes.

| CKG Node | What it stores |
|---|---|
| `approved_characters` | Canonical name, appearance summary, canonical prompt |
| `character_identities` | Layer 1 — face, hair, eyes, body proportions, accessories |
| `character_species` | Layer 2 — anatomy type (Human, Elf, Wolf, Robot, etc.) |
| `character_variants` | Layer 3 — appearance at different story points |
| `character_abilities` | Ability slugs injected into every frame prompt |
| `character_visual_rules` | Per-character QA/Director rules (e.g. "always show wings") |
| `character_portraits` | Creator-chosen reference portrait URL |
| `locations` | Environment profiles with spatial textures and lighting keys |
| `relationships` | Character relationship graph |

### The Visual DNA System

When a character reference sheet is generated via Gemini Imagen, Gemini Vision analyses the image and writes a **Visual DNA Token** — a dense single-paragraph description capturing species, build, skin/fur color, facial features, outfit, accessories, and art style. This token is prepended to every storyboard frame prompt featuring that character, anchoring their appearance even when switching to a different image model.

### Provider Routing — No Code Changes Required

Three independent AI axes, each switchable in `.env`:

```
TEXT_PROVIDER   = watsonx | gemini
IMAGE_PROVIDER  = pollinations | gemini | huggingface
VISION_PROVIDER = gemini
```

**IBM WatsonX automatic fallback chain** — on 429 rate-limit, retries through four models before surfacing an error:

1. `meta-llama/llama-3-3-70b-instruct` (primary)
2. `mistralai/mistral-small-3-1-24b-instruct-2503`
3. `mistralai/mistral-medium-2505`
4. `mistral-large-2512`

### AI Models at a Glance

| Task | Default | Alternative |
|---|---|---|
| Character extraction | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| World bible extraction | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| Storyboard planning | IBM WatsonX — Llama 3.3 70B | `TEXT_PROVIDER=gemini` |
| Frame image generation | Pollinations (Flux) | `IMAGE_PROVIDER=gemini` |
| Character sheet generation | Google Gemini Imagen | — |
| Vision / anatomy audit | Google Gemini Flash | — |
| Visual DNA extraction | Google Gemini Flash | — |

---

## 5. How IBM Bob Was Used

IBM Bob was the **primary AI engineering partner** throughout the entire development of BaseBoard AI — not a code reviewer or suggestion tool, but the active builder.

### What Bob built

| Area | Contribution |
|---|---|
| **Pipeline architecture** | Designed the three-stage `invoke_character_stage → invoke_world_stage → invoke_storyboard_stage` chain, including scene-chunking for large screenplays |
| **Prompt engineering** | Wrote and iteratively refined `CHARACTER_PROMPT`, `WORLD_PROMPT`, and `STORYBOARD_PROMPT` — including the cinematographer identity framing, shot distribution rules, and environmental expansion guidelines |
| **Director Engine** | Built shot classification logic, lens profile assignment, and per-director-style distribution targets in `prompt_builder.py` |
| **Creative Knowledge Graph** | Architected the CKG schema and the 3-layer identity system (Identity → Species → Variants) in `identity_system.py` |
| **Visual QA Engine** | Built `visual_qa.py` — anatomy mutation detection, Visual DNA token extraction, and the repair action system |
| **AIFactory abstraction** | Wrote the provider-agnostic factory (`ai_factory.py`) that routes text, image, and vision calls without the codebase importing SDK classes directly |
| **FastAPI backend** | Wrote and maintained all endpoints in `storyboard.py` — SSE streaming pipeline, project CRUD, character package generation, scene continuity QA, render upgrade, and the new `PATCH /character/update-dna` |
| **React frontend** | Implemented the full Studio UI — Genesis Engine, Storyboard Canvas, Character Dictionary, Character Package (portrait, turnaround, expressions, poses, outfits), UpgradeStyleMenu, SceneContinuityPanel, Project Library, Overview Update button, Portrait Reference Picker, AbilitiesSaveButton |
| **State management debugging** | Diagnosed and fixed: `localStorage` quota overflow, stale closure in save effects, missing `key` prop causing React state reuse, `loadedTabs` reset on remount triggering spurious regeneration, and the two-tier localStorage/sessionStorage image cache |
| **Pydantic schemas** | Authored every schema — `CharacterProfileBase`, `ScriptSceneBase`, `UpgradeStyleRequest`, `SceneContinuityReport`, `ProjectSummary`, `CharacterDNAUpdateRequest`, and all CKG models |
| **Character DNA persistence** | Designed `PATCH /storyboard/character/update-dna`, the `character_visual_rules` and `character_portraits` CKG fields, and the `updateCharacterDNA()` API function |

### How Bob was used in practice

Bob was used in **Agent mode** throughout — it read files before editing, searched the codebase for context, applied targeted surgical diffs, ran TypeScript type checks, executed backend validation commands, and committed directly to the repository after each completed feature. No code was written speculatively — every change traced back to a specific user requirement.

---

## Key Features

| Feature | Description |
|---|---|
| **3-Stage AI Pipeline** | Characters → World Bible → Storyboard, each Pydantic-validated |
| **Genesis Engine** | Live SSE-streamed pipeline screen with per-stage progress bars |
| **Director Engine** | AI cinematographer — shot type, lens, camera movement, lighting per frame |
| **Creative Knowledge Graph** | Single source of truth for all generation across every scene |
| **Character DNA System** | 3-layer identity (Identity · Species · Variants) + abilities + visual rules |
| **Character Package** | Portrait, 5-view turnaround, expressions, poses, outfit sheets |
| **Overview Editor** | Editable biography, personality, goals, fears — AI-generate or manual edit + Update |
| **Portrait Reference Picker** | Select any generated image as the canonical reference — saved to CKG |
| **Abilities & Visual Rules** | Toggle chips + custom rules saved to CKG, read by Director Engine and QA |
| **Visual QA Engine** | Gemini Vision audits every image for anatomy mutations and continuity |
| **Visual DNA Token** | Cross-model appearance anchor — bridges Gemini Imagen → Pollinations |
| **Scene Continuity QA** | Flags character and prop inconsistencies across frames in a scene |
| **Render Upgrade** | 21 style presets across 4 tiers — per frame, scene, or whole project |
| **Continuity Engine** | Detects which frames are affected when a character or world entry is edited |
| **Animatic Player** | Plays all frames as a sequential animatic with per-frame timing |
| **Session Image Cache** | sessionStorage cache — no regeneration when navigating between tabs |
| **Multi-Provider Images** | Pollinations · Gemini Imagen · HuggingFace — switch via `.env` |
| **Multi-Provider Text** | IBM WatsonX (default) · Google Gemini — switch via `TEXT_PROVIDER` |
| **WatsonX Fallback Chain** | Auto-retries 4 models on 429 rate-limit |
| **Project Library** | Save, browse, load, delete projects (SQLite) |
| **World Bible** | Locations, factions, lore, timeline — importable from documents |
| **Demo Project** | "The Lost Compass" Sci-Fi demo — no upload required |
| **Dark Mode Default** | First launch defaults to dark mode; preference persisted in `localStorage` with no FOUC |
| **Collapsible Inspector** | Right-side Inspector panel slides in/out with an animated toggle; canvas expands to fill freed space |
| **↺ Regenerate Visual Action** | Rewrites the staging direction *and* immediately regenerates the frame image in one click |
| **Shot Balancer** | Composition diversity scoring — weighted shot-type distribution across all scenes |

---

## Quick Start

### Prerequisites

- Python 3.11+ and Node.js 20+
- [IBM WatsonX](https://www.ibm.com/watsonx) API key + Project ID *(text pipeline)*
- [Google Gemini](https://aistudio.google.com/app/apikey) API key *(vision + images)*

> **Zero-credential option:** Set `TEXT_PROVIDER=gemini`, `IMAGE_PROVIDER=pollinations`, `VISION_PROVIDER=gemini` — one free Gemini key is enough to run the full app.

---

### 1. Clone

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
```

---

### 2. Backend — the easy way (`baseboard`)

A `baseboard` script at the repo root lets you start the API **from any directory** — no `cd`, no manual venv activation:

```bash
# From the repo root (or anywhere you have the path):
./baseboard

# Production mode (no hot-reload):
./baseboard --prod
```

On first run it will:
1. Create `backend/.venv` and install dependencies automatically
2. Copy `.env.example` → `backend/.env` and prompt you to fill in your API keys
3. Start the server once the `.env` is populated

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
cp .env.example .env             # fill in your API keys
uvicorn app.main:app --reload
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
```

---

### 4. Verify everything is up

```bash
curl http://localhost:8000/health
# {"status":"ok","primary_model":"meta-llama/llama-3-3-70b-instruct", ...}
```

---

### `.env` reference

```dotenv
TEXT_PROVIDER=watsonx          # watsonx | gemini
IMAGE_PROVIDER=pollinations    # pollinations | gemini | huggingface
VISION_PROVIDER=gemini

WATSONX_API_KEY=your_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PRIMARY_TEXT_MODEL=meta-llama/llama-3-3-70b-instruct
WATSONX_FALLBACK_TEXT_MODEL=mistralai/mistral-small-3-1-24b-instruct-2503
WATSONX_LAST_RESORT_MODEL=meta-llama/llama-3-1-8b

GEMINI_API_KEY=your_key
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image
```

---

## Demo Scripts

Three pre-built demo pipelines live in `scripts/`. Each one runs the full BaseBoard pipeline — LLM extraction, character packages, and storyboard frame images — against a ready-made story, and saves all output to `scripts/output/`.

**Prerequisites:** backend running (`./baseboard` in a separate terminal), API keys set in `backend/.env`.

### How to run (all scripts)

The path to `BaseBoardAI` contains a space — always quote it:

```bash
cd "/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/backend"
source .venv/bin/activate
python3 ../scripts/<script_name>.py
```

Or using the venv Python directly from any directory:

```bash
"/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/backend/.venv/bin/python3" \
  "/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/scripts/<script_name>.py"
```

---

### `run_tom_and_jerry.py` — quickest demo

Classic cat-and-mouse. 2 characters, 6 scenes, ~18 frames.

| | |
|---|---|
| **Render style** | `flat_color` |
| **Director style** | `balanced` |
| **Characters** | Tom Cat, Jerry Mouse |
| **Output** | ~110 character images + storyboard frames |

```bash
cd "/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/backend"
source .venv/bin/activate
python3 ../scripts/run_tom_and_jerry.py
```

Re-run only Stage 3 (storyboard images) using a saved project:

```bash
python3 ../scripts/run_tom_and_jerry.py --stage3-only
```

Output tree:
```
scripts/output/tom_and_jerry/
  storyboard/project.json
  characters/<id>/portrait.png
  characters/<id>/turnaround/{front,side,back,...}.png
  characters/<id>/expressions/{neutral,happy,angry,...}.png
  characters/<id>/poses/{standing,running,hero_pose,...}.png
  characters/<id>/outfits/{default,casual,formal,...}.png
  characters/<id>/turnaround_360/deg_000…deg_315.png
  characters/<id>/premium_poses/{t_pose,crouching,...}.png
  characters/<id>/material_closeups/{face,hair,fabric,...}.png
```

---

### `run_lost_compass.py` — full sci-fi demo

Futuristic adventure. 7 characters (anthropomorphic humanoids), 7 scenes, ~21 frames.

| | |
|---|---|
| **Render style** | `full_shaded` |
| **Director style** | `balanced` |
| **Characters** | Theo Mensah, Harrison Brooks, Amina Hassan, Li Wei, Aarav Patel, Bella Alvarez, Seraphis |
| **Output** | ~385 character images + storyboard frames |

```bash
cd "/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/backend"
source .venv/bin/activate
python3 ../scripts/run_lost_compass.py
```

Output tree:
```
scripts/output/lost_compass/
  storyboard/project.json
  characters/<id>/  (same structure as above, ~55 images per character)
```

---

### `run_distance_between_us.py` — romance/drama demo

Contemporary long-distance romance. 3 characters, 17 scenes, ~46 frames.

| | |
|---|---|
| **Render style** | `bw_sketch` |
| **Director style** | `intimate` |
| **Characters** | Emma Clarke, Kai Tanaka, Lucas Ferreira |
| **Output** | ~165 character images + storyboard frames |

```bash
cd "/Users/ruonaclinton/Documents/Personal Doc/BaseBoardAI/backend"
source .venv/bin/activate
python3 ../scripts/run_distance_between_us.py
```

Re-run only Stage 3 (storyboard images) using a saved `project.json`:

```bash
python3 ../scripts/run_distance_between_us.py --stage3
```

Output tree:
```
scripts/output/distance_between_us/
  storyboard/project.json
  storyboard/frames/s01_f001.png … (per-frame PNGs)
  characters/<id>/  (same structure, ~55 images per character)
```

---

### What each script does

Every script runs the same 3-stage pipeline:

| Stage | What happens |
|---|---|
| **Stage 1** — LLM extraction | Sends story + characters + world to WatsonX/Gemini → extracts characters, environments, and storyboard scenes. Saves `project.json`. |
| **Stage 2** — Character packages | For each character: portrait, 5-view turnaround, 9 expressions, 7 poses, 7 outfits, props, 360° turnaround, premium poses, material closeups. |
| **Stage 3** — Storyboard images | Generates one image per storyboard frame via the active `IMAGE_PROVIDER`. Saves PNGs and updates `project.json`. |

A live progress bar is printed during image generation:
```
  [████████░░░░░░░░] 8/16
```

If the backend is not running, the script exits immediately with:
```
✗ Cannot reach backend at http://localhost:8000 — is uvicorn running?
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
├── baseboard                    # one-command backend launcher (run from anywhere)
├── backend/app/
│   ├── core/
│   │   ├── config.py            # Centralised env config
│   │   ├── prompts.py           # CHARACTER, WORLD, STORYBOARD prompt templates
│   │   ├── llm.py               # WatsonX orchestration + 4-model fallback chain
│   │   ├── image.py             # Image generation — Pollinations / Gemini / HF
│   │   ├── ai_factory.py        # Provider-agnostic Text / Image / Vision factory
│   │   ├── prompt_builder.py    # Director Engine — style prefixes, upgrade pipeline
│   │   ├── director_engine.py   # Shot-type + lens assignment per frame
│   │   ├── shot_balancer.py     # Composition diversity scoring + rebalancing
│   │   ├── identity_system.py   # Character DNA + CKG + scene continuity
│   │   ├── continuity_engine.py # Frame impact detection on edits
│   │   └── visual_qa.py         # Gemini Vision anatomy audit + Visual DNA tokens
│   ├── db/
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   └── session.py           # DB session + init_db()
│   ├── routers/storyboard.py    # All FastAPI endpoints
│   ├── schemas/storyboard.py    # All Pydantic v2 schemas (robust LLM coercions)
│   └── main.py                  # FastAPI app entry point
│
└── frontend/src/
    ├── index.html               # Theme bootstrap script — dark-mode default, no FOUC
    ├── index.css                # BMS motion system + .no-transition FOUC guard
    ├── api/storyboard.ts        # All API calls + SSE stream client
    ├── components/
    │   ├── FrameCard.tsx        # ↺ Regenerate: rewrites direction + reforges image
    │   └── …                    # ThemeToggle, UpgradeStyleMenu, SceneContinuityPanel…
    ├── pages/
    │   ├── StudioPage.tsx       # Collapsible Inspector panel (animated, 260 → 28 px)
    │   └── …                    # Genesis, Library, CharacterPackage…
    ├── types/storyboard.ts      # TypeScript types mirroring backend schemas
    ├── types/renderUpgrade.ts   # Style presets and tier labels
    └── data/demoProject.ts      # Pre-baked demo project
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
