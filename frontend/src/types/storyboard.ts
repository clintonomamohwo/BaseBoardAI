/**
 * TypeScript type layer — mirrors backend Pydantic schemas exactly.
 * Field names match snake_case backend fields.
 */

export type RenderStyle = 'bw_sketch' | 'bw_detailed' | 'flat_color' | 'full_shaded'

// ---------------------------------------------------------------------------
// Character Package — rich per-character reference data (frontend-only state)
// ---------------------------------------------------------------------------

export interface CharacterOverview {
  name: string
  role: string
  age: string
  gender: string
  occupation: string
  species: string
  nationality: string
  height: string
  biography: string
  personality: string
  goals: string
  fears: string
  strengths: string
  weaknesses: string
}

export interface PackageVersion {
  version: number
  timestamp: string
  images: Record<string, string | null>       // section key → data URL
}

export interface CharacterRelationship {
  targetCharId: string
  targetName: string
  type: 'ally' | 'enemy' | 'romantic' | 'mentor' | 'family' | 'neutral' | 'rival'
  strength: number   // 1–5
  sharedScenes: number[]
  description: string
}

export interface CharacterPackage {
  charId: string
  overview: CharacterOverview | null
  prompt: string                               // editable AI prompt used for generation
  renderStyle: RenderStyle

  // Generated images — null = not yet generated
  portrait: string | null
  turnaround: Record<string, string | null>   // front / three_q_front / side / three_q_back / back
  expressions: Record<string, string | null>  // neutral / happy / laughing / angry / sad / surprised / fearful / thinking / crying
  poses: Record<string, string | null>        // standing / walking / running / sitting / pointing / holding_object / hero_pose
  outfits: Record<string, string | null>      // default / casual / formal / travel / combat / winter / summer
  props: Record<string, string | null>        // auto-detected from wardrobe

  // Premium full-pack sections
  turnaround360: Record<string, string | null> | null
  premiumPoses: Record<string, string | null> | null
  materialCloseups: Record<string, string | null> | null
  fullPackLoading: boolean
  fullPackGenerated: boolean

  // Relationship graph
  relationships: CharacterRelationship[]

  // Per-section loading flags
  loading: Record<string, boolean>

  // Version history
  versions: PackageVersion[]

  // Scene appearance list (scene numbers)
  sceneAppearances: number[]

  // Auto-init status — tracks if default sections have been kicked off
  autoInitDone: boolean

  // ── Character DNA System ──────────────────────────────────────────────────
  /** Layer 1 — who the character is. Populated from reference image upload or manual entry. */
  identity: CharacterIdentity | null
  /** Layer 2 — anatomy type. Defaults to human. */
  species: SpeciesProfile
  /** CKM — structural anatomy (humanoid, dragon, quadruped…). Distinct from species/classification. */
  physicalForm: PhysicalForm
  /** Narrative classification (god, demon, hero…). Story logic only — never affects anatomy. */
  classification: ClassificationType | null
  /** Abilities that influence Director Engine shot selection (e.g. 'flight' → aerial shots). */
  abilities: string[]
  /** Per-character visual rules enforced by QA Engine and Director Engine. */
  visualRules: string[]
  /** Layer 3 — appearance variants (Default, Battle Armor, Elf Form, etc.) */
  variants: CharacterVariant[]
  /** Which variant is currently active for generation. */
  activeVariantId: string

  // ── Star & lock system ────────────────────────────────────────────────────
  /** Starred image URL — used as reference for all generations. Also protected from regen. */
  starredImage: string | null
  /** Set of image URLs the user has locked (protected from regeneration). */
  lockedImages: Set<string>
  /** @deprecated use starredImage */
  lockedImage: string | null

  // ── Visual QA Engine ─────────────────────────────────────────────────────
  /** Latest QA score from the Visual QA Engine. Null until first check. */
  qaResult: QAScoreResult | null

  // ── Completion tracking ───────────────────────────────────────────────────
  /** 0–100 completion score across all DNA layers + generated asset sections. */
  completionScore: number
}

export interface FacialBlueprint {
  base_ethnicity_or_type: string
  estimated_age: number
  bone_structure: string
  distinct_markers: string | null
  fixed_seed_reference: number | null
}

// ---------------------------------------------------------------------------
// Character DNA System — all independent layers
// ---------------------------------------------------------------------------

