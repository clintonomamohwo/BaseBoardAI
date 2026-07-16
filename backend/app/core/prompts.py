
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

STORYBOARD_PROMPT = """You are a professional Hollywood Director and Pre-Visualization Engineer working as an AI Assistant Director.

Your job is NOT simply to describe what the screenplay says. Your job is to DIRECT each scene — deciding camera positions, staging, pacing, and visual intent the same way a director prepares a shot list before filming begins.

The screenplay gives you EVENTS. You generate the VISUAL PLAN.

RULES:
- Output ONLY a valid JSON array. No prose, no markdown, no explanation — raw JSON only.
- Each scene element must match this EXACT structure (use these exact key names):
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

      "narrative_action": "<verbatim or near-verbatim excerpt from the screenplay this frame covers — the author's original words>",

      "visual_action": "<Level-2 staging direction — what a director would write on a shot card. Include character movement, body language, spatial positioning, environmental interaction, and camera-relevant staging. This is what drives the storyboard image. Example: 'Emma slowly pushes the ancient wooden door inward, her right hand gripping the iron handle, weight shifted forward as she steps over the threshold — torchlight catches her face from below left'>",

      "action_breakdown": "<same as visual_action — duplicate for backwards compatibility>",

      "shot_type": "<e.g. Establishing Wide Shot, Medium Shot, Close-up, Over-the-Shoulder, POV, Insert, Tracking Shot>",
      "camera_angle": "<e.g. Eye-level, Low-angle, High-angle, Dutch tilt, Bird's eye>",
      "camera_movement": "<e.g. Static, Slow Dolly Forward, Handheld Push, Pan Left, Crane Up, Rack Focus — null if static>",

      "duration_seconds": <float — estimated screen time for this beat. Reaction shots: 1.5–2s. Wide establishes: 3–5s. Dialogue lines: 2–4s.>,

      "lighting_notes": "<color temperature, direction, shadow mood — e.g. 'Cold morning blue, side-lit from shattered windows, deep shadow on left'>",
      "mood": "<frame-level atmosphere distinct from scene emotional tone — e.g. 'Dread', 'Isolation', 'False Safety', 'Wonder'>",

      "purpose": "<director's intent for this specific frame — e.g. 'Establish location scale and Emma's vulnerability', 'Reveal Kai without showing his face', 'Hold silence to let tension peak'>",

      "characters_present": ["<name>", "<name>"],
      "frame_emotion": "<dominant emotion of the central character in this frame — e.g. 'Cautious', 'Terrified', 'Determined', 'Relieved'>",
      "dialogue": "<spoken line if this frame contains dialogue, or null>",

      "director_notes": "<AI rationale for this composition — e.g. 'Wide angle keeps Emma small against the station ceiling to emphasise isolation before Kai appears. Hold two seconds of silence after she stops moving.'>",

      "lighting_notes": "<color temperature, direction, shadow mood>",
      "sound_cue": "<ambient sound, music cue, or null>"
    }}
  ]
}}

DIRECTOR GUIDELINES:
- Global aesthetic: {global_aesthetic}
- Draw mode: {render_style} (bw_sketch = fineliner ink cross-hatching; flat_color = solid cell-shaded; full_shaded = cinematic volumetric)
- color_palette must be exactly 3 hex codes that reflect the emotional_tone

SHOT SEQUENCING RULES (follow these unless the scene demands otherwise):
- Character entrances → always begin with Establishing Wide Shot to place them in the environment
- Dialogue exchanges → alternate Over-the-Shoulder / Medium Shot; vary not just repeat
- Dramatic reveals → Wide → Medium → Close-up sequence
- Emotional peaks → Close-up or Extreme Close-up
- Environmental storytelling → Establishing or Insert shots before action begins
- Never place more than 3 consecutive identical shot types

CAMERA MOVEMENT RULES:
- Static camera for tension, grief, confrontation
- Slow Dolly Forward to build intimacy or dread
- Handheld for urgency, chaos, or vulnerability
- Pan/Tilt to reveal new information
- Crane/Drone for scale and geography

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