/**
 * demoProject — pre-baked sample StoryboardProject.
 *
 * Loaded instantly when the user clicks "▶ Demo Project" on the landing page.
 * No backend call, no file upload, no wait. Every field matches the live
 * StoryboardProject type so it flows through the full Studio experience.
 *
 * Story: "The Last Broadcast" — a one-act thriller set in an abandoned
 * radio station. Two characters, four scenes, sixteen frames.
 */

import type { StoryboardProject } from '../types/storyboard'

// Placeholder base64 — a 1×1 transparent PNG so generated_image_url is
// never null (keeps the image containers from showing the placeholder state).
// In a real demo you'd inline actual storyboard PNGs here.
const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export const DEMO_PROJECT: StoryboardProject = {
  db_id: null,
  project_title: 'The Last Broadcast',
  global_aesthetic: 'Cinematic High-Contrast Noir — deep shadows, cold blue moonlight, fractured neon',
  render_style: 'bw_sketch',
  canon: {
    approved_characters: {
      CHAR_MARA: {
        name: 'Mara',
        appearance_summary: 'Mara, Eastern European, age 34, sharp cheekbones angular jaw intense deep-set eyes, thin scar running from left temple to ear, wearing worn leather jacket dark turtleneck silver chain with a broken compass pendant',
        canonical_prompt: 'Mara, Eastern European, age 34, sharp cheekbones angular jaw intense deep-set eyes, thin scar running from left temple to ear, wearing worn leather jacket dark turtleneck silver chain with a broken compass pendant',
        wardrobe: 'Worn leather jacket, dark turtleneck, silver chain with a broken compass pendant',
        age: 34,
        distinct_markers: 'Thin scar running from left temple to ear',
      },
      CHAR_COLE: {
        name: 'Cole',
        appearance_summary: 'Cole, West African, age 41, broad forehead strong squared jaw calm steady eyes, close-cropped salt-and-pepper beard right ear has a small notch, wearing faded utility jacket with press credentials clipped to lapel dark trousers worn boots',
        canonical_prompt: 'Cole, West African, age 41, broad forehead strong squared jaw calm steady eyes, close-cropped salt-and-pepper beard right ear has a small notch, wearing faded utility jacket with press credentials clipped to lapel dark trousers worn boots',
        wardrobe: 'Faded utility jacket with press credentials clipped to lapel, dark trousers, worn boots',
        age: 41,
        distinct_markers: 'Close-cropped salt-and-pepper beard, right ear has a small notch',
      },
    },
    expression_sheets: {},
    pose_libraries: {},
    outfit_libraries: {},
    world_bible_summary: 'RADIO TOWER: derelict industrial steel structure, rust and chain-link, city glow on horizon (cold amber backlight at night)\nBROADCAST CONTROL ROOM: abandoned technical interior, banks of dead monitors, dust-covered consoles, fractured emergency lighting',
    style_guide: 'Render style: bw_sketch. Aesthetic: Cinematic High-Contrast Noir — deep shadows, cold blue moonlight, fractured neon.',
    color_palette: ['#0d1117', '#1a2332', '#c9a84c', '#2a3f55', '#0a0f1a', '#1e3050', '#8b0000'],
    camera_language: {
      dialogue: '50mm, OTS + medium, static or slow push',
      action: '35mm tracking, wide + medium, handheld',
      establishing: '24mm anamorphic, wide, slow crane or drone',
      intimate: '85mm portrait, extreme close-up, static',
    },
    director_profile: 'Noir Realist — Kubrick symmetry on wides, handheld intimacy on close-ups',
    visual_rules: [
      'Global aesthetic: Cinematic High-Contrast Noir',
      'Render style: bw_sketch — maintain consistency across all frames',
      'Character appearance must match approved_characters on every generation',
      'Never use dutch angle in dialogue scenes',
      'Always establish location before moving to character close-ups',
    ],
  },

  characters: [
    {
      id: 'CHAR_MARA',
      name: 'Mara',
      facial_blueprint: {
        base_ethnicity_or_type: 'Eastern European',
        estimated_age: 34,
        bone_structure: 'Sharp cheekbones, angular jaw, intense deep-set eyes',
        distinct_markers: 'Thin scar running from left temple to ear',
        fixed_seed_reference: 4821,
      },
      wardrobe_defaults:
        'Worn leather jacket, dark turtleneck, silver chain with a broken compass pendant',
    },
    {
      id: 'CHAR_COLE',
      name: 'Cole',
      facial_blueprint: {
        base_ethnicity_or_type: 'West African',
        estimated_age: 41,
        bone_structure: 'Broad forehead, strong squared jaw, calm steady eyes',
        distinct_markers: 'Close-cropped salt-and-pepper beard, right ear has a small notch',
        fixed_seed_reference: 7734,
      },
      wardrobe_defaults:
        'Faded utility jacket with press credentials clipped to lapel, dark trousers, worn boots',
    },
  ],

  scenes: [
    // ── Scene 1 — Exterior Arrival ──────────────────────────────────────────
    {
      scene_number: 1,
      location_heading: 'EXT. RADIO TOWER — NIGHT',
      environmental_type: 'Exterior — Industrial',
      time_of_day: 'Night',
      emotional_tone: 'Dread, Isolation',
      color_palette: ['#0d1117', '#1a2332', '#c9a84c', '#2a3f55'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'A derelict radio tower looms against a cloud-smothered sky.',
          visual_action:
            'Ultra-wide drone descending shot — the tower fills the left third of frame, city glow bleeds the horizon. Mara is a silhouette at the base gate.',
          animation_beats: [],
          action_breakdown:
            'Ultra-wide drone descending shot — the tower fills the left third of frame, city glow bleeds the horizon. Mara is a silhouette at the base gate.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Bird\'s Eye — descending',
          camera_movement: 'Slow Crane Down',
          duration_seconds: 4,
          lighting_notes: 'Backlit city smog, cold blue ambient, no direct source',
          mood: 'Foreboding',
          purpose: 'Establish location and isolation',
          characters_present: ['Mara'],
          frame_emotion: 'Resolute',
          dialogue: null,
          director_notes:
            'Opening on a wide establishes scale and loneliness. The descending movement implies arrival — we are coming down into this world.',
          sound_cue: 'Wind across steel cables. Distant city murmur.',
          generated_image_url: PLACEHOLDER,
          lens: '18mm Ultra Wide',
          focal_length: '18mm',
          depth_style: 'Deep focus — foreground gate sharp, tower sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Mara cuts the padlock. She glances back once.',
          visual_action:
            'Medium shot — Mara\'s hands working bolt cutters, face half-lit by her phone screen. Her glance back is over the shoulder, into darkness.',
          animation_beats: [],
          action_breakdown:
            'Medium shot — Mara\'s hands working bolt cutters, face half-lit by her phone screen. Her glance back is over the shoulder, into darkness.',
          shot_type: 'Medium',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 3,
          lighting_notes: 'Single cold phone screen light; rim light from distant streetlamp',
          mood: 'Tense',
          purpose: 'Establish character in action; hint at pursuit',
          characters_present: ['Mara'],
          frame_emotion: 'Cautious',
          dialogue: null,
          director_notes:
            'Medium keeps us close enough to read her hands and face simultaneously. The glance back plants paranoia without showing what she fears.',
          sound_cue: 'Metal snap of the padlock. Her breath.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Shallow — gate blurred behind her',
        },
        {
          frame_number: 3,
          narrative_action: 'She pushes through the gate and disappears into the tower complex.',
          visual_action:
            'Wide tracking shot — camera holds at the gate as Mara recedes down a concrete path toward the tower entrance. She is swallowed by shadow.',
          animation_beats: [],
          action_breakdown:
            'Wide tracking shot — camera holds at the gate as Mara recedes down the path, swallowed by shadow.',
          shot_type: 'Wide',
          camera_angle: 'Low',
          camera_movement: 'Static Hold',
          duration_seconds: 5,
          lighting_notes: 'Path lit only by fractured moonlight through chain-link',
          mood: 'Ominous',
          purpose: 'Close scene 1 on absence — she is now inside the unknown',
          characters_present: ['Mara'],
          frame_emotion: 'Determined',
          dialogue: null,
          director_notes:
            'Holding at the gate as she recedes gives the viewer a feeling of being left outside. We watch her go in rather than follow — creates distance and dread.',
          sound_cue: 'Gate clang behind her. Silence.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus',
        },
      ],
    },

    // ── Scene 2 — Interior Control Room ────────────────────────────────────
    {
      scene_number: 2,
      location_heading: 'INT. BROADCAST CONTROL ROOM — NIGHT',
      environmental_type: 'Interior — Abandoned Industrial',
      time_of_day: 'Night',
      emotional_tone: 'Tension, Discovery',
      color_palette: ['#0a0f1a', '#c9a84c', '#1e3050', '#8b0000'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'Banks of dead monitors. Mara sweeps her torch beam across the room.',
          visual_action:
            'Slow dolly forward — Mara\'s torchlight sweeps across rows of dark monitor screens, each reflecting her in miniature. Console dials frozen mid-broadcast.',
          animation_beats: [],
          action_breakdown:
            'Slow dolly forward — torchlight sweeps across dead monitors. Console dials frozen mid-broadcast.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Slow Dolly Forward',
          duration_seconds: 5,
          lighting_notes: 'Single torch beam cutting through dust; warm amber against cold metal',
          mood: 'Eerie Discovery',
          purpose: 'Establish interior location and its history',
          characters_present: ['Mara'],
          frame_emotion: 'Focused',
          dialogue: null,
          director_notes:
            'The dolly forward pulls the viewer into the space with Mara. The multiplied reflections of her in the dead monitors creates the unsettling sense she is being watched by her own past selves.',
          sound_cue: 'Creak of the building. Static hiss from a dead speaker.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus with anamorphic horizontal flare from torch',
        },
        {
          frame_number: 2,
          narrative_action: 'One monitor flickers on — a frozen frame of a broadcast, a face.',
          visual_action:
            'Insert — extreme close-up of a single monitor screen stuttering to life. A human face frozen mid-speech, distorted by scan lines.',
          animation_beats: [],
          action_breakdown:
            'Extreme close-up insert — monitor stutters to life, frozen face distorted by scan lines.',
          shot_type: 'Extreme Close-Up',
          camera_angle: 'Slightly Low — looking up at screen',
          camera_movement: 'Static',
          duration_seconds: 2,
          lighting_notes: 'Monitor glow only — cold white-blue light, hard shadows',
          mood: 'Shock',
          purpose: 'Inciting discovery — the mystery\'s first concrete image',
          characters_present: [],
          frame_emotion: null,
          dialogue: null,
          director_notes:
            'Cutting to an extreme close-up of the monitor isolates the discovery. No Mara in frame — this moment belongs entirely to the image, not her reaction.',
          sound_cue: 'Sharp electronic hum. Monitor buzz.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — monitor face razor sharp, surrounding consoles dissolve',
        },
        {
          frame_number: 3,
          narrative_action: 'Mara stares. She recognises the face.',
          visual_action:
            'Over-the-shoulder — monitor in soft focus background, Mara\'s face in sharp foreground, lit by the screen glow. Her expression shifts from confusion to recognition.',
          animation_beats: [],
          action_breakdown:
            'OTS — monitor in soft focus background, Mara\'s face lit by screen glow, expression shifts to recognition.',
          shot_type: 'OTS',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 4,
          lighting_notes: 'Monitor glow hitting Mara\'s face — cold blue key, no fill',
          mood: 'Recognition / Dread',
          purpose: 'Connect Mara emotionally to the discovery',
          characters_present: ['Mara'],
          frame_emotion: 'Shocked',
          dialogue: null,
          director_notes:
            'OTS bridges the close-up insert and keeps Mara present in the discovery. Keeping the monitor soft in background implies she is more important than what she is seeing — her reaction IS the story.',
          sound_cue: 'Her sharp intake of breath.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — Mara sharp, monitor dissolved',
        },
        {
          frame_number: 4,
          narrative_action: 'She whispers a name.',
          visual_action:
            'Extreme close-up — lips only, whispering. The monitor glow catches the moisture on her lip.',
          animation_beats: [],
          action_breakdown: 'Extreme close-up — lips only, whispering in monitor glow.',
          shot_type: 'Extreme Close-Up',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 2,
          lighting_notes: 'Monitor glow rim-lighting the lower face only',
          mood: 'Intimate / Devastating',
          purpose: 'Withhold the name from the audience — build mystery',
          characters_present: ['Mara'],
          frame_emotion: 'Grief',
          dialogue: '"Cole."',
          director_notes:
            'Staying on the lips rather than cutting to a reaction wide keeps the moment micro and devastating. The audience hears the name before seeing her full face — the reveal of her expression is saved for scene 3.',
          sound_cue: 'Her whisper. The monitor hum drops a pitch.',
          generated_image_url: PLACEHOLDER,
          lens: '135mm',
          focal_length: '135mm',
          depth_style: 'Razor shallow — lips only in focus',
        },
      ],
    },

    // ── Scene 3 — Confrontation ──────────────────────────────────────────────
    {
      scene_number: 3,
      location_heading: 'INT. BROADCAST CONTROL ROOM — CONTINUOUS',
      environmental_type: 'Interior — Abandoned Industrial',
      time_of_day: 'Night',
      emotional_tone: 'Confrontation, Revelation',
      color_palette: ['#0a0f1a', '#c9a84c', '#3d1010', '#2a4060'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'Cole steps from the shadows. He has been here the whole time.',
          visual_action:
            'Wide reveal — Cole materialises from the far shadow behind Mara. He was there in frame 1 and we never saw him. His silhouette fills the doorway.',
          animation_beats: [],
          action_breakdown:
            'Wide reveal — Cole steps from the shadows he was hiding in all along, filling the doorway behind Mara.',
          shot_type: 'Wide',
          camera_angle: 'Low — emphasise Cole\'s presence',
          camera_movement: 'Static',
          duration_seconds: 4,
          lighting_notes: 'Cole backlit by corridor — his face unlit, form only',
          mood: 'Shock / Revelation',
          purpose: 'Reverse the power dynamic — she is no longer alone',
          characters_present: ['Mara', 'Cole'],
          frame_emotion: 'Shock',
          dialogue: null,
          director_notes:
            'Wide shot for this reveal is essential — we need to see the spatial relationship: Cole behind, Mara at the monitors, the distance between them. A close-up would destroy the geography of the moment.',
          sound_cue: 'His deliberate footstep on a loose tile.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — both characters sharp',
        },
        {
          frame_number: 2,
          narrative_action:
            '"You weren\'t supposed to find this place," he says.',
          visual_action:
            'Medium close-up — Cole, face now catching monitor glow as he steps forward. Measured, calm. Press badge visible on his lapel.',
          animation_beats: [],
          action_breakdown:
            'MCU — Cole stepping into monitor glow. Calm. Press badge catches light.',
          shot_type: 'Medium Close-Up',
          camera_angle: 'Slight Low — looking up at Cole',
          camera_movement: 'Slow Push In',
          duration_seconds: 4,
          lighting_notes: 'Monitor glow key on his face — cold blue, no fill',
          mood: 'Menace / Authority',
          purpose: 'Establish Cole\'s control of the situation',
          characters_present: ['Cole'],
          frame_emotion: 'Controlled',
          dialogue: '"You weren\'t supposed to find this place."',
          director_notes:
            'Slow push-in adds pressure without cutting. The slight low angle gives Cole authority over Mara in this moment — he holds the information, she is reacting.',
          sound_cue: 'His voice, quiet and deliberate.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Shallow — Cole sharp, background dissolves',
        },
        {
          frame_number: 3,
          narrative_action: 'Mara turns slowly. Her hand moves to her jacket pocket.',
          visual_action:
            'Tight OTS from Cole\'s POV — Mara\'s hand reaching for her jacket pocket, her eyes locked on Cole over her shoulder.',
          animation_beats: [],
          action_breakdown:
            'Tight OTS from Cole\'s POV — Mara\'s hand moves to jacket pocket, eyes locked.',
          shot_type: 'OTS',
          camera_angle: 'High — Cole\'s eyeline',
          camera_movement: 'Static',
          duration_seconds: 3,
          lighting_notes: 'Mara rim-lit by monitor glow from front',
          mood: 'Standoff',
          purpose: 'Shift tension to physical threat — what is in her pocket?',
          characters_present: ['Mara', 'Cole'],
          frame_emotion: 'Defiant',
          dialogue: null,
          director_notes:
            'Moving into Cole\'s POV places the viewer in his position — we are watching Mara\'s hand with him. The audience becomes complicit in the standoff rather than neutral observer.',
          sound_cue: 'The soft brush of leather on fabric.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — Mara\'s face sharp, hand slightly soft',
        },
        {
          frame_number: 4,
          narrative_action:
            'She pulls out a USB drive. Holds it up. "I\'ve had it for six years."',
          visual_action:
            'Insert — the USB drive between Mara\'s fingers, the monitor reflection dancing across its surface.',
          animation_beats: [],
          action_breakdown: 'Insert — USB drive between fingers, monitor reflections on its surface.',
          shot_type: 'Insert',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 3,
          lighting_notes: 'Monitor glow reflected on the drive surface',
          mood: 'Revelation',
          purpose: 'The MacGuffin is revealed — everything changes',
          characters_present: ['Mara'],
          frame_emotion: 'Triumphant',
          dialogue: '"I\'ve had it for six years."',
          director_notes:
            'Pure insert — no face, no reaction, just the object. After three scenes of tension the MacGuffin must have its own frame. The reflections on its surface link it to the monitors and the frozen broadcast.',
          sound_cue: 'Silence. Then the monitor buzz cuts out entirely.',
          generated_image_url: PLACEHOLDER,
          lens: '100mm Macro',
          focal_length: '100mm',
          depth_style: 'Macro shallow — drive edge sharp, everything else dissolved',
        },
      ],
    },

    // ── Scene 4 — Escape ────────────────────────────────────────────────────
    {
      scene_number: 4,
      location_heading: 'EXT. RADIO TOWER — LATER',
      environmental_type: 'Exterior — Industrial',
      time_of_day: 'Pre-Dawn',
      emotional_tone: 'Resolution, Ambiguity',
      color_palette: ['#0d1117', '#c9a84c', '#1a2e45', '#3d2a0a'],
      frames: [
        {
          frame_number: 1,
          narrative_action:
            'Mara walks away from the tower alone. Dawn is a thin line on the horizon.',
          visual_action:
            'Wide tracking shot — Mara walking away from us, the tower receding behind her, the pre-dawn line just visible. Cole is nowhere.',
          animation_beats: [],
          action_breakdown:
            'Wide tracking — Mara walks away, tower recedes, pre-dawn horizon thin and gold.',
          shot_type: 'Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Slow Track Back',
          duration_seconds: 6,
          lighting_notes: 'Pre-dawn ambient; sky lightening behind tower',
          mood: 'Ambiguous Resolution',
          purpose: 'Mirror scene 1 — same tower, opposite direction, different Mara',
          characters_present: ['Mara'],
          frame_emotion: 'Exhausted / Resolved',
          dialogue: null,
          director_notes:
            'Mirroring the opening composition deliberately. Scene 1 she walked toward the tower; now she walks away. The camera retreating (rather than holding) implies the world widening back out — the story is not over.',
          sound_cue: 'Wind returning. Distant city waking.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — Mara sharp, horizon sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'She turns back once. The tower is dark.',
          visual_action:
            'Close-up — Mara\'s face in three-quarter profile, looking back. Pre-dawn light catching her scar. Then she faces forward and walks on.',
          animation_beats: [],
          action_breakdown:
            'Close-up — Mara three-quarter profile, pre-dawn catching her scar. She turns forward.',
          shot_type: 'Close-Up',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 4,
          lighting_notes: 'Pre-dawn cold key from the horizon; warm from behind (unseen city)',
          mood: 'Bittersweet',
          purpose: 'Character close — her interiority, her goodbye',
          characters_present: ['Mara'],
          frame_emotion: 'Grief / Acceptance',
          dialogue: null,
          director_notes:
            'Ending on a close-up after wide bookends grounds the entire film in her face. The scar — established in her character profile — catches light for the first time. The audience notices it now because they have been with her long enough to notice.',
          sound_cue: 'Silence. Then a single bird call.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — Mara sharp, tower dissolved in dawn haze',
        },
        {
          frame_number: 3,
          narrative_action: 'The tower stands alone. Somewhere inside, a light is on.',
          visual_action:
            'Final establishing wide — the tower alone, Mara gone. One window near the top glows amber. Cole.',
          animation_beats: [],
          action_breakdown:
            'Final wide — tower alone, one amber window glowing near the top. Cole is still inside.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Low',
          camera_movement: 'Slow Crane Up',
          duration_seconds: 7,
          lighting_notes: 'Pre-dawn sky; one warm amber window against cold structure',
          mood: 'Unresolved / Haunting',
          purpose: 'Final image — the mystery remains; Cole remains',
          characters_present: ['Cole'],
          frame_emotion: null,
          dialogue: null,
          director_notes:
            'The crane up on the final shot echoes the crane down of the opening — structural symmetry. The single amber window is the last question the film asks. We end on the building, not the person, because the place outlasts both of them.',
          sound_cue: 'Pre-dawn wind. Fade to silence.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus — full tower and sky sharp',
        },
      ],
    },
  ],
}
