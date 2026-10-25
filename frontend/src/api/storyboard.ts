import type {
  CharacterIdentity,
  CharacterProfile,
  CharacterOverview,
  CharacterVariant,
  CreativeKnowledgeGraph,
  PipelineExecutionRequest,
  QAScoreResult,
  SceneContinuityReport,
  SceneQARequest,
  SpeciesProfile,
  PhysicalForm,
  StoryboardFrame,
  StoryboardProject,
  StoryboardScene,
  StoryDevelopmentContext,
} from '../types/storyboard'
import type { SceneUpgradeResult, FrameUpgradeResult } from '../types/renderUpgrade'

/** Minimal character fields the backend character-package endpoints accept. */
export interface CharacterPackageInput {
  id: string
  name: string
  wardrobe_defaults: string
  facial_blueprint: {
    base_ethnicity_or_type: string
    estimated_age: number
    bone_structure: string
    distinct_markers: string | null
    fixed_seed_reference: number | null
  }
  species?: SpeciesProfile
  physical_form?: PhysicalForm
  /** When set, the backend adds this editable text while retaining structured
   *  identity, species, physical-form anatomy, and marker details. */
  _canonical_prompt?: string | null
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // ignore parse error
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function forgePipeline(
  req: PipelineExecutionRequest
): Promise<StoryboardProject> {
  const res = await fetch(`${BASE_URL}/storyboard/forge-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  return handleResponse<StoryboardProject>(res)
}

export async function generateStoryOutline(context: StoryDevelopmentContext): Promise<string> {
  const res = await fetch(`${BASE_URL}/storyboard/story-development/outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  })
  const data = await handleResponse<{ outline: string }>(res)
  return data.outline
}

export async function generateStoryScript(
  context: StoryDevelopmentContext & { outline: string },
): Promise<string> {
  const res = await fetch(`${BASE_URL}/storyboard/story-development/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  })
  const data = await handleResponse<{ script: string }>(res)
  return data.script
}

export type PipelineProgressEvent =
  | { event: 'stage_start'; stage: string; total?: number }
  | { event: 'stage_done';  stage: string; count?: number; scenes?: number; frames?: number; truncated?: boolean }
  | { event: 'image_progress'; done: number; total: number }
  | { event: 'complete'; project: StoryboardProject }
  | { event: 'error'; detail: string }

export async function forgePipelineStream(
  req: PipelineExecutionRequest,
  onEvent: (e: PipelineProgressEvent) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/storyboard/forge-pipeline-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`
    try { const b = await res.json(); detail = b.detail ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const messages = buf.split('\n\n')
    buf = messages.pop() ?? ''
    for (const msg of messages) {
      if (!msg.trim()) continue
      const eventLine = msg.match(/^event: (.+)$/m)?.[1]
      const dataLine  = msg.match(/^data: (.+)$/ms)?.[1]
      if (!eventLine || !dataLine) continue
      try {
        const parsed = JSON.parse(dataLine)
        if (eventLine === 'complete') {
          onEvent({ event: 'complete', project: parsed as StoryboardProject })
        } else if (eventLine === 'error') {
          onEvent({ event: 'error', detail: parsed.detail })
        } else if (eventLine === 'stage_start') {
          onEvent({ event: 'stage_start', stage: parsed.stage, total: parsed.total })
        } else if (eventLine === 'stage_done') {
          onEvent({ event: 'stage_done', ...parsed })
        } else if (eventLine === 'image_progress') {
          onEvent({ event: 'image_progress', done: parsed.done, total: parsed.total })
        }
      } catch { /* malformed SSE chunk — skip */ }
    }
  }
}

export interface ProjectSummary {
  db_id: number
  project_title: string
  global_aesthetic: string
  render_style: string
  scene_count: number
  frame_count: number
  character_count: number
  color_palettes: string[][]
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const res = await fetch(`${BASE_URL}/storyboard/summaries`)
  return handleResponse<ProjectSummary[]>(res)
}

export async function listProjects(): Promise<StoryboardProject[]> {
  const res = await fetch(`${BASE_URL}/storyboard/`)
  return handleResponse<StoryboardProject[]>(res)
}

export async function getProject(dbId: number): Promise<StoryboardProject> {
  const res = await fetch(`${BASE_URL}/storyboard/${dbId}`)
  return handleResponse<StoryboardProject>(res)
}

export async function createProject(project: StoryboardProject): Promise<StoryboardProject> {
  const res = await fetch(`${BASE_URL}/storyboard/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_title: project.project_title,
      global_aesthetic: project.global_aesthetic,
      render_style: project.render_style,
      characters: project.characters,
      scenes: project.scenes,
      canon: project.canon ?? null,
      story_development: project.story_development ?? null,
    }),
  })
  return handleResponse<StoryboardProject>(res)
}

export async function updateProject(project: StoryboardProject): Promise<StoryboardProject> {
  if (project.db_id == null) throw new Error('Cannot save a project without a database ID.')
  const res = await fetch(`${BASE_URL}/storyboard/${project.db_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_title: project.project_title,
      global_aesthetic: project.global_aesthetic,
      render_style: project.render_style,
      characters: project.characters,
      canon: project.canon ?? null,
      scenes: project.scenes,
      story_development: project.story_development ?? null,
    }),
  })
  return handleResponse<StoryboardProject>(res)
}

