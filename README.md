# BaseBoard AI
<p align="center">
  <img src="logo transparent.png" width="200">
</p>

> *Where Stories Become Worlds.*

**BaseBoard AI** is a cinematic pre-visualization platform that transforms a screenplay, novel, or story document into a fully produced storyboard — complete with a locked character bible, scene-by-scene world map, AI-generated frame imagery, and a character relationship graph — in under a minute.

Built on IBM watsonx AI + Google Gemini, React 19, and FastAPI.

---

## Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- One of:
  - An [IBM watsonx](https://www.ibm.com/watsonx) account with a Project ID and API key *(for text/LLM)*
  - A [Google Gemini](https://aistudio.google.com/app/apikey) API key *(for text, vision, and image generation)*

> **Tip:** The default setup uses **WatsonX for text** (characters, world bible, storyboard planning) and **Google Gemini for images and vision** — you need both keys for the full experience. Pollinations.ai is the zero-config fallback for images and requires no key.

---

### 1. Clone the Repository

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
```

---

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
# ── Provider routing ──────────────────────────────────────────────────────
# TEXT_PROVIDER:   watsonx | gemini
TEXT_PROVIDER=watsonx

# IMAGE_PROVIDER:  pollinations | gemini | huggingface
# pollinations = free, no API key required (recommended for getting started)
# gemini       = higher quality, requires GEMINI_API_KEY
IMAGE_PROVIDER=pollinations

# VISION_PROVIDER: gemini (only option — required for anatomy audit)
VISION_PROVIDER=gemini

# ── IBM watsonx ───────────────────────────────────────────────────────────
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=meta-llama/llama-3-3-70b-instruct

# ── Google Gemini ─────────────────────────────────────────────────────────
# Get your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image

# ── Pollinations (no key needed) ──────────────────────────────────────────
POLLINATIONS_WIDTH=768
POLLINATIONS_HEIGHT=512
```

Start the backend:

```bash
uvicorn app.main:app --reload
# API runs at  http://localhost:8000
# Auto-docs at http://localhost:8000/docs
```

---

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
# App runs at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

### Minimal Setup (Free, No API Key Required)

If you just want to try the app with zero credentials:

1. Set `IMAGE_PROVIDER=pollinations` in `.env` (no key needed)
2. Set `VISION_PROVIDER=gemini` and add your free Gemini key (free tier available at [aistudio.google.com](https://aistudio.google.com/app/apikey))
3. Set `TEXT_PROVIDER=gemini` and reuse the same Gemini key
4. Leave all WatsonX fields empty

Everything except WatsonX-specific model fallbacks will work on the free Gemini tier.

---

## What is BaseBoard AI?

BaseBoard AI is built for writers, directors, game designers, and creative teams who need to move from idea to visual production blueprint without an army of artists or weeks of pre-production.

You give it a screenplay or story document. It gives you back:

- A **locked character bible** with facial blueprints, wardrobe, story roles, and relationship graph
- A **world map** with location profiles, lighting keys, and spatial textures
- A **storyboard** with cinematographer-directed shot cards (shot type, camera angle, movement, lighting, mood, dialogue, director's rationale)
- **AI-generated frame images** for every shot
- A full **Character Package** for each character (portrait, turnaround, expressions, poses, outfits)

---

## Key Features

| Feature | Description |
|---|---|
| **3-Stage AI Pipeline** | Characters → World Bible → Storyboard, each validated by Pydantic schemas |
| **Genesis Engine** | Animated 12-task pipeline screen with per-stage live progress bars |
| **Director Engine** | AI cinematographer — assigns shot type, lens, camera movement, and lighting per frame |
| **Creative Knowledge Graph (CKG)** | Single source of truth for all AI generation — characters, species, variants, abilities |
| **Character DNA System** | 3-layer identity (who · what · how) — identity, species, physical form, variants |
| **Story Roles** | AI assigns Protagonist / Antagonist / Supporting / Other from script analysis |
| **Relationship Graph** | AI infers ally / enemy / romantic / mentor / family / neutral / rival from script interactions |
| **Character Package** | Auto-generated portrait, 5-view turnaround, expressions, poses, outfit sheets |
| **Visual QA Engine** | Gemini Vision audits every generated image for anatomy mutations, deformities, and continuity |
| **Visual DNA Token** | Gemini Vision describes a character's appearance as a reusable prompt prefix |
| **Continuity Engine** | Detects and flags frames affected by character or world edits |
| **Animatic Player** | Plays all storyboard frames as a sequential animatic with per-frame timing |
| **Vault Grid** | Gallery view of all generated frame images with lightbox |
| **Locked Cut Folder** | Pin and protect specific frames from pipeline re-runs |
| **Batch Export** | Export selected frames as PNG files or JSON |
| **Multi-Provider Images** | Pollinations (free) · Gemini Imagen · HuggingFace — switch via `.env` |
| **Multi-Provider Text** | IBM WatsonX (default) · Google Gemini — switch via `TEXT_PROVIDER` |
| **Model Fallback Chain** | WatsonX auto-retries through 4 models on 429 rate-limit |
| **4 Render Styles** | B&W Sketch · B&W Detailed · Flat Color · Full Shaded |
| **5 Director Styles** | Balanced · Cinematic · Dialogue · Action · Intimate |
| **Project Library** | Save, browse, load, and delete projects (SQLite persistence) |
| **World Bible** | Locations, factions, lore entries, timeline — importable from documents |
| **Dark / Light Theme** | Full dark-first theme with toggle |
| **Demo Project** | Instant demo — "The Lost Compass" Sci-Fi adventure, no upload required |

---

## Usage

### Creating a Project

1. Click **Enter Studio** on the landing page
2. Choose a creation method:
   - **Genesis Upload** — upload a PDF, DOCX, or TXT screenplay/story document
   - **Start Blank** — jump straight to the Studio's manual pipeline form
   - **Load from Library** — open a previously saved project
3. If using Genesis Upload: the **Genesis Engine** runs the full pipeline with a live 4-stage progress screen (Characters → World Bible → Storyboard → Images)
4. After the pipeline completes, the **Creative Director's Report** summarises what was found
5. Click **Enter Studio** to open the full workstation

### Working in the Studio

The Studio has three tabs:

**STORYBOARD** — 3-panel layout:
- Left: Scene Index (reorderable scene list)
- Centre: Storyboard Canvas (frame cards with generated images)
- Right: Studio Inspector (shot details, director notes, lens data, regeneration controls)

Additional views: Animatic Player · Vault Grid · Locked Cut Folder

**CHARACTERS** — Character Dictionary with:
- Filter by story role (Protagonist / Antagonist / Supporting / Other)
- Search by name or ID
- Expand any character for portrait, blueprint details, and relationship graph
- Open full **Character Package** for portrait · turnaround · expressions · poses · outfits

**WORLD BIBLE** — Location cards with:
- Sub-tabs: Locations · Factions · Lore · Artifacts · Timelines
- Import from a world bible document

### Character Dictionary

Each character card shows:
- **Story role badge** — colour-coded: gold (Protagonist), red (Antagonist), blue (Supporting)
- **Completion bar** — fills as Character Package sections are generated
- **Relationship panel** — expands to show all AI-inferred relationships with type badges:
  - 🟢 ally · 🔴 enemy · 🩷 romantic · 🟣 mentor · 🟠 family · 🟡 rival · ⬜ neutral

### Character Package

Click **✦ Full Package** on any character to open their dedicated production package:
- **Overview** — AI-generated biography, personality, goals, fears
- **Portrait** — hero portrait
- **Turnaround** — 5-view reference sheet (front / ¾ front / side / ¾ back / back)
- **Expressions** — facial expression sheet (neutral, happy, angry, sad, etc.)
- **Poses** — action pose library
- **Outfits** — outfit variant sheets
- **Props** — signature props and accessories

### World Bible

- Upload a `.pdf`, `.docx`, or `.txt` world document
- AI extracts: environments, factions, lore entries, timeline events
- Merge into an existing project or start fresh

---

## How It Works

### Pipeline Overview

```
User Input (screenplay / story text)
        │
        ▼
Stage 1 — Character Standardizer (WatsonX / Gemini)
   Extracts: id, name, facial_blueprint, wardrobe,
             story_role, relationships[]
        │
        ▼
Stage 2 — World Architect (WatsonX / Gemini)
   Extracts: location_name, spatial_textures, lighting_keys
        │
        ▼
Stage 3 — Storyboard Orchestrator (WatsonX / Gemini)
   Produces: scenes[] → frames[] with shot type, camera,
             lighting, mood, dialogue, director_notes
        │
        ▼
Director Engine
   Assigns: lens, focal_length, depth_style per frame
   Applies: shot distribution rules by director_style
        │
        ▼
Image Generation (Gemini / Pollinations / HuggingFace)
   Generates: one image per frame, base64-encoded
        │
        ▼
SQLite Persistence → StoryboardProject JSON → React Studio
```

### Character Identity System

Each character has three independent layers:

| Layer | What it is | Example |
|---|---|---|
| **Identity** (Layer 1) | Who — face, hair, eyes, body, accessories | "High cheekbones, silver scar above left eye" |
| **Species** (Layer 2) | What — anatomy type | Human, Elf, Wolf, Dragon, Robot |
| **Physical Form** (CKM) | Structure — body shape | Humanoid, Quadruped, Dragon, Hybrid |
| **Variants** (Layer 3) | How — appearance at a story point | Default, Battle Armor, Winter, Elf Form |

Story role and relationships are set automatically by the AI from script analysis:

- **Story Role:** Protagonist · Antagonist · Supporting · Other
- **Relationships:** ally · enemy · romantic · mentor · family · neutral · rival

### AI Models

| Task | Default | Alternative |
|---|---|---|
| Character extraction | WatsonX (Llama 3.3 70B) | Gemini (`TEXT_PROVIDER=gemini`) |
| World bible | WatsonX (Llama 3.3 70B) | Gemini (`TEXT_PROVIDER=gemini`) |
| Storyboard planning | WatsonX (Llama 3.3 70B) | Gemini (`TEXT_PROVIDER=gemini`) |
| Image generation | Pollinations (Flux) | Gemini (`IMAGE_PROVIDER=gemini`) |
| Vision / anatomy audit | Gemini Flash | — (only provider) |
| Visual DNA extraction | Gemini Flash | — (only provider) |

**WatsonX fallback chain** (on 429 rate-limit, tried in order):
1. `meta-llama/llama-3-3-70b-instruct` (primary)
2. `mistralai/mistral-small-3-1-24b-instruct-2503`
3. `mistralai/mistral-medium-2505`
4. `mistral-large-2512`

### REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/storyboard/forge-pipeline-stream` | Full pipeline with SSE progress stream |
| `POST` | `/storyboard/forge-pipeline` | Full pipeline, single blocking response |
| `GET`  | `/storyboard/projects` | List all saved projects |
| `GET`  | `/storyboard/projects/{id}` | Load a single project |
| `DELETE` | `/storyboard/projects/{id}` | Delete a project |
| `POST` | `/storyboard/parse-single-character` | Parse a single character from raw notes |
| `POST` | `/storyboard/generate-image` | Generate a single image |
| `POST` | `/storyboard/character-qa` | Visual QA audit on a generated image |
| `POST` | `/storyboard/reforge-composition` | Regenerate a single frame's image |
| `POST` | `/storyboard/regenerate-visual-action` | AI re-writes a frame's staging direction |
| `POST` | `/storyboard/continuity-scan` | Scan which frames are affected by an edit |
| `POST` | `/storyboard/world-bible-import` | Import world bible from document text |
| `GET`  | `/health` | Provider status check |

Full interactive docs: `http://localhost:8000/docs`

---

## Project Structure

```
BaseBoardAI/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # All env vars — single import point
│   │   │   ├── prompts.py         # CHARACTER, WORLD, STORYBOARD prompt templates
│   │   │   ├── llm.py             # WatsonX LLM orchestration + fallback chain
│   │   │   ├── image.py           # Image generation — Pollinations / Gemini / HF
│   │   │   ├── ai_factory.py      # Provider-agnostic factory (Text / Image / Vision)
│   │   │   ├── prompt_builder.py  # Director Engine prompt assembly
│   │   │   ├── director_engine.py # Shot-type + lens assignment per frame
│   │   │   ├── identity_system.py # Character DNA + species + abilities system
│   │   │   ├── continuity_engine.py # Frame impact detection on character edits
│   │   │   ├── visual_qa.py       # Gemini Vision anatomy audit
│   │   │   ├── sheet_layouts.py   # Character package sheet grid layouts
│   │   │   └── sheet_slicer.py    # Crop individual cells from a sheet image
│   │   ├── db/
│   │   │   ├── models.py          # SQLAlchemy ORM models
│   │   │   └── session.py         # Database session + init_db()
│   │   ├── routers/
│   │   │   └── storyboard.py      # All FastAPI endpoints
│   │   ├── schemas/
│   │   │   └── storyboard.py      # All Pydantic v2 schemas
│   │   └── main.py                # FastAPI app entry point + CORS
│   ├── .env.example               # Environment template — copy to .env
│   └── requirements.txt           # Python dependencies
│
└── frontend/
    └── src/
        ├── api/
        │   └── storyboard.ts      # All API calls + SSE stream client
        ├── components/            # Reusable UI components
        ├── pages/                 # Full-page views (Studio, Genesis, Library…)
        ├── types/
        │   └── storyboard.ts      # TypeScript types — mirrors backend schemas
        ├── data/
        │   └── demoProject.ts     # Pre-baked demo project (no upload needed)
        ├── hooks/                 # useDirectorsLight, useCompassNeedle, etc.
        └── utils/                 # exportFrames, extractDocumentText
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy |
| **Database** | SQLite (zero-config, file-based) |
| **LLM — Text** | IBM WatsonX (Llama 3.3 70B) · Google Gemini |
| **LLM — Images** | Google Gemini (`gemini-3.1-flash-lite-image`) · Pollinations (Flux) · HuggingFace |
| **LLM — Vision** | Google Gemini (`gemini-3.5-flash`) |
| **LangChain** | WatsonX LLM client integration |
| **HTTP** | HTTPX (async-compatible, used for Pollinations) |
| **Streaming** | Server-Sent Events (SSE) for pipeline progress |

---

## Architecture Deep Dive

### The Director Engine

Every storyboard frame passes through the Director Engine after the LLM generates the raw JSON. The engine:

1. **Classifies the scene** — action / dialogue / establishing / intimate
2. **Applies shot distribution rules** — based on the chosen `director_style` (balanced / cinematic / dialogue / action / intimate)
3. **Assigns a lens profile** — 24mm (epic wide), 35mm (dynamic action), 50mm (natural dialogue), 85mm (intimate portrait), 100mm (detail insert)
4. **Writes a depth style** — deep focus / shallow / split
5. **Stores rationale** — so the Studio Inspector can show *why* each shot was chosen

The Cinematic Brain only overwrites fields that are not locked. If the user locks `shot_type` via the Inspector, the Director Engine skips it on re-run.

### The Creative Knowledge Graph (CKG)

The CKG is the single source of truth stored alongside every saved project. It contains:

- `approved_characters` — name, appearance summary, canonical prompt, wardrobe, age
- `character_identities` — detailed identity per character (Layer 1)
- `character_species` — anatomy type per character (Layer 2)
- `character_variants` — appearance variants per character (Layer 3)
- `character_abilities` — abilities that influence Director Engine shot selection
- `locations` — environment profiles
- `relationships` — character relationship graph
- `style_guide`, `color_palette`, `camera_language`, `visual_rules`

Every image generation call reads from the CKG to anchor character appearance. This is what prevents the AI from "forgetting" what a character looks like across scenes.

### Provider Routing

Three independent provider axes — each switchable in `.env` with no code changes:

```
TEXT_PROVIDER   = watsonx | gemini
IMAGE_PROVIDER  = pollinations | gemini | huggingface
VISION_PROVIDER = gemini
```

If `IMAGE_PROVIDER=gemini` and Gemini image generation fails (rate limit, quota), the pipeline automatically falls back to Pollinations so no frames are lost.

---

## Troubleshooting

### Backend won't start
- Ensure `.env` exists: `cp .env.example .env`
- Ensure virtual environment is activated: `source .venv/bin/activate`
- Check Python version: `python3 --version` (needs 3.11+)

### "Cannot reach the backend"
- Ensure `uvicorn app.main:app --reload` is running in the `backend/` directory
- Check the API is healthy: `curl http://localhost:8000/health`

### Gemini errors — "This model is no longer available to new users"
- Your API key was created after Google retired older model names
- Current working models for free tier accounts: `gemini-3.5-flash` (text/vision), `gemini-3.1-flash-lite-image` (images)
- Update your `.env`: `GEMINI_TEXT_MODEL=gemini-3.5-flash`, `GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image`

### Gemini 429 quota errors
- Free tier daily quota exhausted — resets every 24 hours
- Switch `IMAGE_PROVIDER=pollinations` to use unlimited free image generation while quota recovers
- Or enable billing on your Google account at [console.cloud.google.com](https://console.cloud.google.com)

### WatsonX 429 rate limit
- The fallback chain automatically tries 4 models before failing — this is expected behaviour
- If all 4 models are exhausted, switch `TEXT_PROVIDER=gemini` as a temporary alternative

### Images are blank or None
- Check `IMAGE_PROVIDER` in `.env`
- For Gemini: verify `GEMINI_API_KEY` is set and quota is not exhausted
- For Pollinations: check internet connectivity (it's a public free API, occasionally slow)

---

## License

MIT — see [LICENSE](LICENSE) for details.
