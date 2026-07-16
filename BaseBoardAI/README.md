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

1. **Upload** — The user drops a screenplay, novel, script, game design document, or Markdown file (PDF, DOCX, TXT, FDX, or `.md`) onto the **New Project** screen. Three creation paths exist: Upload Story, Use Template (downloads a structured Markdown scaffold), or Start Blank.
2. **Genesis Engine** — The platform extracts the full document text client-side and runs it through a three-stage IBM watsonx AI pipeline. A 12-card animated progress screen shows each analysis step completing in real time.
3. **Director Engine** — Before any image is generated, the Director Engine analyzes the full storyboard output, enforces shot composition diversity, assigns cinematic lenses per frame, and enriches every frame with production metadata (mood, purpose, camera movement, dialogue, director notes).
4. **Creative Director's Report** — When the pipeline completes, an AI-generated summary card shows detected genre, estimated runtime, scene count, character count, emotional themes, and unique locations — before the user even enters the Studio.
5. **Compass Navigation** — A gold compass interface allows navigation between the four studio sections (Storyboard, Characters, World Bible, Inspector).
6. **Studio** — The main editing environment presents a three-column layout: Scene Index (left), Storyboard Canvas (centre), and Studio Inspector (right). Users browse scenes, review and lock individual frames, open the Animatic Player to preview the visual sequence, and export their cut as a production ZIP.
7. **Production Sheet** — Every frame card expands to reveal a full production sheet: Narrative Action (Level 1 — author's words), Visual Action (Level 2 — AI staging), Camera Movement, Lens, Lighting, Mood, Purpose, Characters Present, Frame Emotion, Dialogue, Sound Cue, Director's Notes, and Animation Beats (Level 3).
8. **Action Timeline** — A collapsible per-scene beat sheet below the frame grid shows running timestamps, shot type distribution, and dialogue indicators across all frames.
9. **Character Dictionary** — A searchable list of every character in the production bible, each expandable to reveal their facial blueprint, estimated age, bone structure, distinct markers, and AI-generated portrait. One click opens the full **Character Package** suite.
10. **World Bible** — Every detected location listed with its emotional tone, color palette, environmental type, time-of-day descriptor, and all storyboard frames that were shot there — with a clickable lightbox gallery and ZIP download.

### Key Features

- **Genesis Engine** — One-click full pipeline: characters → world → storyboard → Director Engine → images
- **Three-Stage LLM Pipeline** — Sequential IBM watsonx inference: Character Standardizer → World Architect → Storyboard Orchestrator (Hollywood Director persona)
- **Director Engine** — Cinematic planning layer between LLM output and image generation: shot balancing, lens assignment, rhythm enforcement, continuity tracking
- **Shot Balancer** — Tracks 10 shot-type categories (Wide, Medium, Close, Extreme Close, OTS, POV, Drone, Tracking, Insert, Establishing), computes a Composition Diversity Score, and injects missing shot types when any category exceeds its threshold
- **Lens Planner** — 13 focal length profiles mapped to scene type and shot category (24mm Anamorphic for establishing shots, 85mm Portrait for intimate close-ups, 35mm Tracking for action, etc.)
- **Continuity Engine** — Scans the entire project for dependency impact when any canonical asset changes; surfaces affected frames, character references, and environments before regeneration
- **Three-Level Action System** — `narrative_action` (author's words, read-only) / `visual_action` (AI staging, independently regeneratable) / `animation_beats` (granular cues for Maya/Unreal)
- **Regenerate Visual Action** — Regenerate only the Level-2 staging direction for a single frame without touching the image
- **Director's Notes** — AI rationale for every compositional choice, displayed in a gold-tinted callout on each frame's production sheet
- **Asset Locking** — `is_manual_override` flag on frames prevents artist-uploaded artwork from being overwritten on re-run; `locked_fields` at the Director Engine level protects face, outfit, environment, camera, and lighting independently
- **Automatic LLM Fallback** — On 429 rate-limit, the backend automatically walks a chain of four watsonx models until one succeeds
- **AI Frame Image Generation** — Every storyboard frame gets a generated thumbnail via Pollinations.ai (Flux model) or Hugging Face Inference API
- **Reference Style Image (img2img)** — Users upload a visual reference; all frame images are generated via img2img with configurable strength
- **Three Render Styles** — B&W Sketch (sparse line art), Flat Color (cel-shaded), and Full Shaded (cinematic volumetric)
- **Character Package System** — Complete character reference suite: portrait, 5-angle turnaround, 9 expressions, 7 poses, 7 outfits, props, 360° premium turnaround, premium poses, material close-ups
- **Character Package Versions** — Version history tracked per character package; users can roll back to any previous generated state
- **Character Relationship Graph** — Visual SVG node graph of inter-character relationships (ally, enemy, romantic, mentor, family, rival) derived from shared scenes
- **LLM Character Overview** — AI-generated biography, personality, goals, fears, strengths, weaknesses, occupation, nationality, and role for every character
- **Character Import Scanner** — Step-by-step animated analysis workflow when importing external character artwork (portrait, expressions, poses, outfits, props, metadata)
- **Continuity Impact Modal** — Before any canonical asset change regenerates frames, shows the exact list of affected storyboards, character references, and environments with a YES/NO confirmation
- **Global Update Panel** — Dependency-aware impact summary for any multi-asset update; lets creators choose to update all, selectively, or skip
- **Gallery Lightbox** — Full-screen scene gallery with keyboard navigation across all rendered frames in a scene
- **Action Timeline** — Per-scene collapsible beat sheet: running timestamps, colour-coded shot track, dialogue indicators
- **Locked Cut** — Users flag individual frames to build a curated export selection
- **Batch ZIP Export** — Export selected frames as PNG files + a production manifest Markdown file
- **Animatic Player** — Step through frames with action descriptions and sound cues
- **Studio Re-run** — Re-execute the pipeline with a different render style or global aesthetic without re-uploading the script; artist overrides are preserved
- **Project Library** — Persisted project list loaded from the backend database
- **Compass Navigation** — Gold compass interface for navigating between Storyboard, Characters, World Bible, and Inspector
- **BMS — BaseBoard Motion System** — "Modern Heritage" motion design (Director's Light, Focus Motion, Brass Reflection, Inspector micro-animations, AI Pipeline animations, Import Scanner staggered reveals)
- **Idle State Animations** — Cinematic ambient animations activate after 10 seconds of user inactivity
- **Dark / Light Theme** — System-aware with persistent localStorage preference
- **Drag & Drop Upload** — PDF, DOCX, TXT, FDX, and Markdown extracted client-side before sending to backend
- **Cinematic UI** — Film-grain overlay, gold compass navigation, idle-state animations, pulse effects
- **Downloadable Story Template** — Structured Markdown format optimised for Genesis Engine accuracy
- **Per-frame and per-scene JSON export** — Download raw structured data for any character or location

---

## Cinematic Director Engine — Problem & Solution

### The Problem: AI Storyboards Are Cinematically Repetitive

The first version of BaseBoard generated storyboards that were visually functional but cinematically flat. The root cause is structural: Large Language Models and diffusion models share the same compositional bias. When asked to illustrate a scene without explicit visual direction, both systems independently gravitate toward the same answer — a medium-close-up of the speaking character.

The result is a storyboard that looks like this:

```
Frame 01 — Medium Close-Up, Emma at doorway
Frame 02 — Medium Close-Up, Kai responds
Frame 03 — Medium Close-Up, Emma reacts
Frame 04 — Medium Close-Up, Kai advances
```

This is not a storyboard. It is a transcript illustrated with the same camera position twelve times in a row.

**Specific failures observed:**

| Issue | Root Cause |
|---|---|
| 70–80% of frames were medium or close shots | LLM defaults to dialogue framing because most training data is dialogue-heavy |
| No establishing shots injected automatically | The model had no mechanism to plan shot sequences across a scene |
| No lens or focal length information | Prompts requested shot types, not optics |
| Character changes propagated nowhere | Each frame was generated independently with no memory of prior assets |
| No director rationale recorded | Compositional choices were opaque — the system could not explain why it picked a shot |

### The Solution: Separate Directing from Generating

The fix is architectural. Generating an image and *directing* an image are two different cognitive tasks. We separated them completely.

**Before:**

```
Script Text → Single LLM Prompt → [shot_type, action, image]
```

Every frame received the same single-pass treatment. The LLM was being asked to simultaneously parse narrative, plan cinematography, maintain continuity, and describe an image — all in one prompt. It failed at all four.

**After:**

```
Script Text
    │
    ▼
Narrative Parser          — What happens in the story?
    │
    ▼
Director Engine           — How do we photograph this?
    ├── Shot Balancer      — Tracks composition distribution across all frames
    ├── Lens Planner       — Assigns focal length per scene type
    └── Continuity Engine  — Propagates character/asset changes across the project
    │
    ▼
Prompt Builder            — Assembles a cinematography-aware generation prompt
    │
    ▼
Image Generator           — Generates only; receives a fully-formed brief
```

**How each component solves a specific failure:**

#### Shot Balancer
Replaces the implicit "whatever the LLM chooses" distribution with a weighted scoring system across ten shot types: Wide, Medium, Close, Extreme Close, OTS, POV, Drone, Tracking, Insert, and Establishing.

A **Composition Diversity Score** is computed for the entire storyboard. If any single shot type exceeds its threshold — for example, Close shots exceeding 40% of a scene — the Shot Balancer forces the next frames toward underrepresented types. The model no longer decides the distribution; the Director Engine does.

Example balanced output:
```
Wide            18%
Medium          35%
Close           39%
Extreme Close    8%
```

#### Lens Planner
Every frame receives an explicit cinematic lens recommendation before image generation begins. The LLM no longer has to infer focal length from context — it is told directly.

```
Establishing shot     →  24mm Anamorphic
Dialogue              →  50mm
Intimate / emotional  →  85mm Portrait
Action / kinetic      →  35mm Tracking
Epic / environment    →  18mm Ultra Wide
```

This gives the image model a concrete optical constraint that produces distinctly different depth-of-field, compression, and spatial relationships in the output.

#### Scene-Type Profiles
The Director Engine auto-detects scene category (Dialogue, Action, Romance, Horror, Mystery, Fantasy, Sci-Fi, Adventure) and applies the corresponding preferred composition ratios. A dialogue scene and an action sequence now have different shot budgets enforced before a single frame is generated.

#### Continuity Engine
Character and world changes no longer exist in isolation. When a character's appearance changes — hair colour, costume, age — the Continuity Engine scans the entire project for every frame, character reference, poster, and promotional asset that contains that character and surfaces the full impact list before regeneration begins.

The user sees:
```
Emma — hair changed from Black → White

Affected assets:
  18 Storyboard frames
   6 Character references
   2 Posters
   1 Cover
   3 Promotional images

Regenerate all affected assets? YES / NO
```

Only impacted assets are regenerated. Nothing else changes.

#### Three-Level Action System
The original `action_breakdown` field was doing the work of three distinct concepts simultaneously. We split it:

| Level | Field | Owner | Purpose |
|---|---|---|---|
| 1 | `narrative_action` | Author | Verbatim script description — locked, never AI-modified |
| 2 | `visual_action` | Director Engine | AI-directed staging — the primary image-driving field, independently regeneratable |
| 3 | `animation_beats` | Future (Maya / Unreal) | Granular timing cues — empty until requested |

Level 2 can be regenerated without touching the image, and the image can be regenerated without touching Level 2. They are decoupled.

#### Creative Knowledge Graph (CKG)
Every project maintains an authoritative node graph — the **Creative Knowledge Graph (CKG)** — that every AI generation consults before producing output. It is the single source of truth for everything BaseBoard knows about a project.

The CKG is structured, not flat. It separates creative facts into typed nodes:

```
CreativeKnowledgeGraph
├── character_identities    — WHO each character is (face, proportions, reference images)
├── character_species       — WHAT each character is (anatomy + QA rules)
├── character_variants      — HOW each character looks at each story point
├── expression_sheets       — per-character expression reference images
├── pose_libraries          — per-character pose reference images
├── outfit_libraries        — per-character outfit reference images
├── world_bible_summary     — condensed lore for prompt injection
├── locations               — location slug → EnvironmentProfile
├── style_guide             — render style + aesthetic rules
├── camera_language         — scene_type → preferred shot distribution
├── director_profile        — 'Kubrickian symmetry', 'Handheld verité', etc.
└── visual_rules            — hard constraints: ['no dutch angle in dialogue']
```

### What Changed in the Codebase

| Module | Responsibility |
|---|---|
| `backend/app/core/director_engine.py` | Orchestrates cinematic planning — pacing analysis, lens progression, rhythm, balance |
| `backend/app/core/shot_balancer.py` | Maintains composition distribution statistics, injects missing shot types |
| `backend/app/core/lens_planner.py` | 13 focal length profiles mapped to scene type and shot category |
| `backend/app/core/continuity_engine.py` | Scans project for dependency impact when any canonical asset changes |
| `backend/app/core/identity_system.py` | Character Identity System — `build_identity_prompt()` and `compute_qa_score()` |
| `backend/app/core/prompt_builder.py` | 8-step assembly: CKG identity → species → variant → style → lens → action → lighting → negatives |
| `backend/app/core/image.py` | Image generation only — no longer responsible for any compositional decisions |
| `backend/app/core/prompts.py` | `STORYBOARD_PROMPT` rewritten as a Hollywood director persona; `VISUAL_ACTION_PROMPT` added for Level-2 regeneration |

The Director Engine is extensible by design. Director presets, camera movement planning, shot list optimization, and animatic timing can all plug into the same orchestration layer without touching the image generation pipeline.

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

### Four-Stage Pipeline

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

Stage 3 — Storyboard Orchestrator (Hollywood Director persona)
  Input:  characters + environments (as JSON context) + raw_script_text
  Prompt: STORYBOARD_PROMPT — Hollywood director persona, injects
          character and world context, applies cinematography rules,
          enforces shot sequencing, outputs per-frame three-level actions,
          camera movement, mood, purpose, dialogue, director_notes
  Output: list[ScriptSceneBase]

Stage 4 — Director Engine (post-LLM, pre-image)
  Input:  list[ScriptSceneBase] from Stage 3
  Steps:  Detect scene type → Apply composition profile →
          Shot Balancer (diversity enforcement) →
          Lens Planner (focal length per frame) →
          Rhythm check (no N consecutive identical shots)
  Output: Enriched list[ScriptSceneBase] with lens, focal_length,
          depth_style, and rebalanced shot_types
```

### Prompt Engineering

All three LLM prompts enforce strict JSON-only output with no prose wrapping. The response parser strips markdown code fences and falls back to regex extraction of the first `[...]` or `{...}` block if a model prepends prose despite instructions. Temperature is set to `0.2` with greedy decoding for reliable, consistent structured output.

A dedicated `VISUAL_ACTION_PROMPT` handles Level-2 staging regeneration independently — it takes a single frame's context (scene, characters, shot type, lens) and returns a new `visual_action` + `director_notes` without touching the image.

### Image Generation

All generated images are stored as self-contained `data:image/png;base64,...` strings — no external URLs, no cross-origin fetching in the browser. The image module has three dispatch branches:

1. **bw_sketch + reference** → img2img with sketch constraints injected and `strength=0.78`
2. **other style + reference** → img2img with `strength=0.55`
3. **no reference** → text-to-image

Style prefixes are prepended to every prompt to enforce the correct visual register (line art, cel-shaded, or cinematic) regardless of scene content. The Prompt Builder assembles each prompt in 8 steps: base description + render style prefix + lens/optics + character tokens + environment textures + mood/lighting + camera movement + continuity anchors.

### REST API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/storyboard/forge-pipeline` | Run full Genesis Engine pipeline |
| `GET` | `/storyboard/` | List all saved projects |
| `GET` | `/storyboard/{db_id}` | Load a specific project |
| `DELETE` | `/storyboard/{db_id}` | Delete a project |
| `POST` | `/storyboard/generate-image` | Generate a single image from a prompt |
| `POST` | `/storyboard/character-package/overview` | Generate LLM character biography |
| `POST` | `/storyboard/character-package/generate` | Generate character package sections |
| `POST` | `/storyboard/character-package/generate-one` | Regenerate a single package section |
| `POST` | `/storyboard/character-package/generate-full-pack` | Generate premium pack (360°, premium poses, material close-ups) |
| `POST` | `/storyboard/continuity/scan` | Scan project for continuity impact of an asset change |
| `POST` | `/storyboard/frame/reforge-composition` | Regenerate only the image for a frame |
| `POST` | `/storyboard/frame/regenerate-visual-action` | Regenerate only the Level-2 staging (no image change) |
| `POST` | `/storyboard/world-bible/import` | Import a World Bible document |

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

The application uses a view-state machine pattern in [`App.tsx`](frontend/src/App.tsx): a single `AppView` union type controls which top-level component renders (`landing`, `compass`, `new-project`, `genesis-running`, `report`, `studio`, `library`). Project state (`StoryboardProject`) is held at root level and passed down via props. A `GenesisState` intermediate holds file + title + render style while the pipeline is running. An idle timer (10 seconds of no mouse/keyboard activity) triggers ambient BMS animations across the UI.

### Performance Optimisations

- `generated_image_url` columns are `deferred` in SQLAlchemy — excluded from `SELECT *` on list queries and loaded only when a specific project is fetched, preventing large base64 blobs from being transmitted on the project library screen.
- Document text extraction uses dynamic imports (`import('pdfjs-dist')`, `import('mammoth')`) so heavy parsing libraries are code-split and loaded only when a file is uploaded.
- Image generation is non-fatal — failures return `None` and the pipeline continues, ensuring a partial storyboard is always returned even if an image service is unavailable.
- Character Package images are fetched lazily per tab: only the sections the user navigates to are requested from the backend.
- `reforgeAffectedFrames` runs all affected frame regenerations in parallel via `Promise.all`, minimising total wait time for continuity propagation.

---

## Why This Matters in the Context of Racing

Racing — whether on a circuit, in a startup, or in creative production — is fundamentally about the gap between position and potential. The fastest teams are not necessarily the ones with the best raw talent; they are the ones who iterate the fastest. A Formula 1 team that can simulate a tyre strategy in twenty minutes has a structural advantage over one that takes two hours — not because their engineer is smarter, but because they have more attempts per race weekend.

Pre-visualization works the same way. The first storyboard is never the final storyboard. Directors revise, producers cut scenes, editors restructure sequences. Every revision cycle that requires waiting for an artist slows the race. Baseboard AI removes the bottleneck: when a director wants to see the same scene shot in three different render styles, or wants to test how a sequence reads with a completely different visual aesthetic, they can re-run the pipeline in under two minutes rather than commissioning new artwork.

The platform also compresses the **idea-to-decision window** — the time between having a creative thought and being able to evaluate it visually. That compression is where creative races are won. Teams that can evaluate ten visual directions per hour will always outpace teams that can evaluate one per week. Baseboard AI does not just make individual steps faster; it changes the velocity at which creative decisions can be made.

---

## Project Structure

```
baseboard/
└── BaseBoardAI/
    ├── backend/                  Python / FastAPI
    │   ├── app/
    │   │   ├── main.py           FastAPI app entry point, CORS, lifespan
    │   │   ├── core/
    │   │   │   ├── config.py           Pydantic-settings env loader
    │   │   │   ├── llm.py              IBM watsonx orchestration + 3-stage pipeline + fallback chain
    │   │   │   ├── image.py            Image generation (Pollinations / HF), t2i + img2img
    │   │   │   ├── prompts.py          All LLM prompt templates (STORYBOARD, VISUAL_ACTION, etc.)
    │   │   │   ├── director_engine.py  Cinematic planning orchestrator (post-LLM, pre-image)
    │   │   │   ├── shot_balancer.py    10-type composition scoring + diversity enforcement
    │   │   │   ├── lens_planner.py     13 focal length profiles mapped to scene/shot type
    │   │   │   ├── continuity_engine.py Asset change → dependency scan → impact list
    │   │   │   └── prompt_builder.py   8-step cinematography-aware prompt assembly
    │   │   ├── db/
    │   │   │   ├── models.py     SQLAlchemy ORM models (all new Director Engine fields included)
    │   │   │   └── session.py    SQLite / Postgres session factory
    │   │   ├── routers/
    │   │   │   └── storyboard.py All REST endpoints (13 routes)
    │   │   └── schemas/
    │   │       └── storyboard.py Pydantic v2 request/response schemas (three-level action system)
    │   ├── requirements.txt
    │   ├── .env.example
    │   └── baseboard.db          SQLite database (auto-created on first run)
    │
    └── frontend/                 React 19 / TypeScript / Vite
        └── src/
            ├── App.tsx           View-state machine (7 views), idle timer, BMS Director's Light
            ├── api/
            │   └── storyboard.ts All fetch calls (13 endpoints + continuity helpers)
            ├── hooks/
            │   ├── useDirectorsLight.ts  BMS-1: ambient light tracking across the app
            │   ├── useCompassNeedle.ts   BMS-2: cursor-driven compass needle rotation
            │   └── useBrassReflection.ts BMS-4: specular reflection on brass UI elements
            ├── pages/
            │   ├── LandingPage.tsx             Entry screen with idle animations
            │   ├── CompassNavPage.tsx           Gold compass navigation between studio sections
            │   ├── NewProjectPage.tsx           3-path creation: Upload / Template / Blank
            │   ├── GenesisUploadPage.tsx        File upload zone + render style selector
            │   ├── GenesisEnginePage.tsx        12-task animated pipeline progress screen
            │   ├── CreativeDirectorReport.tsx   Post-pipeline summary before Studio
            │   ├── StudioPage.tsx               Main 3-column editor (storyboard view)
            │   ├── CharacterDictionaryPage.tsx  Character list + inline edit + continuity scan
            │   ├── CharacterPackagePage.tsx     Full character reference suite (multi-tab)
            │   ├── WorldBiblePage.tsx           Location index + image upload + propagation
            │   └── ProjectLibraryPage.tsx       Saved project browser
            ├── components/
            │   ├── PipelineForm.tsx             Manual pipeline input form
            │   ├── StoryboardCanvas.tsx         Frame grid + BMS-3 cursor tracking + ActionTimeline
            │   ├── FrameCard.tsx                Frame card + Production Sheet + Regenerate Visual Action
            │   ├── ActionTimeline.tsx           Per-scene beat sheet with running timestamps
            │   ├── AnimaticPlayer.tsx           Frame-by-frame player
            │   ├── GalleryLightbox.tsx          Full-screen scene gallery with keyboard navigation
            │   ├── VaultGrid.tsx                Full-project image grid
            │   ├── LockedCutFolder.tsx          Selected frame export view
            │   ├── BatchExportBar.tsx           ZIP export controls
            │   ├── SceneIndex.tsx               Left-column scene list (drag-to-reorder)
            │   ├── StudioInspector.tsx          Right-column metadata panel
            │   ├── ContinuityImpactModal.tsx    Pre-regeneration impact confirmation dialog
            │   ├── GlobalUpdatePanel.tsx        Multi-asset dependency update panel
            │   ├── CharacterImportScanner.tsx   Step-by-step artwork import analyzer
            │   ├── RenderStyleSelector.tsx      Render style picker component
            │   ├── StyleReferenceUploader.tsx   Reference image upload for img2img
            │   ├── ConstellationLoader.tsx      Animated loading indicator
            │   ├── GraniteNotification.tsx      Toast notification system
            │   ├── ThemeToggle.tsx              Dark/light theme switcher
            │   ├── ShotPlanner.tsx              Per-frame shot planning UI
            │   ├── EmptyBlueprintState.tsx      Empty state for new projects
            │   ├── SceneList.tsx                Simplified scene list (legacy workspace)
            │   ├── FrameStream.tsx              Frame stream view (legacy workspace)
            │   └── InspectorPanel.tsx           Inspector panel (legacy workspace)
            ├── types/
            │   └── storyboard.ts       TypeScript interfaces (mirrors backend schemas exactly)
            └── utils/
                ├── extractDocumentText.ts  PDF/DOCX/TXT/FDX/MD extraction (dynamic imports)
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
3. Choose a creation path:
   - **Upload Story** — Drag and drop your screenplay, novel, or story document (PDF, DOCX, TXT, FDX, or Markdown), select a render style, and click **Analyse Script →**.
   - **Use Template** — Download a structured Markdown template, fill it in, and upload it — this produces the highest AI accuracy.
   - **Start Blank** — Opens the Studio with an empty project and the manual pipeline form.
4. Watch the Genesis Engine process 12 analysis tasks in real time.
5. Review the **Creative Director's Report** — genre, runtime estimate, character count, scene count, and detected themes.
6. Click **Enter Studio →**.

### Working in the Studio

- **Scene Index** (left column): Click any scene to load its frames on the canvas. Drag to reorder. Delete scenes you do not need.
- **Storyboard Canvas** (centre column): Each frame card shows the generated image, shot type, camera movement, duration, and visual action. Hover over a card to apply the BMS Focus Motion highlight. Click the image for a full-screen gallery lightbox. Use **▼ Full Sheet** to expand the complete production sheet per frame.
- **Action Timeline**: Click the **Action Timeline** toggle below the frame grid to reveal the per-scene beat sheet with running timestamps and dialogue indicators.
- **Regenerate Visual Action**: In any expanded production sheet, click **↺ Regenerate Visual Action** to get a new Level-2 staging direction without regenerating the image.
- **Studio Inspector** (right column): Scene metadata, color palette, emotional tone, lighting notes, and a reference image uploader for img2img generation.
- **Animatic Player**: Click the **Player** tab to step through frames with action breakdowns as captions.
- **Vault**: The **Vault** tab shows every frame in every scene in a gallery grid.
- **Locked Cut**: Toggle frames (★) to lock them, then open the **Locked Cut** tab to see your curated selection. Use **Batch Export** to download as a ZIP.
- **Re-run**: Click **↺ Re-run** to re-execute the pipeline with a new render style or aesthetic. All frames you've manually uploaded (artist overrides — marked ◈) are preserved.

### Character Dictionary

1. Navigate to the **CHARACTERS** tab in the top bar.
2. Each character is listed with an AI-generated portrait thumbnail (generated on first expand).
3. Click any character to expand their facial blueprint, wardrobe, and portrait.
4. Edit character fields inline — the Continuity Engine will automatically scan for affected frames and show the **Continuity Impact Modal** before regenerating.
5. Click **✦ Full Package** to open the Character Package suite.

### Character Package

On the Character Package screen, tabs provide access to:
- **Identity** — Upload up to 5 canonical reference images (Primary, Front, Left, Right, Back). BaseBoard extracts identity fields automatically from every upload. A single portrait is enough.
- **Overview** — LLM-generated biography, personality, goals, and fears.
- **Portrait** — Hero portrait image.
- **Turnaround** — 5-angle character sheet (front, ¾ front, side, ¾ back, back).
- **Expressions** — 9-state expression grid (neutral, happy, laughing, angry, sad, surprised, fearful, thinking, crying).
- **Poses** — 7 standard poses (standing, walking, running, sitting, pointing, holding object, hero pose).
- **Outfits** — 7 outfit variants (default, casual, formal, travel, combat, winter, summer).
- **Props** — Auto-detected prop references from wardrobe description.
- **Species** — Select the character's anatomy type (Human, Elf, Wolf, Dragon, Robot, Vampire, Custom). Species controls QA Engine anatomy validation and injects the appropriate prompt prefix.
- **Variants** — Manage appearance variants: Default, Battle Armor, Winter Outfit, Elf Form, Vampire Form, Future Version, or create custom variants. Each variant inherits the base identity — only outfit, hair, accessories, species, and age change.
- **Relationships** — SVG node graph of connections to other characters (ally, enemy, romantic, mentor, family, rival), derived from shared scene appearances.
- **Quality** — Visual QA Engine: overall confidence score (0–100%) and per-category breakdown (Identity, Species, Anatomy, Composition, Lighting, Props, Continuity). Run any time after generating an image.

Click **Full Pack** to generate the premium 360° turnaround (8 angles), premium poses (T-pose, A-pose, fighting stance, etc.), and material close-ups (face, hair, fabric, hands, eyes). All generated sections are version-tracked so you can roll back to any previous state.

### Character Identity System

BaseBoard separates a character into four independent layers that are always stored and evaluated independently:

| Layer | What it controls | Can it change? |
|---|---|---|
| **Identity** | Face, hair, eyes, body proportions, distinct markers, signature accessories, reference images | Never — immutable across all variants and styles |
| **Species** | Anatomy type, anatomy QA rules, prompt prefix | Per-variant (via species_override) |
| **Variants** | Outfit, hair override, accessories, species form, age | Per story point |
| **Rendering Style** | Artistic register (anime, sketch, painterly, realistic, 3D) | Freely switchable |

When you upload a reference photo, BaseBoard:
1. Stores it as the canonical identity reference for that view slot
2. Sends it through the LLM to extract structured identity fields (face, hair, eyes, distinct markers)
3. Updates the Creative Knowledge Graph so every future generation reads from the extracted identity
4. Runs the Visual QA Engine on any subsequently generated image to verify the identity was preserved

The identity layer is the only thing BaseBoard guarantees across art styles. A character in anime style, comic style, and realistic style should all look like the same person — the rendering changes, the identity does not.

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

**LLM JSON reliability** — Large language models do not always return pure JSON despite explicit instructions. The response parser in [`llm.py`](backend/app/core/llm.py) implements a two-pass strategy: strip markdown code fences first; if that fails, use a regex fallback to extract the first complete `[...]` or `{...}` block from the raw output. This handles models that prepend prose summaries before the JSON array.

**Model rate limiting** — IBM watsonx enforces consumption limits per model. Rather than failing the entire pipeline on a 429, the `_invoke_with_fallback` function walks a four-model chain (Llama 3.3 70B → Mistral Small 3.1 → Mistral Medium → Mistral Large) automatically. The fallback token detection is case-insensitive and also catches model deprecation errors (`"model_no_support_for_function"`, `"not supported"`, `"resource not found"`).

**Image generation consistency across styles** — Getting an image model to respect style directives (line art vs. cel-shaded vs. cinematic) without careful prompt engineering produces noisy results. The solution was style-prefix injection: a fixed prefix string for each render mode is prepended to every prompt before it is sent to the image provider. The `bw_sketch` mode additionally appends explicit negative constraints (no shading, no crosshatch, no color) and caps the combined prompt at 500 characters to stay within URL-length limits for the Pollinations GET endpoint.

**LLM compositional bias** — The Storyboard Orchestrator LLM, left to its own devices, generates 70–80% medium/close shots. The fix required introducing the Director Engine as a post-LLM planning layer that rebalances shot distributions before images are generated. This separated the concerns of "what happens narratively" from "how we photograph it" into distinct pipeline stages.

**Three-level action decoupling** — The original `action_breakdown` field conflated the author's intent (narrative), the director's plan (visual staging), and future animation cues into a single string. Splitting these into `narrative_action` / `visual_action` / `animation_beats` required schema migration, backwards-compatible ORM fields, and a separate `VISUAL_ACTION_PROMPT` that can regenerate only Level 2 without disturbing the source text or the image.

**Base64 data URLs for images** — Storing image URLs as external links creates cross-origin and availability problems. All generated images are converted to `data:image/png;base64,...` strings immediately on receipt and stored as TEXT in SQLite. The SQLAlchemy column is marked `deferred` so large blobs are not loaded on list queries — only when a specific project is fetched.

**CORS and Vite dev server** — FastAPI's default CORS handling does not include `OPTIONS` preflight responses for custom headers. Adding `CORSMiddleware` with explicit `allow_methods=["*"]` and `allow_headers=["*"]` resolved 405 errors on preflight requests from the Vite dev server.

**Tailwind v4 PostCSS integration** — Tailwind CSS v4 changed its PostCSS plugin path from `tailwindcss/nesting` to `@tailwindcss/postcss`. The `postcss.config.js` required updating to use the new package name.

**Client-side document extraction** — Heavy parsing libraries (pdfjs-dist, mammoth) would inflate the initial bundle if imported at module level. Both are dynamically imported inside their extraction functions, causing them to be code-split into separate chunks that are only fetched when the user first uploads a file.

---

## Future Improvements

- **Director Presets** — Named director styles (e.g. "Kubrick: wide symmetrical", "Nolan: intercutting timelines") that configure the Director Engine's shot profiles, lens preferences, and rhythm rules
- **Camera Movement Planning** — Extend `animation_beats` to include camera choreography (dolly path, crane arc, handheld shake intensity) exportable to Maya/Unreal
- **Shot List Export** — One-click export of the Director Engine's full shot plan as a production-ready PDF or CSV for physical production use
- **Animatic to Video** — Render the frame sequence as an MP4 with per-frame durations from the AI timing estimates
- **Comic / Graphic Novel Layout** — Alternative output renderer that arranges frames into comic page grids (2×3, 3×3, splash panels) instead of storyboard strips
- **Character Timeline** — Age-variant generation across key story stages (e.g. Age 12 → 18 → 32 → 65) with identity preservation across stages
- **World Bible Import** — Import DOCX, PDF, Markdown, Notion Export, or JSON to auto-populate locations, lore, timeline, factions, and architecture
- **Pose Library UI** — Visual pose picker (Standing, Walking, Running, Sitting, Jumping, Custom) so creators choose from a library instead of editing prompts manually
- **Emotion Library UI** — Per-character reusable emotion states (Happy, Sad, Angry, Fear, Confident, Neutral, Surprised) that update generation prompts without manual editing
- **Character Completion Score** — Visual progress indicator (e.g. 82%) tracking which package sections (portrait, turnarounds, expressions, outfits, props, relationships) have been generated
- **Character Consistency Score** — AI confidence score (Face / Hair / Body / Costume / Colors / Accessories) with a pre-generation warning if continuity may decrease
- **Real-time streaming** — Stream Genesis Engine stages via Server-Sent Events so the UI reflects actual pipeline progress rather than animated simulation
- **User authentication** — Multi-user support with per-user project libraries, using JWT or OAuth
- **Collaborative editing** — Real-time multi-user editing of scenes and frames (WebSocket-based)
- **PostgreSQL migration** — Swap from SQLite to PostgreSQL for production deployment (already supported via `DATABASE_URL` env var)
- **Version history** — Timeline of project re-runs with diffing between versions
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