export async function deleteProject(dbId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/storyboard/${dbId}`, {
    method: 'DELETE',
  })
  return handleResponse<void>(res)
}

export async function generateImage(
  prompt: string,
  renderStyle: string = 'bw_sketch',
): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/storyboard/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, render_style: renderStyle }),
  })
  const data = await handleResponse<{ image_url: string | null }>(res)
  return data.image_url
}

export type ImageQualityTier = 'draft' | 'premium'

export async function renderFrameImage(
  frame: StoryboardFrame,
  scene: StoryboardScene,
  renderStyle: string = 'bw_sketch',
  qualityTier: ImageQualityTier = 'draft',
  referenceStyleImage?: string | null,
): Promise<{ frame_number: number; generated_image_url: string }> {
  const res = await fetch(`${BASE_URL}/storyboard/frame/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame,
      scene,
      render_style: renderStyle,
      quality_tier: qualityTier,
      reference_style_image: referenceStyleImage ?? null,
    }),
  })
  return handleResponse<{ frame_number: number; generated_image_url: string }>(res)
}

export async function generateCharacterOverview(
  charData: CharacterPackageInput,
): Promise<Partial<CharacterOverview>> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData }),
  })
  return handleResponse<Partial<CharacterOverview>>(res)
}

export async function generateFullCharacterPack(
  charData: CharacterPackageInput,
  renderStyle: string = 'bw_sketch',
  targets: string[] = ['turnaround_360', 'premium_poses', 'material_closeups'],
): Promise<Record<string, Record<string, string | null>>> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/generate-full-pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData, render_style: renderStyle, targets }),
  })
  return handleResponse<Record<string, Record<string, string | null>>>(res)
}

export async function generateCharacterPackage(
  charData: CharacterPackageInput,
  sections: string[],
  renderStyle: string,
  referenceImage: string | null = null,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData, sections, render_style: renderStyle, reference_image: referenceImage }),
  })
  return handleResponse<Record<string, unknown>>(res)
}

// ---------------------------------------------------------------------------
// Director Engine — Continuity & propagation
// ---------------------------------------------------------------------------

export interface ContinuityImpactResult {
  changed_asset_id: string
  changed_asset_type: string
  changed_field: string
  old_value: string
  new_value: string
  affected_frame_ids: string[]         // "scene_{n}_frame_{m}"
  affected_scene_numbers: number[]
  affected_character_ref_ids: string[]
  affected_environment_slugs: string[]
  total_affected: number
  regeneration_prompt: string
}

