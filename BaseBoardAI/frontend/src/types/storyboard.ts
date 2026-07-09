/**
 * TypeScript type layer — mirrors backend Pydantic schemas exactly.
 * Field names match snake_case backend fields.
 */

export type RenderStyle = 'bw_sketch' | 'flat_color' | 'full_shaded'

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
  renderStyle: string

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
}

export interface FacialBlueprint {
  base_ethnicity_or_type: string
  estimated_age: number
  bone_structure: string
  distinct_markers: string | null
  fixed_seed_reference: number | null
}

export interface CharacterProfile {
  id: string
  name: string
  facial_blueprint: FacialBlueprint
  wardrobe_defaults: string
}

export interface StoryboardFrame {
  frame_number: number
  shot_type: string
  camera_angle: string
  duration_seconds: number
  action_breakdown: string
  lighting_notes: string
  sound_cue: string | null
  generated_image_url: string | null
  /** True when the user has uploaded their own artwork for this frame.
   *  Re-run skips locked frames so artist overrides are never overwritten. */
  is_manual_override?: boolean
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

export interface StoryboardProject {
  db_id: number | null
  project_title: string
  global_aesthetic: string
  render_style: string
  characters: CharacterProfile[]
  scenes: StoryboardScene[]
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
  reference_style_image: string | null
  raw_character_notes: string
  raw_world_notes: string
  raw_script_text: string
}
