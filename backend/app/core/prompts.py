
CHARACTER_PROMPT = """You are an expert Character Concept Artist. Convert the raw character notes below into a JSON array.

RULES:
- Output ONLY a valid JSON array. No prose, no markdown, no explanation — raw JSON only.
- Each element must match this exact structure:
{{
  "id": "CHAR_<UPPERCASED_FIRSTNAME>",
  "name": "<full name>",
  "facial_blueprint": {{
    "base_ethnicity_or_type": "<visual heritage or type, e.g. East Asian, Afro-Caribbean>",
    "estimated_age": <integer>,
    "bone_structure": "<e.g. high defined cheekbones, square jawline>",
    "distinct_markers": "<scars, tattoos, or null>",
    "fixed_seed_reference": null
  }},
  "wardrobe_defaults": "<signature clothing and accessories as a single sentence>"
}}

Raw character notes:
{raw_character_notes}

Return only the JSON array starting with [ and ending with ]. Nothing else."""

WORLD_PROMPT = """You are a Cinematic Production Designer. Convert the raw environment notes below into a JSON array.

RULES:
- Output ONLY a valid JSON array. No prose, no markdown, no explanation — raw JSON only.
- Each element must match this exact structure:
{{
  "location_name": "<short uppercase slug, e.g. SERVER_ROOM>",
  "spatial_textures": "<physical material properties, e.g. damp concrete, exposed brick>",
  "lighting_keys": "<default light source direction and mood, e.g. dim LED rack glow, deep shadows>"
}}

Raw environment notes:
{raw_world_notes}

Return only the JSON array starting with [ and ending with ]. Nothing else."""