/** Ask the backend which frames are affected by an asset change. */
export async function scanContinuityImpact(
  project: StoryboardProject,
  changedAssetType: 'character' | 'environment' | 'outfit' | 'prop' | 'style',
  changedAssetId: string,
  changedField: string,
  oldValue: string,
  newValue: string,
): Promise<ContinuityImpactResult> {
  const res = await fetch(`${BASE_URL}/storyboard/continuity/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      changed_asset_type: changedAssetType,
      changed_asset_id: changedAssetId,
      changed_field: changedField,
      old_value: oldValue,
      new_value: newValue,
    }),
  })
  return handleResponse<ContinuityImpactResult>(res)
}

/**
 * Regenerate only the affected frames after a continuity change.
 * Sends each affected frame + its scene to the reforge-composition endpoint
 * so the new canonical value is used in the prompt while everything else is preserved.
 */
export async function reforgeAffectedFrames(
  scenes: StoryboardScene[],
  affectedFrameIds: string[],          // "scene_{n}_frame_{m}"
  renderStyle: string,
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()
  const idSet = new Set(affectedFrameIds)

  await Promise.all(
    scenes.flatMap(scene =>
      scene.frames
        .filter(f => idSet.has(`scene_${scene.scene_number}_frame_${f.frame_number}`))
        .map(async frame => {
          const key = `scene_${scene.scene_number}_frame_${frame.frame_number}`
          try {
            const res = await fetch(`${BASE_URL}/storyboard/frame/reforge-composition`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                frame,
                scene,
                render_style: renderStyle,
                reference_style_image: null,
              }),
            })
            const data = await handleResponse<{ generated_image_url: string | null }>(res)
            results.set(key, data.generated_image_url)
          } catch {
            results.set(key, null)
          }
        })
    )
  )
  return results
}

/** Upload a reference image for a location and propagate to all frames in that location. */
export async function propagateLocationImage(
  scenes: StoryboardScene[],
  locationSlug: string,
  _imageDataUrl: string,
  renderStyle: string,
): Promise<Map<string, string | null>> {
  // Find all scenes whose location_heading contains the slug
  const affectedFrameIds: string[] = []
  scenes.forEach(scene => {
    if (scene.location_heading.toLowerCase().includes(locationSlug.toLowerCase())) {
      scene.frames.forEach(f => {
        affectedFrameIds.push(`scene_${scene.scene_number}_frame_${f.frame_number}`)
      })
    }
  })
  return reforgeAffectedFrames(scenes, affectedFrameIds, renderStyle)
}

/** Update a character's details and return the set of affected frame IDs
 *  without regenerating (caller decides whether to regenerate). */
export async function getCharacterImpact(
  project: StoryboardProject,
  character: CharacterProfile,
  changedField: string,
  oldValue: string,
  newValue: string,
): Promise<ContinuityImpactResult> {
  return scanContinuityImpact(
    project,
    'character',
    character.id,
    changedField,
    oldValue,
    newValue,
  )
}

export async function regenerateCharacterImage(
  charData: CharacterPackageInput,
  section: string,
  renderStyle: string,
  referenceImage: string | null = null,
): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/generate-one`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData, section, render_style: renderStyle, reference_image: referenceImage }),
  })
  const data = await handleResponse<{ image_url: string | null }>(res)
  return data.image_url
}

// ---------------------------------------------------------------------------
// Visual Action regeneration (Tier 2 — Level-2 staging)
// ---------------------------------------------------------------------------

export interface RegenerateVisualActionResult {
  frame_number: number
  visual_action: string
  animation_beats: string[]
  director_notes: string | null
}

/**
 * Ask the backend to produce a new Level-2 visual_action staging direction
 * for a single frame. Does NOT regenerate the image — the caller decides
 * whether to trigger image regeneration after reviewing the new staging.
 */
// ---------------------------------------------------------------------------
// Character Identity System — CKG + QA + Import
// ---------------------------------------------------------------------------

/** Run the Project-Aware Visual QA Engine. */
export async function runCharacterQA(
  generatedPrompt: string,
  identity: CharacterIdentity,
  speciesId = 'human',
  variant?: CharacterVariant,
  assetType: 'character' | 'creature' | 'animal' | 'robot' | 'vehicle' = 'character',
  sceneContext?: string,
  cameraSpec?: string,
): Promise<QAScoreResult> {
  const res = await fetch(`${BASE_URL}/storyboard/character/qa-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generated_prompt: generatedPrompt,
      identity,
      species_id: speciesId,
      variant: variant ?? null,
      asset_type: assetType,
      scene_context: sceneContext ?? null,
      camera_spec: cameraSpec ?? null,
    }),
  })
  return handleResponse<QAScoreResult>(res)
}

/** Run context-aware continuity QA on all frames in a scene. */
export async function runSceneQA(request: SceneQARequest): Promise<SceneContinuityReport> {
  const res = await fetch(`${BASE_URL}/storyboard/scene/qa-continuity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return handleResponse<SceneContinuityReport>(res)
}

/** Upgrade a single frame to a new render style. */
export async function upgradeFrameStyle(
  frame: StoryboardFrame,
  scene: StoryboardScene,
  targetStyle: string,
  sourceImageB64?: string | null,
  canonContext?: Record<string, unknown> | null,
): Promise<FrameUpgradeResult> {
  const res = await fetch(`${BASE_URL}/storyboard/frame/upgrade-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame,
      scene,
      target_style: targetStyle,
      source_image_b64: sourceImageB64 ?? null,
      canon_context: canonContext ?? null,
    }),
  })
  return handleResponse<FrameUpgradeResult>(res)
}

/** Upgrade every frame in a scene to a new render style concurrently. */
export async function upgradeSceneStyle(
  frames: StoryboardFrame[],
  scene: StoryboardScene,
  targetStyle: string,
  canonContext?: Record<string, unknown> | null,
): Promise<SceneUpgradeResult> {
  // Pass existing images as img2img sources to preserve composition
  const sourceImages: Record<number, string> = {}
  for (const f of frames) {
    if (f.generated_image_url) sourceImages[f.frame_number] = f.generated_image_url
  }
  const res = await fetch(`${BASE_URL}/storyboard/scene/upgrade-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frames,
      scene,
      target_style: targetStyle,
      source_images: sourceImages,
      canon_context: canonContext ?? null,
    }),
  })
  return handleResponse<SceneUpgradeResult>(res)
}

