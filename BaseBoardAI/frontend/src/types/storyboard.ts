/**
 * TypeScript type layer — mirrors backend Pydantic schemas exactly.
 * Field names match snake_case backend fields.
 */

export type RenderStyle = 'bw_sketch' | 'flat_color' | 'full_shaded'

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