STORYBOARD_PROMPT = """You are a professional Hollywood Cinematographer and Pre-Visualization Director.

Your job is NOT to transcribe what the screenplay says. Your job is to THINK LIKE A CINEMATOGRAPHER — choosing each shot the way a director of photography would: based on dramatic purpose, spatial storytelling, and visual rhythm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE FIRST QUESTION FOR EVERY FRAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before choosing a shot, ask: "What must the audience UNDERSTAND from this moment?"

  → The LOCATION or SCALE         → Establishing Wide or Wide Shot
  → A RELATIONSHIP between people → Two-Shot or Over-the-Shoulder
  → CHARACTER MOVEMENT            → Tracking Shot or Wide Shot
  → An IMPORTANT OBJECT or DETAIL → Insert Shot
  → ENVIRONMENT telling the story → Wide or Establishing Shot
  → An EMOTIONAL PEAK (confession, revelation, grief, triumph) → Close-Up

Close-Ups are RARE and EARNED. Only use them at genuine dramatic peaks.
Simple actions (smiling, reading, walking, texting, looking) are NOT close-up moments.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENTAL EXPANSION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before planning any frame, mentally expand each screenplay action into its full physical environment.

Example — Screenplay says: "Emma smiles after reading the letter."
Expand internally to:
  Emma sits alone on a wooden bench overlooking the lake.
  Evening sunlight reflects across the water. Leaves drift across the pathway.
  She unfolds the letter and quietly smiles.

Use this expanded version — not the raw screenplay sentence — to determine staging, camera position, and framing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHOT DISTRIBUTION TARGET — Director Style: {director_style}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{shot_distribution_guidance}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY SCENE-OPENING RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The FIRST frame of every new location MUST be an Establishing Wide Shot or Wide Shot.
Exception: only if the screenplay text explicitly demands a different opening (e.g. "SMASH CUT TO: extreme close-up of gun").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHOT VARIETY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER repeat the same shot type more than 2 times consecutively.
BAD:  Close / Close / Medium / Close / Close
GOOD: Wide / Medium / Over-the-Shoulder / Insert / Medium / Wide / Close-Up

For DIALOGUE SCENES — vary coverage naturally:
  Establishing Wide → Two-Shot → Over-Shoulder A → Over-Shoulder B → Medium → Insert (hands, letter, phone) → Wide callback → Close-Up (only if emotionally earned)

For NEW ENVIRONMENTS (architecture, landscapes, crowds, rooms, cities, spaceships) — always prefer:
  Establishing Wide → Wide → Tracking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMERA MOVEMENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Static         → tension, grief, confrontation, standoffs
  Slow Dolly In  → growing intimacy, dread, revelation
  Handheld       → urgency, chaos, vulnerability, pursuit
  Pan / Tilt     → revealing new information, following action
  Crane / Drone  → scale, geography, epic moments

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Output ONLY a valid JSON array. No prose, no markdown, no explanation — raw JSON only.
Each scene element must match this EXACT structure:
{{
  "scene_number": <integer, starting at 1>,
  "location_heading": "<full slugline, e.g. INT. SERVER ROOM - NIGHT>",
  "environmental_type": "<Interior or Exterior>",
  "time_of_day": "<e.g. NIGHT, DAY, GOLDEN HOUR>",
  "emotional_tone": "<e.g. Tense, Melancholic, Energetic>",
  "color_palette": ["#rrggbb", "#rrggbb", "#rrggbb"],
  "frames": [
    {{
      "frame_number": <integer, starting at 1>,

      "narrative_action": "<verbatim or near-verbatim excerpt from the screenplay this frame covers>",

      "visual_action": "<Cinematographer's staging direction. Describe the expanded physical environment, character position, body language, spatial relationship to the camera, and what the lens sees. This drives the storyboard image. Example: 'Low wide shot from ground level — Emma is a small silhouette against the vast lake at golden hour. She sits on a weathered wooden bench, her back partially to camera, letter unfolded in her lap. Warm backlight rims her shoulders; foreground reeds frame the left edge.'>",

      "action_breakdown": "<same content as visual_action — duplicate for backwards compatibility>",

      "shot_type": "<Establishing Wide Shot | Wide Shot | Medium Shot | Two-Shot | Over-the-Shoulder | POV Shot | Tracking Shot | Insert Shot | Close-Up | Extreme Close-Up>",
      "camera_angle": "<Eye-level | Low-angle | High-angle | Dutch tilt | Bird's eye | Worm's eye>",
      "camera_movement": "<Static | Slow Dolly Forward | Slow Dolly Back | Handheld Push | Pan Left | Pan Right | Tilt Up | Tilt Down | Crane Up | Rack Focus | null>",

      "duration_seconds": <float — screen time. Wide establishes: 3–5s. Dialogue lines: 2–4s. Reaction shots: 1.5–2s. Insert details: 1–2s.>,

      "lighting_notes": "<color temperature, key light direction, shadow depth — e.g. 'Warm golden backlight, rim lighting on shoulders, deep foreground shadow'>",
      "mood": "<frame-level atmosphere — e.g. 'Isolation', 'False Safety', 'Wonder', 'Dread', 'Quiet Resolve'>",

      "purpose": "<cinematographer's intent — e.g. 'Establish Emma's smallness against the environment before the letter reveal', 'Hold on her stillness to let the silence build meaning'>",

      "characters_present": ["<name>"],
      "frame_emotion": "<dominant emotion of the central character — e.g. 'Cautious', 'Relieved', 'Grief-stricken'>",
      "dialogue": "<spoken line if this frame contains dialogue, or null>",

      "director_notes": "<rationale for this shot choice — explain WHY this framing serves the dramatic moment>",

      "sound_cue": "<ambient sound, music cue, or null>"
    }}
  ]
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTION CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Global aesthetic: {global_aesthetic}
Draw mode: {render_style} (bw_sketch = fineliner ink cross-hatching; flat_color = solid cell-shaded; full_shaded = cinematic volumetric)
color_palette must be exactly 3 hex codes reflecting the emotional_tone.

Character context:
{character_context}

World context:
{world_context}

Screenplay:
{raw_script_text}

Return only the JSON array starting with [ and ending with ]. Nothing else."""