// Physical Form options (anatomy structure — NOT the same as classification)
export type PhysicalFormType =
  | 'humanoid' | 'quadruped' | 'dragon' | 'bird' | 'serpent'
  | 'spirit' | 'robot' | 'vehicle' | 'hybrid' | 'custom'

// Narrative classification — story logic only, NEVER affects anatomy
export type ClassificationType =
  | 'human' | 'god' | 'demon' | 'angel' | 'alien' | 'robot'
  | 'spirit' | 'monster' | 'hero' | 'villain' | 'deity' | 'custom'

// Known abilities that influence Director Engine shot selection
export type AbilityType =
  | 'flight' | 'teleportation' | 'fire_breath' | 'immortality'
  | 'shapeshifting' | 'magic' | 'lightning' | 'healing'
  | 'super_strength' | 'invisibility' | 'mind_control' | 'custom'

/**
 * CKM Physical Form — the structural anatomy of the character.
 * DISTINCT from species and classification.
 * Zeus: form='humanoid', classification='god'
 * Dragon God: form='dragon', classification='god'
 */
export interface PhysicalForm {
  form: PhysicalFormType
  custom_description: string | null
  limb_count: number | null
  has_wings: boolean
  has_tail: boolean
}

/** Layer 1 — WHO the character is. Immutable across species and rendering styles. */
export interface CharacterIdentity {
  name: string
  face_description: string | null
  hair_description: string | null
  eye_description: string | null
  body_proportions: string | null
  age: number | null
  distinct_markers: string | null
  signature_accessories: string[]
  // Canonical reference images (base64 data URLs; null = not yet uploaded)
  reference_primary: string | null
  reference_front: string | null
  reference_left: string | null
  reference_right: string | null
  reference_back: string | null
}

/** Layer 2 — WHAT the character is (anatomy type). Default = human. */
export interface SpeciesProfile {
  species_id: string       // e.g. 'human' | 'elf' | 'wolf' | 'dragon' | 'robot' | 'vampire' | 'custom'
  label: string
  custom_notes: string | null
}

/** Layer 3 — HOW the character appears at a given story point. */
export interface CharacterVariant {
  variant_id: string       // e.g. 'default' | 'battle_armor' | 'elf_form'
  label: string
  outfit: string | null
  hair_override: string | null
  age_override: number | null
  species_override: string | null
  extra_accessories: string[]
  scene_range: [number, number] | null
  notes: string | null
}

/** A single targeted fix recommended by the QA Engine. */
export interface QARepairAction {
  /** The failing category this action fixes, e.g. 'composition' */
  category: string
  /** Human-readable label, e.g. 'Regenerate Composition Only' */
  label: string
  /** Backend endpoint to call, e.g. '/storyboard/frame/reforge-composition' */
  endpoint: string
  /** 'critical' | 'warning' | 'suggestion' */
  severity: 'critical' | 'warning' | 'suggestion'
  /** Category score that triggered this action */
  score: number
}

/** QA Engine result for a single generation. */
export interface QAScoreResult {
  overall: number          // 0.0–1.0
  /** 9 categories: identity, species, anatomy, composition, camera, lighting, props, environment, continuity */
  breakdown: Record<string, number>
  warning: string | null
  passed: boolean
  /** Asset type validator that was used */
  asset_type: string
  /** Ordered targeted repair actions (critical first). Empty when QA passes. */
  repairs: QARepairAction[]
}

export type StoryRoleType = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Other'
export type RelationshipType = 'ally' | 'enemy' | 'romantic' | 'mentor' | 'family' | 'neutral' | 'rival'

export interface CharacterRelationshipEntry {
  target_id: string
  target_name: string
  relationship_type: RelationshipType
  notes?: string | null
}

export interface CharacterProfile {
  id: string
  name: string
  facial_blueprint: FacialBlueprint
  wardrobe_defaults: string
  /** User-uploaded reference image (base64 data URL). Not stored in DB — frontend only. */
  reference_image?: string
  /** Narrative story role — set by AI from script analysis */
  story_role?: StoryRoleType | null
  /** Directed relationships to other characters — set by AI from script analysis */
  relationships?: CharacterRelationshipEntry[]
  // ── Character DNA System layers (CKG) ────────────────────────────────────
  identity?: CharacterIdentity | null
  species?: SpeciesProfile
  /** Structural anatomy — distinct from species/classification */
  physical_form?: PhysicalForm
  /** Narrative classification — story logic only, never affects anatomy */
  classification?: ClassificationType | null
  /** Abilities that influence Director Engine shot selection */
  abilities?: string[]
  /** Per-character visual rules for QA and Director Engine */
  visual_rules?: string[]
  variants?: CharacterVariant[]
  active_variant_id?: string | null
}

