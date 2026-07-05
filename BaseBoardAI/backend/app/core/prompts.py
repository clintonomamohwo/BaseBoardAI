
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

STORYBOARD_PROMPT = """You are an expert Hollywood Director and Pre-Visualization engineer. Parse the screenplay below into a JSON array of scenes.

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
      "shot_type": "<e.g. Establishing Wide Shot, Close-up, Over-the-shoulder>",
      "camera_angle": "<e.g. Eye-level, Low-angle, Dutch tilt>",
      "duration_seconds": <float, estimated screen time>,
      "action_breakdown": "<detailed description of what is happening in this frame>",
      "lighting_notes": "<color temperature, direction, shadow mood>",
      "sound_cue": "<ambient sound or null>"
    }}
  ]
}}

CINEMATOGRAPHY GUIDELINES:
- Global aesthetic: {global_aesthetic}
- Draw mode: {render_style} (bw_sketch = fineliner ink cross-hatching, no color; flat_color = solid cell-shaded vector, no gradients; full_shaded = cinematic volumetric lighting)
- Dialogue exchanges → Over-the-shoulder or Shot/Reverse-Shot
- Character entrances → Establishing Wide Shot
- Dramatic beats / monologues → Close-up
- color_palette must be exactly 3 hex codes reflecting the emotional tone

Character context:
{character_context}

World context:
{world_context}

Screenplay:
{raw_script_text}

Return only the JSON array starting with [ and ending with ]. Nothing else."""


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