export interface ImportAssetResponse {
  character_id: string
  asset_type: string
  stored: boolean
  extracted_description: string | null
  updated_identity_fields: Record<string, string>
}

/** Upload a single reference image into a character's identity slot. */
export async function importCharacterAsset(
  characterId: string,
  assetType: string,
  imageData: string,    // base64 data URL
  extractIdentity = true,
): Promise<ImportAssetResponse> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/import-asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      character_id: characterId,
      asset_type: assetType,
      image_data: imageData,
      extract_identity: extractIdentity,
    }),
  })
  return handleResponse<ImportAssetResponse>(res)
}

/** Write Identity + Species + Variants into the project CKG.
 *  Pass canonicalPrompt to add user-edited prompt text; the backend retains
 *  missing structured identity, species, anatomy and marker details as well. */
export async function updateCKGIdentity(
  projectId: number,
  characterId: string,
  identity: CharacterIdentity,
  species: SpeciesProfile,
  variants: CharacterVariant[],
  canonicalPrompt?: string | null,
  physicalForm?: PhysicalForm,
): Promise<{ character_id: string; appearance_summary: string; canonical_prompt: string }> {
  const res = await fetch(`${BASE_URL}/storyboard/ckg/update-identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      character_id: characterId,
      identity,
      species,
      variants,
      ...(physicalForm ? { physical_form: physicalForm } : {}),
      canonical_prompt: canonicalPrompt ?? null,
    }),
  })
  return handleResponse<{ character_id: string; appearance_summary: string; canonical_prompt: string }>(res)
}

/** Save abilities, visual rules and/or a reference portrait to the project CKG. */
export async function updateCharacterDNA(
  projectId: number,
  characterId: string,
  abilities: string[],
  visualRules: string[],
  referencePortrait?: string | null,
): Promise<{ abilities_saved: number; visual_rules_saved: number; portrait_saved: boolean }> {
  const res = await fetch(`${BASE_URL}/storyboard/character/update-dna`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      character_id: characterId,
      abilities,
      visual_rules: visualRules,
      reference_portrait: referencePortrait ?? null,
    }),
  })
  return handleResponse<{ abilities_saved: number; visual_rules_saved: number; portrait_saved: boolean }>(res)
}

/** Get the full CKG for a project. */
export async function getCKG(projectId: number): Promise<CreativeKnowledgeGraph> {
  const res = await fetch(`${BASE_URL}/storyboard/ckg/${projectId}`)
  return handleResponse<CreativeKnowledgeGraph>(res)
}

/** Get the full species registry from the backend. */
export async function getSpeciesRegistry(): Promise<Record<string, {
  id: string
  label: string
  limbs: string
  anatomy_notes: string
  prompt_prefix: string
}>> {
  const res = await fetch(`${BASE_URL}/storyboard/species-registry`)
  return handleResponse(res)
}


// ---------------------------------------------------------------------------
// Visual Action regeneration
// ---------------------------------------------------------------------------

export async function regenerateVisualAction(
  frame: StoryboardFrame,
  scene: StoryboardScene,
  characters: CharacterProfile[] = [],
  regenerateAnimationBeats = false,
): Promise<RegenerateVisualActionResult> {
  const res = await fetch(`${BASE_URL}/storyboard/frame/regenerate-visual-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame,
      scene,
      characters,
      regenerate_animation_beats: regenerateAnimationBeats,
    }),
  })
  return handleResponse<RegenerateVisualActionResult>(res)
}

// ---------------------------------------------------------------------------
// Standalone save/load — characters, worlds, storyboards (project-independent)
// ---------------------------------------------------------------------------

export interface StandaloneCharacterResponse {
  id: number
  char_id: string
  name: string
  story_role?: string | null
  label?: string | null
  character: CharacterProfile
}

export interface StandaloneWorldResponse {
  id: number
  location_name: string
  label?: string | null
  world: { location_name: string; spatial_textures: string; lighting_keys: string }
}