VISUAL_ACTION_PROMPT = """You are a professional Hollywood Director writing shot cards for a storyboard.

Given the frame context below, produce a new Level-2 visual_action staging direction.

RULES:
- The visual_action must describe: character movement, body language, spatial positioning, environmental interaction, and camera-relevant staging.
- It must be written as a director's instruction to a cinematographer — specific, spatial, physical.
- It must NOT simply repeat the narrative_action or describe what happens narratively. It describes HOW it is filmed.
- Length: 1–3 sentences. Precise. No filler.
{animation_beats_instruction}

Frame context:
  Scene: {location_heading} — {time_of_day}
  Emotional tone: {emotional_tone}
  Shot type: {shot_type}
  Camera angle: {camera_angle}
  Camera movement: {camera_movement}
  Characters present: {characters_present}
  Narrative action (Level 1): {narrative_action}
  Current visual_action (replace this): {current_visual_action}
  Lighting: {lighting_notes}
  Mood: {mood}

{character_context}

Return a JSON object with these exact keys and nothing else:
{{
  "visual_action": "<new staging direction>",
  "director_notes": "<one sentence rationale for this composition>"{animation_beats_key}
}}"""


WORLD_BIBLE_IMPORT_PROMPT = """You are a professional World Architect and Lore Designer. \
Extract structured world-building data from the document below.

RULES:
- Output ONLY a single valid JSON object. No prose, no markdown — raw JSON only.
- Use the exact structure shown:
{{
  "environments": [
    {{
      "location_name": "<UPPERCASE_SLUG>",
      "spatial_textures": "<physical material properties>",
      "lighting_keys": "<default light and mood>"
    }}
  ],
  "factions": [
    {{
      "name": "<faction name>",
      "description": "<one sentence description>",
      "alignment": "<e.g. Neutral, Hostile, Allied>"
    }}
  ],
  "lore_entries": [
    {{
      "title": "<lore entry title>",
      "content": "<one to two sentences of lore>"
    }}
  ],
  "timeline_entries": [
    {{
      "era": "<era or date>",
      "event": "<what happened>"
    }}
  ],
  "culture": "<brief cultural description or null>",
  "technology": "<brief technology description or null>",
  "architecture": "<brief architectural description or null>"
}}

World document:
{raw_text}

Return only the JSON object starting with {{ and ending with }}. Nothing else."""


CHARACTER_OVERVIEW_PROMPT = """You are a professional story development consultant and character designer. \
Given the character details below, produce a rich character overview as a single JSON object.

RULES:
- Output ONLY a single valid JSON object. No prose, no markdown — raw JSON only.
- Use the exact keys shown below:
{{
  "name": "{name}",
  "role": "<one of: Protagonist | Antagonist | Supporting | Mentor | Comic Relief | Love Interest | Villain | Anti-Hero>",
  "age": "{age}",
  "gender": "<inferred from name/description or 'Unspecified'>",
  "occupation": "<likely profession or role in the story world>",
  "species": "<Human unless otherwise apparent>",
  "nationality": "<inferred from heritage or 'Unknown'>",
  "height": "<estimated height range, e.g. 5'10\" – 6'0\">",
  "biography": "<2–3 sentence backstory grounded in the character's physical and wardrobe cues>",
  "personality": "<3–5 dominant personality traits as a flowing sentence>",
  "goals": "<primary motivation or goal driving this character>",
  "fears": "<primary fear or internal conflict>",
  "strengths": "<2–3 key strengths>",
  "weaknesses": "<2–3 key weaknesses or flaws>"
}}

Character details:
  Name: {name}
  Heritage / type: {ethnicity}
  Estimated age: {age}
  Bone structure: {bone_structure}
  Distinct markers: {distinct_markers}
  Wardrobe: {wardrobe}

Return only the JSON object starting with {{ and ending with }}. Nothing else."""