export interface StoryboardFrame {
  frame_number: number

  // ── Three-level action system ──────────────────────────────────────────
  /** Level 1 — verbatim screenplay excerpt. Read-only anchor; never AI-modified. */
  narrative_action: string | null
  /** Level 2 — AI-directed staging interpretation. The primary field driving the image. */
  visual_action: string | null
  /** Level 3 — granular animation cues. Empty until explicitly requested. */
  animation_beats: string[]
  /** Character action and pose at the end of this shot. */
  action_pose?: string | null
  /** Story-relevant props visible or held in this shot. */
  props_present?: string[]
  /** Primary movement direction in screen space. */
  screen_direction?: 'left_to_right' | 'right_to_left' | 'toward_camera' | 'away_from_camera' | 'static' | 'unspecified'
  /** Stable IDs of earlier storyboard frames or canonical references this shot must match. */
  continuity_reference_ids?: string[]
  /** What must carry over from adjacent shots (pose, prop hand, geography, or eyeline). */
  continuity_notes?: string | null
  /** Stable shot IDs whose approved ending state this shot depends on. */
  continuity_dependency_ids?: string[]
  /** True when an upstream dependency changed after this shot was approved. */
  continuity_review_required?: boolean

  /** Legacy field — kept for backwards compatibility. Mirrors visual_action. */
  action_breakdown: string

  // ── Shot & camera ──────────────────────────────────────────────────────
  shot_type: string
  camera_angle: string
  /** e.g. 'Slow Dolly Forward', 'Static', 'Handheld Push', 'Pan Right' */
  camera_movement: string | null

  // ── Timing ────────────────────────────────────────────────────────────
  duration_seconds: number

  // ── Lighting & mood ───────────────────────────────────────────────────
  lighting_notes: string
  /** Frame-level atmosphere — distinct from scene-level emotional_tone */
  mood: string | null

  // ── Production metadata ───────────────────────────────────────────────
  /** Director's intent: 'Introduce location', 'Reveal character', 'Hold silence' */
  purpose: string | null
  /** Names of characters visible in this frame */
  characters_present: string[]
  /** Dominant emotion of the central character in this frame */
  frame_emotion: string | null
  /** Spoken line, or null if none */
  dialogue: string | null
  /** AI rationale for compositional choices */
  director_notes: string | null

  // ── Audio ─────────────────────────────────────────────────────────────
  sound_cue: string | null

  // ── Output ────────────────────────────────────────────────────────────
  generated_image_url: string | null
  approval_status?: 'pending' | 'approved'

  /** True when the user has uploaded their own artwork for this frame.
   *  Re-run skips locked frames so artist overrides are never overwritten. */
  is_manual_override?: boolean

  // ── Director Engine ───────────────────────────────────────────────────
  lens?: string | null
  focal_length?: string | null
  depth_style?: string | null
  lens_prompt_suffix?: string | null
  /** Fields explicitly locked by the user — Cinematic Brain never overwrites these. */
  locked_fields?: string[]
  /**
   * Tracks which cinematic fields were auto-selected by the Cinematic Brain.
   * e.g. { shot_type: true, lighting_notes: true, camera_angle: false }
   * Frontend uses this to show "AI ✦" badges on auto-selected fields.
   */
  auto_selected?: Record<string, boolean>
  /**
   * Per-field rationale from the Cinematic Brain, shown in the Director Notes panel.
   * e.g. { shot_type: 'Emotional moment — close-up registers facial performance.' }
   */
  director_rationale?: Record<string, string>
}

export interface StoryboardScene {
  scene_number: number
  location_heading: string
  environmental_type: string
  time_of_day: string
  emotional_tone: string
  color_palette: string[]
  frames: StoryboardFrame[]
}

// ---------------------------------------------------------------------------
// Creative Knowledge Graph (CKG) — was ProjectCanon
// The single authoritative source of truth for every AI generation.
// ---------------------------------------------------------------------------

export interface CreativeKnowledgeGraph {
  project_id?: number | null

