/**
 * demoProject — pre-baked sample StoryboardProject.
 *
 * Loaded instantly when the user clicks "▶ Demo Project" on the landing page.
 * No backend call, no file upload, no wait. Every field matches the live
 * StoryboardProject type so it flows through the full Studio experience.
 *
 * Story: "The Lost Compass" — Sci-Fi Adventure set in Year 2248.
 * Four characters, seven scenes, futuristic megacities, ancient vaults.
 */

import type { StoryboardProject } from '../types/storyboard'

// Placeholder base64 — a 1×1 transparent PNG so generated_image_url is
// never null (keeps the image containers from showing the placeholder state).
const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export const DEMO_PROJECT: StoryboardProject = {
  db_id: null,
  project_title: 'The Lost Compass',
  global_aesthetic:
    'Futuristic Sci-Fi Adventure, Year 2248, Neo Cities with floating gardens and orbital transit gates, ancient ruins and underground vaults, anthropomorphic humanoid characters, cinematic wide establishing shots mixed with intimate character moments',
  render_style: 'flat_color',
  canon: {
    approved_characters: {
      CHAR_THEO: {
        name: 'Theo Mensah',
        appearance_summary:
          'Giant Tortoise Humanoid, broad-shouldered build, shell engraved with faint Cartographer sigils, dark green-brown shell, warm olive skin, age 28, wearing Systems Engineer uniform with Cartographer badge',
        canonical_prompt:
          'Giant Tortoise Humanoid male, broad-shouldered, shell engraved with Cartographer sigils, dark green-brown shell, warm olive skin, age 28, Systems Engineer uniform, Cartographer badge, flat color illustration',
        wardrobe: 'Systems Engineer uniform with Cartographer faction badge, bronze compass fragment on a chest strap',
        age: 28,
        distinct_markers: 'Shell engraved with faint glowing Cartographer sigils',
      },
      CHAR_HARRISON: {
        name: 'Harrison Brooks',
        appearance_summary:
          'Hare Humanoid, lean athletic build, white fur, age 24, always wearing a racing helmet visor pushed up on forehead, silver compass fragment clipped to racing jacket',
        canonical_prompt:
          'Hare Humanoid male, lean athletic build, white fur, age 24, racing helmet visor pushed up on forehead, silver compass fragment on racing jacket, flat color illustration',
        wardrobe: 'Professional hover racing jacket, racing helmet visor, silver compass fragment clipped to chest',
        age: 24,
        distinct_markers: 'Racing helmet visor always present, white fur, lean build',
      },
      CHAR_AMINA: {
        name: 'Amina Hassan',
        appearance_summary:
          'Black Panther Humanoid, sleek black fur, age 31, field archaeologist gear, silver ear studs, Atlas Key on belt, calm and analytical expression',
        canonical_prompt:
          'Black Panther Humanoid female, sleek black fur, age 31, field archaeologist gear, silver ear studs, ancient Atlas Key on belt, flat color illustration',
        wardrobe: 'Field archaeologist gear, utility vest, silver ear studs, Ancient Atlas Key on belt',
        age: 31,
        distinct_markers: 'Sleek black fur, silver ear studs, always carries the Atlas Key',
      },
      CHAR_BELLA: {
        name: 'Bella Alvarez',
        appearance_summary:
          'Deer Humanoid, warm brown fur, graceful build, age 26, combat medic uniform, Life Crystal glowing gold around neck',
        canonical_prompt:
          'Deer Humanoid female, warm brown fur, graceful build, age 26, combat medic uniform, glowing gold Life Crystal pendant around neck, flat color illustration',
        wardrobe: 'Combat medic uniform, medical pack, Life Crystal glowing gold around neck',
        age: 26,
        distinct_markers: 'Glowing gold Life Crystal pendant, warm brown fur',
      },
    },
    expression_sheets: {},
    pose_libraries: {},
    outfit_libraries: {},
    world_bible_summary:
      'Year 2248. Earth is a network of futuristic Neo Cities connected by orbital transit gates. ' +
      'Ancient Cartographer civilisation hid humanity\'s knowledge inside the Vault of Humanity. ' +
      'The vault opens only when four chosen guardians unite the four Compass Fragments. ' +
      'The Obsidian Circle, led by Seraphis (King Cobra Humanoid), seeks to control the vault. ' +
      'Locations: Neo Accra (floating biodomes, solar lattices), Neo Nairobi (vertical cliff city, excavation zones), ' +
      'Neo New York (hover-racing circuit, Manhattan Skyspire), Neo Mexico City (floating megahospital, Aztec canals), ' +
      'Neo Cairo (Great Pyramid sanctuary), Neo Rome (underground archive networks), ' +
      'Swiss Alps (Cartographer archive in cliff face), Neo Kyoto (bamboo sanctuary under climate dome).',
    style_guide:
      'Render style: flat_color. Aesthetic: Futuristic Sci-Fi Adventure — bright Neo Cities against ancient stone vaults, warm gold Cartographer glows against cold orbital blues.',
    color_palette: ['#0a1628', '#c9a84c', '#1a3a5c', '#2d5a27', '#8b3a1a', '#3d1f6b', '#e8d5a3', '#1e4d3b'],
    camera_language: {
      establishing: '24mm anamorphic, drone wide, slow descent or orbit',
      action: '35mm tracking, handheld, wide + medium',
      dialogue: '50mm OTS + medium, static or slow push',
      intimate: '85mm portrait, close-up, static',
    },
    director_profile: 'Sci-Fi Adventurist — epic wide establishing shots, warm intimate close-ups for character moments, handheld urgency in action sequences',
    visual_rules: [
      'Global aesthetic: Futuristic Sci-Fi Adventure, Year 2248',
      'Render style: flat_color — maintain consistency across all frames',
      'Character species and appearance must match approved_characters on every generation',
      'Neo Cities should show floating architecture and orbital transit gates in establishing shots',
      'Ancient locations (pyramid, vault, sanctuary) contrast with futuristic gear and tech',
      'Compass Fragments always glow their character colour when active',
      'Gold Cartographer glow is the visual signature of vault activation sequences',
    ],
  },

  characters: [
    {
      id: 'CHAR_THEO',
      name: 'Theo Mensah',
      facial_blueprint: {
        base_ethnicity_or_type: 'Giant Tortoise Humanoid',
        estimated_age: 28,
        bone_structure: 'Broad-shouldered, heavy shell, slow deliberate movements',
        distinct_markers: 'Shell engraved with faint glowing Cartographer sigils',
        fixed_seed_reference: 1101,
      },
      wardrobe_defaults:
        'Systems Engineer uniform with Cartographer faction badge, bronze compass fragment on a chest strap',
      story_role: 'Protagonist',
      relationships: [
        { target_id: 'CHAR_HARRISON', target_name: 'Harrison Brooks', relationship_type: 'ally', notes: 'Fellow guardian — they unite the compass fragments together.' },
        { target_id: 'CHAR_AMINA',   target_name: 'Amina Hassan',    relationship_type: 'ally', notes: 'Trusted ally and intellectual counterpart in the mission.' },
        { target_id: 'CHAR_BELLA',   target_name: 'Bella Alvarez',   relationship_type: 'ally', notes: 'Protective bond — Theo guards the team\'s heart.' },
      ],
    },
    {
      id: 'CHAR_HARRISON',
      name: 'Harrison Brooks',
      facial_blueprint: {
        base_ethnicity_or_type: 'Hare Humanoid',
        estimated_age: 24,
        bone_structure: 'Lean athletic build, long ears, quick alert eyes',
        distinct_markers: 'Racing helmet visor always pushed up on forehead, white fur',
        fixed_seed_reference: 2247,
      },
      wardrobe_defaults:
        'Professional hover racing jacket, racing helmet visor, silver compass fragment clipped to chest',
      story_role: 'Supporting',
      relationships: [
        { target_id: 'CHAR_THEO',    target_name: 'Theo Mensah',   relationship_type: 'ally',   notes: 'Guardian bond forged by the compass fragments.' },
        { target_id: 'CHAR_BELLA',   target_name: 'Bella Alvarez', relationship_type: 'romantic', notes: 'Unspoken romantic tension throughout the mission.' },
      ],
    },
    {
      id: 'CHAR_AMINA',
      name: 'Amina Hassan',
      facial_blueprint: {
        base_ethnicity_or_type: 'Black Panther Humanoid',
        estimated_age: 31,
        bone_structure: 'Sleek build, angular jaw, calm steady gaze',
        distinct_markers: 'Sleek black fur, silver ear studs',
        fixed_seed_reference: 3388,
      },
      wardrobe_defaults:
        'Field archaeologist gear, utility vest, silver ear studs, Ancient Atlas Key on belt',
      story_role: 'Supporting',
      relationships: [
        { target_id: 'CHAR_THEO',    target_name: 'Theo Mensah',      relationship_type: 'ally',   notes: 'Co-leader dynamic — they plan the vault approach together.' },
        { target_id: 'CHAR_HARRISON', target_name: 'Harrison Brooks', relationship_type: 'mentor',  notes: 'Guides Harrison\'s impulsiveness with calm expertise.' },
      ],
    },
    {
      id: 'CHAR_BELLA',
      name: 'Bella Alvarez',
      facial_blueprint: {
        base_ethnicity_or_type: 'Deer Humanoid',
        estimated_age: 26,
        bone_structure: 'Graceful build, gentle features, warm expression',
        distinct_markers: 'Glowing gold Life Crystal pendant, warm brown fur',
        fixed_seed_reference: 4419,
      },
      wardrobe_defaults:
        'Combat medic uniform, medical pack, Life Crystal glowing gold around neck',
      story_role: 'Supporting',
      relationships: [
        { target_id: 'CHAR_THEO',    target_name: 'Theo Mensah',   relationship_type: 'ally',    notes: 'Bella keeps the team alive — Theo ensures the mission succeeds.' },
        { target_id: 'CHAR_HARRISON', target_name: 'Harrison Brooks', relationship_type: 'romantic', notes: 'Warm mutual attraction that neither has voiced directly.' },
      ],
    },
  ],

  scenes: [
    // ── Scene 1 — The Calling ────────────────────────────────────────────────
    {
      scene_number: 1,
      location_heading: 'MULTI-LOCATION — NEO ACCRA / NEO NAIROBI / NEO MEXICO CITY / NEO NEW YORK',
      environmental_type: 'Exterior — Futuristic City',
      time_of_day: 'Dawn',
      emotional_tone: 'Wonder, Destiny',
      color_palette: ['#0a1628', '#c9a84c', '#1a3a5c', '#e8d5a3'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'Across four cities, four strangers discover glowing Compass Fragments hidden in their most personal possessions.',
          visual_action:
            'Split-screen quad establishing shot — Neo Accra floating gardens, Neo Nairobi cliff city, Neo Mexico City floating megahospital, Neo New York Skyspire. Each city glows with dawn light.',
          animation_beats: [],
          action_breakdown:
            'Quad split-screen wide establishing — four Neo Cities at dawn, each with a glowing amber point of light.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Bird\'s Eye',
          camera_movement: 'Slow Drone Orbit',
          duration_seconds: 5,
          lighting_notes: 'Dawn gold across all four cities, orbital transit gates visible in sky',
          mood: 'Epic Wonder',
          purpose: 'Establish the four cities and the simultaneous awakening',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Awe',
          dialogue: null,
          director_notes:
            'Opening on all four cities simultaneously signals scope. The matching dawn light unifies four different worlds before the characters ever meet.',
          sound_cue: 'Rising orchestral swell. Holographic hum of activating fragments.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus — city skylines sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Each fragment projects the same holographic message: "The Vault awakens. Seek Cairo."',
          visual_action:
            'Four sequential inserts — each Compass Fragment glowing in its owner\'s hands. Bronze (Theo). Silver (Harrison). Atlas Key amber (Amina). Gold crystal (Bella). Each projects a holographic map to Cairo.',
          animation_beats: [],
          action_breakdown:
            'Four sequential close-up inserts — each fragment glowing, projecting matching holographic map.',
          shot_type: 'Insert',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 4,
          lighting_notes: 'Fragment glow dominates — warm gold on each character\'s face',
          mood: 'Destiny',
          purpose: 'The call to adventure — same message, four different hands',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Determined',
          dialogue: 'FRAGMENT (V.O.): "The Vault awakens. Seek Cairo."',
          director_notes:
            'Four inserts in quick succession creates rhythm and inevitability. The identical holographic message from four different fragments confirms this is not coincidence — it is architecture.',
          sound_cue: 'Holographic voice, layered fourfold. Fragment harmonic tone.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — fragment sharp, hands and face softly lit behind',
        },
      ],
    },

    // ── Scene 2 — Strangers Become Rivals ───────────────────────────────────
    {
      scene_number: 2,
      location_heading: 'EXT/INT. NEO CAIRO — BENEATH THE GREAT PYRAMID',
      environmental_type: 'Exterior / Interior — Ancient Cartographer Sanctuary',
      time_of_day: 'Day',
      emotional_tone: 'Tension, Rivalry, Discovery',
      color_palette: ['#1a2a1a', '#c9a84c', '#3d2a0a', '#0a1628'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'The four strangers meet beneath the Great Pyramid. No one trusts anyone.',
          visual_action:
            'Wide establishing shot — the four characters standing in a rough square beneath the pyramid entrance. Sandy light. Each facing slightly away from the others.',
          animation_beats: [],
          action_breakdown:
            'Wide — four characters, uncomfortable spacing, pyramid behind them, no one making eye contact.',
          shot_type: 'Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 4,
          lighting_notes: 'Desert midday — harsh overhead sun, deep shadows under the pyramid canopy',
          mood: 'Uneasy',
          purpose: 'Establish the group dynamic — four strangers, no unity yet',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Suspicious',
          dialogue: null,
          director_notes:
            'The wide shot forces us to read all four characters at once. Their body language — none facing each other directly — communicates distrust without dialogue.',
          sound_cue: 'Desert wind. Distant hover pod landing.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — all four characters and pyramid sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Harrison mocks Theo. Bella steps between them.',
          visual_action:
            'Medium two-shot — Harrison pointing at Theo, smirking. Bella steps into frame between them, hands raised.',
          animation_beats: [],
          action_breakdown:
            'Medium two-shot — Harrison mocking, Bella intervening, Theo impassive.',
          shot_type: 'Medium',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 5,
          lighting_notes: 'Side-lit by desert sun, warm key right',
          mood: 'Conflict',
          purpose: 'Establish Harrison\'s arrogance, Bella\'s mediator role, Theo\'s patience',
          characters_present: ['Harrison Brooks', 'Theo Mensah', 'Bella Alvarez'],
          frame_emotion: 'Irritated',
          dialogue:
            'HARRISON: "You\'re going to slow us all down, tortoise." | BELLA: "We were all called here for a reason."',
          director_notes:
            'Putting Bella physically between Harrison and Theo tells the audience her role before she earns it. Keeping Theo still and calm in the face of mockery is his first leadership beat.',
          sound_cue: 'Harrison\'s laugh. Bella\'s firm voice.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Shallow — trio sharp, pyramid dissolves behind',
        },
        {
          frame_number: 3,
          narrative_action: 'Amina discovers the Atlas Codex beneath the pyramid floor. Obsidian Circle drones attack.',
          visual_action:
            'Wide action shot — Amina crouching over a glowing Atlas Codex in the pyramid floor, the other three surrounding her. Black drones burst through the far entrance.',
          animation_beats: [],
          action_breakdown:
            'Wide — Amina with glowing Codex, team surrounding her, drones flooding the entrance behind.',
          shot_type: 'Wide',
          camera_angle: 'Slight High',
          camera_movement: 'Quick Handheld Push In',
          duration_seconds: 4,
          lighting_notes: 'Atlas Codex gold glow beneath them; cold blue drone lights flooding from entrance',
          mood: 'Discovery into Danger',
          purpose: 'Reveal the Codex and trigger the first action beat simultaneously',
          characters_present: ['Amina Hassan', 'Theo Mensah', 'Harrison Brooks', 'Bella Alvarez'],
          frame_emotion: 'Alarm',
          dialogue: 'AMINA: "Four unique resonance signatures — one per person in this room."',
          director_notes:
            'Combining the discovery and the attack in one frame creates overlapping stakes. The gold of the Codex against the cold blue of the drone lights establishes the visual grammar: gold = knowledge, blue = threat.',
          sound_cue: 'Codex harmonic tone. Drone engine whine.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — Codex, team, and drones all sharp',
        },
      ],
    },

    // ── Scene 3 — The Journey ────────────────────────────────────────────────
    {
      scene_number: 3,
      location_heading: 'EXT/INT. NEO ROME / SWISS ALPS — CARTOGRAPHER ARCHIVE',
      environmental_type: 'Exterior / Interior — Mountain Archive',
      time_of_day: 'Evening',
      emotional_tone: 'Discovery, Warmth, Tension',
      color_palette: ['#1a2e1a', '#c9a84c', '#2a4060', '#e8d5a3'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'The team travels through orbital transit gates. The Swiss Alps archive is revealed.',
          visual_action:
            'Wide establishing shot — orbital transit gate arcing over snow peaks. The team emerges onto a mountain platform, a hidden Cartographer archive glowing gold in the cliff face behind them.',
          animation_beats: [],
          action_breakdown:
            'Wide — orbital gate above, team arriving, cliff archive glowing behind.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Low — emphasise scale of Alps',
          camera_movement: 'Slow Drone Pull Back',
          duration_seconds: 5,
          lighting_notes: 'Cold blue orbital gate light contrasting warm gold archive glow; snow peaks in background',
          mood: 'Epic Discovery',
          purpose: 'Establish new location and the scale of the Cartographer world',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Awe',
          dialogue: null,
          director_notes:
            'Pulling back as they arrive emphasises the scale of the Alps and the archive simultaneously. The warm gold of the archive against cold blue transit gate is the visual argument for why the Cartographers\' knowledge matters.',
          sound_cue: 'Transit gate harmonic closing. Mountain wind. Archive hum.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus — gate, team, cliff face, alps all sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'The Chrono Hourglass activates, projecting visions of the first Cartographer guardians.',
          visual_action:
            'Medium wide — the team gathered around a glowing Chrono Hourglass on a stone plinth. Ancient holographic figures of the original Cartographers materialize around them.',
          animation_beats: [],
          action_breakdown:
            'Medium wide — Hourglass glowing, holographic ancestor figures appearing around the stunned team.',
          shot_type: 'Medium Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Slow 360 Orbit',
          duration_seconds: 6,
          lighting_notes: 'Hourglass warm gold light; holographic figures translucent blue',
          mood: 'Revelation',
          purpose: 'Reveal the true purpose of the Vault — knowledge, not treasure',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Wonder',
          dialogue: null,
          director_notes:
            'The 360 orbit during the hologram activation immerses the viewer in the reveal alongside the characters. The contrast of gold Hourglass and blue ancestor holograms makes the past and present coexist visually.',
          sound_cue: 'Deep harmonic resonance. Cartographer ancestor voice (distant).',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Medium depth — team and hourglass sharp, ancestor figures slightly ethereal',
        },
        {
          frame_number: 3,
          narrative_action: 'Around a mountain village dinner table, Bella and Theo talk quietly. Harrison is still impatient.',
          visual_action:
            'Medium two-shot — Bella and Theo at the end of a long dinner table, talking quietly, leaning slightly toward each other. Harrison visible in background, arms crossed.',
          animation_beats: [],
          action_breakdown:
            'Medium two-shot — Bella and Theo in soft conversation; Harrison brooding in background.',
          shot_type: 'Medium',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 5,
          lighting_notes: 'Warm firelight from mountain village; candlelight on table',
          mood: 'Warmth, Budding Connection',
          purpose: 'Establish Theo and Bella\'s bond; contrast with Harrison\'s isolation',
          characters_present: ['Theo Mensah', 'Bella Alvarez', 'Harrison Brooks'],
          frame_emotion: 'Tender',
          dialogue:
            'BELLA: "You don\'t say much." | THEO: "I\'ve learned that listening matters more."',
          director_notes:
            'Keeping Harrison visible but out of focus in the background acknowledges his presence without giving him the scene. This is Theo and Bella\'s first real moment — the shallow depth of field is the storytelling.',
          sound_cue: 'Crackling fire. Mountain wind outside. Quiet conversation.',
          generated_image_url: PLACEHOLDER,
          lens: '85mm Portrait',
          focal_length: '85mm',
          depth_style: 'Shallow — Bella and Theo sharp, Harrison dissolved',
        },
      ],
    },

    // ── Scene 4 — The Trial ──────────────────────────────────────────────────
    {
      scene_number: 4,
      location_heading: 'INT. NEO KYOTO — ANCIENT BAMBOO SANCTUARY',
      environmental_type: 'Interior — Ancient Cartographer Sanctuary',
      time_of_day: 'Day',
      emotional_tone: 'Trial, Unity, Courage',
      color_palette: ['#1e3a1e', '#c9a84c', '#0a1628', '#2d5a27'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'The sanctuary\'s mechanical traps activate. The team faces impossible puzzles.',
          visual_action:
            'Wide action shot — ancient mechanical arms and rotating stone puzzles activating around the four characters inside a bamboo-lined vault. Climate dome visible above through a glass ceiling.',
          animation_beats: [],
          action_breakdown:
            'Wide — mechanical traps activating, team scattered, bamboo and stone mechanisms spinning.',
          shot_type: 'Wide',
          camera_angle: 'Slight High — overview of trap layout',
          camera_movement: 'Handheld Urgent Push In',
          duration_seconds: 4,
          lighting_notes: 'Green bamboo-filtered daylight through climate dome; amber trap mechanism glow',
          mood: 'Urgency, Danger',
          purpose: 'The trial begins — physical and psychological pressure',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Alarm',
          dialogue: null,
          director_notes:
            'High angle establishes the trap geography — the audience needs to understand the layout to feel the danger. Handheld urgency kicks in immediately.',
          sound_cue: 'Stone grinding. Mechanical clicks. Bamboo cracking.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — team and all trap elements sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Theo speaks quietly. One by one the others fall silent and listen.',
          visual_action:
            'Medium close-up — Theo, still and calm in the chaos, speaking. Cut to Harrison, then Amina, then Bella — each one stopping what they\'re doing and turning toward him.',
          animation_beats: [],
          action_breakdown:
            'MCU Theo speaking calmly → reaction shots: Harrison stops, Amina stops, Bella stops. All looking at Theo.',
          shot_type: 'Medium Close-Up',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 5,
          lighting_notes: 'Bamboo-filtered green light; Theo\'s shell sigils begin to glow softly',
          mood: 'Quiet Authority',
          purpose: 'Theo\'s leadership moment — the team chooses to trust him',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Conviction',
          dialogue:
            'THEO: "We don\'t need to know each other. We need to trust each other. Just this once."',
          director_notes:
            'Staying on Theo\'s MCU while the others react in quick cuts makes him the gravitational centre of the scene. His shell sigils beginning to glow is the visual confirmation that the Cartographers recognise this moment.',
          sound_cue: 'Mechanical sounds fading. Theo\'s calm voice.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Shallow — Theo sharp, trap mechanisms softly blurred behind',
        },
        {
          frame_number: 3,
          narrative_action: 'All four fragments glow simultaneously. The vault door opens. Theo catches Bella as a bridge collapses.',
          visual_action:
            'Wide — all four characters holding their fragments toward the central mechanism. Four beams of coloured light (bronze, silver, amber, gold) meet at the lock. The door opens in a blaze of gold. In the same motion, Bella slips — Theo lunges and catches her wrist.',
          animation_beats: [],
          action_breakdown:
            'Wide — four fragments activated simultaneously → vault door opens in gold light → Bella slips → Theo catches her.',
          shot_type: 'Wide',
          camera_angle: 'Slight Low — heroic framing',
          camera_movement: 'Slow Push In becoming Handheld Lunge',
          duration_seconds: 6,
          lighting_notes: 'Four fragment colours converging to gold; vault door blazing warm light',
          mood: 'Triumph into Vulnerability',
          purpose: 'Vault activation and the trust moment — the group becomes a team',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Triumph',
          dialogue: null,
          director_notes:
            'Combining the vault opening and Theo catching Bella in one continuous shot earns both beats simultaneously. The gold light of the vault frames them — it is the Cartographers\' blessing on the moment the team truly unites.',
          sound_cue: 'Fragment harmonic convergence. Vault stone grinding open. Bella\'s gasp. Silence.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus transitioning to shallow on Theo and Bella',
        },
      ],
    },

    // ── Scene 5 — The Betrayal ───────────────────────────────────────────────
    {
      scene_number: 5,
      location_heading: 'INT. ORBITAL TRANSIT HUB — ABOVE THE ATLANTIC',
      environmental_type: 'Interior — Orbital Transit Station',
      time_of_day: 'Night',
      emotional_tone: 'Confrontation, Loyalty, Action',
      color_palette: ['#0a1628', '#3d1f6b', '#c9a84c', '#8b3a1a'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'Seraphis steps from the shadows. The Obsidian Circle surrounds the team.',
          visual_action:
            'Wide — Seraphis (enormous King Cobra Humanoid, hood fanned, obsidian armour) steps forward from a ring of Obsidian Circle soldiers surrounding the four heroes in the transit hub atrium.',
          animation_beats: [],
          action_breakdown:
            'Wide — Seraphis revealed at centre, team encircled, soldiers in obsidian armour filling the perimeter.',
          shot_type: 'Wide',
          camera_angle: 'Slight Low — Seraphis dominant',
          camera_movement: 'Slow Push In on Seraphis',
          duration_seconds: 4,
          lighting_notes: 'Cold orbital station blue; Seraphis\'s obsidian armour absorbing light; team warmly lit by fragment glow',
          mood: 'Dread, Confrontation',
          purpose: 'Introduce Seraphis as the physical antagonist for the first time',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Defiant',
          dialogue: null,
          director_notes:
            'Seraphis must arrive in a wide shot so his scale is established against the team. The cold orbital blue vs warm fragment gold is the visual language of the entire film\'s conflict compressed into one frame.',
          sound_cue: 'Obsidian armour sound. Seraphis\'s slow deliberate steps. Silence.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — Seraphis, team, soldiers all sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Seraphis offers Harrison power. Harrison refuses.',
          visual_action:
            'Medium two-shot — Seraphis leaning toward Harrison, hood fanned. Harrison\'s jaw tightens. He looks at his team. Then back at Seraphis.',
          animation_beats: [],
          action_breakdown:
            'Medium two-shot — Seraphis offering, Harrison hesitating, glancing at team, then refusing.',
          shot_type: 'Medium',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 5,
          lighting_notes: 'Cold blue on Seraphis; warm fragment glow catching Harrison\'s face from the right',
          mood: 'Temptation, Loyalty',
          purpose: 'Harrison\'s defining choice — speed and fame vs his team',
          characters_present: ['Harrison Brooks'],
          frame_emotion: 'Resolute',
          dialogue:
            'SERAPHIS: "I can give you fame, power, a place in history. Hand me the Compass." | HARRISON: "Not a chance."',
          director_notes:
            'Harrison glancing at his team before refusing is the beat that earns his arc. The warm fragment glow catching his face at the moment of refusal is the visual confirmation that he has chosen the right side.',
          sound_cue: 'Seraphis\'s smooth voice. Silence. Harrison\'s firm two words.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Shallow — Harrison sharp, Seraphis partially dissolved',
        },
        {
          frame_number: 3,
          narrative_action: 'The team fights off the Obsidian Circle together. Seraphis retreats.',
          visual_action:
            'Wide action shot — the four heroes fighting together in the transit hub atrium, each covering the others. Seraphis retreating through a far exit.',
          animation_beats: [],
          action_breakdown:
            'Wide handheld action — team fighting in coordination, Seraphis retreating in background.',
          shot_type: 'Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Handheld Tracking',
          duration_seconds: 5,
          lighting_notes: 'Fragment glow lighting each hero; cold station light on retreating Seraphis',
          mood: 'Victory, Unity',
          purpose: 'First true team action sequence — the group operating as one',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Determined',
          dialogue: null,
          director_notes:
            'Wide handheld keeps all four characters readable in the fight while the energy stays urgent. Seraphis retreating small in the background is a deliberate diminishment of the threat — the team has won this round.',
          sound_cue: 'Combat sounds. Fragment hum intensifying. Seraphis\'s hiss receding.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — team sharp, action throughout',
        },
      ],
    },

    // ── Scene 6 — The Final Vault ────────────────────────────────────────────
    {
      scene_number: 6,
      location_heading: 'INT. NEO NEW YORK — OBSERVATORY, MANHATTAN SKYSPIRE',
      environmental_type: 'Interior — Vault / Observatory',
      time_of_day: 'Night',
      emotional_tone: 'Revelation, Awe, Purpose',
      color_palette: ['#0a1628', '#c9a84c', '#e8d5a3', '#1a3a5c'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'The four artifacts unite. The Vault of Humanity opens in a blaze of gold.',
          visual_action:
            'Wide — all four characters at the central dais of the observatory, each placing their artifact. Four beams of light merge. The vault ceiling peels back and floods with gold.',
          animation_beats: [],
          action_breakdown:
            'Wide — artifacts placed, four light beams merging, vault flooding with gold light.',
          shot_type: 'Wide',
          camera_angle: 'Slight Low — vault ceiling emphasised',
          camera_movement: 'Slow Crane Up',
          duration_seconds: 6,
          lighting_notes: 'Full gold vault light flooding from above; character faces upturned, bathed in warm gold',
          mood: 'Triumph, Revelation',
          purpose: 'The climactic vault opening — the payoff of the entire journey',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Awe',
          dialogue: null,
          director_notes:
            'The crane up as the vault opens makes the audience look up with the characters. The gold flooding downward is the visual answer to every cold blue threat in the film — knowledge is warm, knowledge is light.',
          sound_cue: 'All four fragment harmonics converging into one tone. Vault stone opening. Silence.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus — team, vault ceiling, all sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'No gold. No weapons. The vault contains humanity\'s entire knowledge — art, science, medicine, history.',
          visual_action:
            'Slow dolly reveal — the vault interior stretches impossibly far. Crystalline data tablets, holographic archives in hundreds of languages, art, maps, music scores. The team stands at the threshold, dwarfed by it.',
          animation_beats: [],
          action_breakdown:
            'Slow dolly reveal — vast knowledge vault interior, team dwarfed at threshold.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Eye Level — from team\'s perspective',
          camera_movement: 'Slow Dolly Forward',
          duration_seconds: 6,
          lighting_notes: 'Warm gold throughout — crystalline tablets glowing, holographic light in hundreds of colours',
          mood: 'Wonder, Humility',
          purpose: 'The treasure revealed — knowledge, not gold',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Humbled',
          dialogue: 'AMINA: "This was never treasure. It was a library." | THEO: "It belongs to everyone."',
          director_notes:
            'The dolly forward pulls the viewer into the vault alongside the team. Making the characters small against the scale of the vault is the film\'s thesis image: human lives are small; human knowledge is infinite.',
          sound_cue: 'Holographic archive hum. Thousands of quiet voices from the records. Silence.',
          generated_image_url: PLACEHOLDER,
          lens: '24mm Anamorphic',
          focal_length: '24mm',
          depth_style: 'Deep focus — team sharp, vault stretching to infinity behind',
        },
      ],
    },

    // ── Scene 7 — A New Beginning ────────────────────────────────────────────
    {
      scene_number: 7,
      location_heading: 'EXT. NEO NEW YORK — ROOFTOP RESTAURANT, SIX MONTHS LATER',
      environmental_type: 'Exterior — Futuristic Rooftop',
      time_of_day: 'Night',
      emotional_tone: 'Resolution, Joy, Hope',
      color_palette: ['#0a1628', '#c9a84c', '#1a3a5c', '#e8d5a3'],
      frames: [
        {
          frame_number: 1,
          narrative_action: 'Six months later. The four friends reunite on a rooftop above Neo New York. The vault\'s knowledge is being broadcast freely across the world.',
          visual_action:
            'Wide establishing shot — rooftop restaurant above the Neo New York skyline. Holographic displays across the city show the vault knowledge being shared. The Manhattan Skyspire glows gold in the background. The four friends at a table.',
          animation_beats: [],
          action_breakdown:
            'Wide — rooftop, city glowing with broadcast knowledge, friends at table, Skyspire gold behind.',
          shot_type: 'Establishing Wide',
          camera_angle: 'Slight High — city panorama visible',
          camera_movement: 'Slow Crane Down toward table',
          duration_seconds: 5,
          lighting_notes: 'City glow warm amber; orbital transit gates visible above; rooftop warm candlelight',
          mood: 'Peace, Joy',
          purpose: 'Establish the changed world and the reunion in one frame',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Content',
          dialogue: null,
          director_notes:
            'The crane down from the city to the table reverses the crane up of the vault opening — we come back to earth, back to the human scale. The gold city glow is the visual proof that the broadcast worked.',
          sound_cue: 'City hum. Laughter. Glasses clinking.',
          generated_image_url: PLACEHOLDER,
          lens: '35mm',
          focal_length: '35mm',
          depth_style: 'Deep focus — table, friends, and city skyline all sharp',
        },
        {
          frame_number: 2,
          narrative_action: 'Harrison raises a toast. Theo and Bella share a quiet look.',
          visual_action:
            'Medium wide — Harrison standing, glass raised, grinning. Amina amused. At the far end, Bella quietly reaches for Theo\'s hand beneath the table. The Compass rests at the centre, needle pointing upward.',
          animation_beats: [],
          action_breakdown:
            'Medium wide — Harrison toasting, Amina laughing, Bella reaching for Theo\'s hand, Compass needle glowing.',
          shot_type: 'Medium Wide',
          camera_angle: 'Eye Level',
          camera_movement: 'Static',
          duration_seconds: 6,
          lighting_notes: 'Warm candlelight; Compass needle glowing gold at centre of table',
          mood: 'Joy, Love, Closure',
          purpose: 'Resolve every character arc in one frame — Harrison humbled, Theo and Bella together, Amina at ease',
          characters_present: ['Theo Mensah', 'Harrison Brooks', 'Amina Hassan', 'Bella Alvarez'],
          frame_emotion: 'Happy',
          dialogue:
            'HARRISON: "I spent my whole life trying to be the fastest." | THEO: "The journey mattered more than the finish."',
          director_notes:
            'Every character arc resolves in this single frame simultaneously. Harrison\'s toast is his humility. Bella\'s hand is the romance. Amina\'s laughter is the trust earned. Theo\'s smile is the leadership accepted. The Compass needle pointing up is the film\'s final question answered.',
          sound_cue: 'Laughter. A single harmonic tone from the Compass. Fade to silence.',
          generated_image_url: PLACEHOLDER,
          lens: '50mm',
          focal_length: '50mm',
          depth_style: 'Medium depth — all four characters and Compass sharp',
        },
      ],
    },
  ],
}