export interface StandaloneStoryboardResponse {
  id: number
  title: string
  global_aesthetic: string
  render_style: string
  label?: string | null
  scenes: StoryboardScene[]
  scene_count: number
  frame_count: number
}

// ── Characters ──────────────────────────────────────────────────────────────

export async function saveStandaloneCharacter(
  character: CharacterProfile,
  label?: string,
): Promise<StandaloneCharacterResponse> {
  const res = await fetch(`${BASE_URL}/standalone/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character, label: label ?? null }),
  })
  return handleResponse<StandaloneCharacterResponse>(res)
}

export async function listStandaloneCharacters(): Promise<StandaloneCharacterResponse[]> {
  const res = await fetch(`${BASE_URL}/standalone/characters`)
  return handleResponse<StandaloneCharacterResponse[]>(res)
}

export async function getStandaloneCharacter(id: number): Promise<StandaloneCharacterResponse> {
  const res = await fetch(`${BASE_URL}/standalone/characters/${id}`)
  return handleResponse<StandaloneCharacterResponse>(res)
}

export async function deleteStandaloneCharacter(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/standalone/characters/${id}`, { method: 'DELETE' })
  return handleResponse<void>(res)
}

// ── Worlds ───────────────────────────────────────────────────────────────────

export async function saveStandaloneWorld(
  world: { location_name: string; spatial_textures: string; lighting_keys: string },
  label?: string,
): Promise<StandaloneWorldResponse> {
  const res = await fetch(`${BASE_URL}/standalone/worlds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world, label: label ?? null }),
  })
  return handleResponse<StandaloneWorldResponse>(res)
}

export async function listStandaloneWorlds(): Promise<StandaloneWorldResponse[]> {
  const res = await fetch(`${BASE_URL}/standalone/worlds`)
  return handleResponse<StandaloneWorldResponse[]>(res)
}

export async function getStandaloneWorld(id: number): Promise<StandaloneWorldResponse> {
  const res = await fetch(`${BASE_URL}/standalone/worlds/${id}`)
  return handleResponse<StandaloneWorldResponse>(res)
}

export async function deleteStandaloneWorld(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/standalone/worlds/${id}`, { method: 'DELETE' })
  return handleResponse<void>(res)
}

// ── Storyboards ───────────────────────────────────────────────────────────────

export async function saveStandaloneStoryboard(
  title: string,
  globalAesthetic: string,
  renderStyle: string,
  scenes: StoryboardScene[],
  label?: string,
): Promise<StandaloneStoryboardResponse> {
  const res = await fetch(`${BASE_URL}/standalone/storyboards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      global_aesthetic: globalAesthetic,
      render_style: renderStyle,
      scenes,
      label: label ?? null,
    }),
  })
  return handleResponse<StandaloneStoryboardResponse>(res)
}

export async function listStandaloneStoryboards(): Promise<StandaloneStoryboardResponse[]> {
  const res = await fetch(`${BASE_URL}/standalone/storyboards`)
  return handleResponse<StandaloneStoryboardResponse[]>(res)
}

export async function getStandaloneStoryboard(id: number): Promise<StandaloneStoryboardResponse> {
  const res = await fetch(`${BASE_URL}/standalone/storyboards/${id}`)
  return handleResponse<StandaloneStoryboardResponse>(res)
}

export async function deleteStandaloneStoryboard(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/standalone/storyboards/${id}`, { method: 'DELETE' })
  return handleResponse<void>(res)
}

// ---------------------------------------------------------------------------
// Scene Background Variation
// ---------------------------------------------------------------------------

export interface BackgroundVariationResult {
  frame_number: number
  scene_number: number
  generated_image_url: string | null
  variation_index: number
}

/**
 * Generate a single background variation for a frame.
 *
 * The `referenceImage` (the scene's stored reference) is used as the
 * environmental anchor.  Characters, poses, composition, and all continuity
 * fields are preserved — only the background environment changes.
 *
 * Returns null for `generated_image_url` if the image provider failed.
 */
export async function generateBackgroundVariation(
  frame: StoryboardFrame,
  scene: StoryboardScene,
  referenceImage: string,
  renderStyle: string,
  canonContext?: Record<string, unknown> | null,
): Promise<BackgroundVariationResult> {
  const res = await fetch(`${BASE_URL}/storyboard/scene/background-variation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame,
      scene,
      render_style: renderStyle,
      reference_image: referenceImage,
      canon_context: canonContext ?? null,
    }),
  })
  return handleResponse<BackgroundVariationResult>(res)
}