  // ── Character Identity nodes ─────────────────────────────────────────────
  character_identities: Record<string, CharacterIdentity & { _canonical_prompt?: string }>
  character_species: Record<string, SpeciesProfile>
  character_variants: Record<string, CharacterVariant[]>
  /** char_id → ability slug list — consumed by Prompt Builder and Director Engine */
  character_abilities: Record<string, string[]>

  // ── Backwards-compat flat summaries ──────────────────────────────────────
  approved_characters: Record<string, {
    name: string
    appearance_summary: string
    canonical_prompt: string
    wardrobe?: string
    age?: number | null
    distinct_markers?: string | null
  }>

  // ── Asset libraries ───────────────────────────────────────────────────────
  expression_sheets: Record<string, unknown>
  pose_libraries: Record<string, unknown>
  outfit_libraries: Record<string, unknown>
  accessory_libraries: Record<string, unknown>

  // ── World nodes ───────────────────────────────────────────────────────────
  world_bible_summary: string
  locations: Record<string, unknown>
  props: Record<string, unknown>
  timeline: unknown[]
  relationships: Record<string, unknown>

  // ── Style & direction nodes ───────────────────────────────────────────────
  style_guide: string
  color_palette: string[]
  camera_language: Record<string, string>
  director_profile: string
  visual_rules: string[]
}

/** Backwards-compatibility alias. */
export type ProjectCanon = CreativeKnowledgeGraph

export interface StoryDevelopmentContext {
  idea: string
  genre: string | null
  format: string
  notes: string
}

export interface StoryDevelopmentDraft extends StoryDevelopmentContext {
  outline: string
  script: string
}

export interface StoryboardProject {
  db_id: number | null
  project_title: string
  global_aesthetic: string
  render_style: RenderStyle
  characters: CharacterProfile[]
  scenes: StoryboardScene[]
  /** Creative Knowledge Graph — the single source of truth for all AI generation.
   *  Populated automatically by forge-pipeline. Null for legacy projects. */
  canon: CreativeKnowledgeGraph | null
  /** Optional creator-developed story materials, saved with this project. */
  story_development?: StoryDevelopmentDraft | null
  /** True when the LLM output was truncated mid-generation and only a partial
   *  storyboard was recovered. The UI should surface a warning to the user. */
  truncated?: boolean
}

export interface FrameExportItem {
  sceneNumber: number
  frameNumber: number
  filename: string
  dataUrl: string
}

export interface PipelineExecutionRequest {
  project_title: string
  global_aesthetic: string
  render_style: RenderStyle
  director_style?: 'balanced' | 'cinematic' | 'dialogue' | 'action' | 'intimate'
  reference_style_image: string | null
  raw_character_notes: string
  raw_world_notes: string
  raw_script_text: string
  story_development?: StoryDevelopmentDraft | null
}

// ---------------------------------------------------------------------------
// Scene Continuity QA — context-aware, storyboard-plan-driven
// ---------------------------------------------------------------------------

export interface FrameExpectedContext {
  scene_number: number
  frame_number: number
  location_heading: string
  time_of_day: string
  environmental_type: string
  characters_present: string[]
  lighting_notes: string
  mood: string | null
  shot_type: string
  generated_prompt: string
}

export type FrameQACategory =
  | 'location' | 'time_of_day' | 'lighting' | 'characters'
  | 'weather' | 'shot_type' | 'mood' | 'prompt_alignment'

export interface FrameQAIssue {
  category: FrameQACategory
  severity: 'critical' | 'warning' | 'suggestion'
  message: string
  expected: string | null
  detected: string | null
  frame_number: number
}

export interface FrameQAResult {
  scene_number: number
  frame_number: number
  passed: boolean
  overall: number
  issues: FrameQAIssue[]
  continuity_group_id: string
}

export interface ContinuityGroup {
  group_id: string
  location_heading: string
  time_of_day: string
  frame_numbers: number[]
  scene_number: number
}

export interface SceneContinuityReport {
  scene_number: number
  location_heading: string
  total_frames: number
  frames_passed: number
  frames_failed: number
  overall: number
  continuity_groups: ContinuityGroup[]
  frame_results: FrameQAResult[]
  summary: string
}

export interface SceneQARequest {
  scene_number: number
  location_heading: string
  time_of_day: string
  environmental_type: string
  frames: FrameExpectedContext[]
}
