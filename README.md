<p align="center">
  <img src="logo transparent.png" width="180" alt="BaseBoard AI logo">
</p>

<h1 align="center">BaseBoard AI</h1>
<p align="center"><em>Where Stories Become Worlds.</em></p>

---

## What it does

BaseBoard AI helps turn an early story idea or an existing draft into a visual production plan. You can develop and revise the writing first, then build character and world references, plan shots, review storyboard frames, preview an animatic, and export the project.

The workflow is meant to keep the creator in control: generated outlines, scripts, characters, world details, and frames can be reviewed and revised.

## Create a project

Start in either of two ways:

- **Develop an idea:** enter a premise, a target format (free text), optional notes, and an optional genre. Generate an editable outline, revise it, then draft and revise a script from that version. If genre is left blank, the story remains genre-open rather than being assigned a genre.
- **Bring existing material:** upload a PDF, DOCX, TXT, Final Draft (`.fdx`), or Markdown file, use a story template, or start with a blank project.

The idea-to-script flow is genre-neutral by default; the selected format and your notes guide the outline and script conventions.

## From script to storyboard

The visual-planning pipeline develops a production blueprint from the script:

1. **Character planning** extracts character profiles, appearances, roles, and relationships.
2. **World planning** builds a world bible from locations and their environmental details, including spatial and lighting cues.
3. **Shot planning** organizes the story into scenes and storyboard frames with action, shot type, camera angle and movement, lighting, mood, dialogue, timing, and continuity notes.
4. **Draft frames** generate storyboard images using the configured draft image provider and selected visual style.
5. **Review and continuity** let you approve individual frame versions. Shots can depend on approved earlier shots as visual continuity references; changes to a referenced shot can flag dependent shots for review.
6. **Animatic** plays the storyboard sequence using its per-frame timing, with playback and scrubbing controls.
7. **Production Pack** downloads the project as a ZIP for handoff or further work.

The character and world information form a shared visual canon for generation, helping keep recurring characters and locations consistent across shots.

## Frame images and usage

Storyboard images use the configured draft image provider. The example configuration uses Pollinations and low-cost draft models; image-generation usage may still consume provider credits, and pricing or availability can change. Check the provider's current terms and model pricing before use.

A higher-cost option is available for selected frames only:

- **Nano Banana 2.1** renders one chosen storyboard frame and can use its current image as a visual reference.
- It is an explicit, per-frame paid action, not the default draft route.
- The backend disables premium generation by default. To enable it, set `ENABLE_PREMIUM_IMAGE_GENERATION=true` in `backend/.env` and provide a server-side Gemini API key. The frame card labels the action **“Render this frame with Nano Banana 2.1 · Paid.”**
- Charges, if any, are billed by the relevant provider under its current pricing and account terms.

## Production Pack export

The Production Pack is a ZIP containing:

- `project.json` — project, story-development material, canon, characters, scenes, shot details, and review states.
- `shots.csv` — a tabular shot list with camera, action, dialogue, timing, and continuity fields.
- `manifest.json` — versioned pack metadata, asset inventory, and counts.
- `images/` — available storyboard frame images.

Approved and pending shots are both included, with their review state recorded. If a frame image is missing, the pack records it in the manifest so the omission is visible.

## Local setup

### Requirements

- Python 3.11 or newer
- Node.js and npm (use a current Node.js LTS release compatible with Vite 8)
- A Gemini API key for Gemini text generation and Gemini-powered vision features

### Configure the backend

Clone the repository and create a local environment file:

```bash
git clone https://github.com/clintonomamohwo/BaseBoardAI.git
cd BaseBoardAI
cp backend/.env.example backend/.env
```

Edit `backend/.env` for the Gemini text setup used by this project:

```dotenv
TEXT_PROVIDER=gemini
GEMINI_TEXT_MODEL=gemini-3.5-flash-lite
IMAGE_PROVIDER=pollinations
VISION_PROVIDER=gemini
```

Add your own Gemini API key to `backend/.env`. Keep credentials there: `backend/.env` is ignored by Git and secrets must not be committed or copied into documentation. The checked-in `.env.example` lists the supported provider variables and is a template; change its provider/model values as needed for your setup.

For the optional paid Nano Banana 2.1 frame render, also set:

```dotenv
ENABLE_PREMIUM_IMAGE_GENERATION=true
GEMINI_NANO_BANANA_MODEL=gemini-nano-banana-2.1
```

Do not enable this option unless you intend to use the paid render action. Premium generation also requires the Gemini API key on the backend.

### Start the app

From the repository root, start the backend:

```bash
./baseboard
```

On first run, the launcher creates a Python virtual environment and installs backend dependencies. If `backend/.env` does not exist, it copies `.env.example` there and exits so you can edit the configuration; run `./baseboard` again after setup.

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (typically `http://localhost:5173`). The API runs at `http://localhost:8000`; its interactive docs are at `http://localhost:8000/docs`.

## Main technologies

- **Frontend:** React, TypeScript, Vite
- **Backend:** FastAPI, Python, Pydantic, SQLAlchemy
- **Project storage:** SQLite
- **Text and vision:** provider-configurable Gemini and WatsonX integrations; the documented local setup uses Gemini 3.5 Flash-Lite for text
- **Images:** configurable draft generation, with an explicit Gemini Nano Banana 2.1 premium frame-render option

Provider settings live in `backend/.env`; no source-code changes are needed to change supported providers.
