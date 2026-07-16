import type {
  CharacterIdentity,
  CharacterProfile,
  CharacterOverview,
  CharacterVariant,
  CreativeKnowledgeGraph,
  PipelineExecutionRequest,
  QAScoreResult,
  SpeciesProfile,
  StoryboardFrame,
  StoryboardProject,
  StoryboardScene,
} from '../types/storyboard'

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

export async function listProjects(): Promise<StoryboardProject[]> {
  const res = await fetch(`${BASE_URL}/storyboard/`)
  return handleResponse<StoryboardProject[]>(res)
}

export async function getProject(dbId: number): Promise<StoryboardProject> {
  const res = await fetch(`${BASE_URL}/storyboard/${dbId}`)
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
  renderStyle: string = 'bw_sketch',
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData, sections, render_style: renderStyle }),
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
  imageDataUrl: string,
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
  renderStyle: string = 'bw_sketch',
): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/generate-one`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData, section, render_style: renderStyle }),
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

/** Write Identity + Species + Variants into the project CKG. */
export async function updateCKGIdentity(
  projectId: number,
  characterId: string,
  identity: CharacterIdentity,
  species: SpeciesProfile,
  variants: CharacterVariant[],
): Promise<{ character_id: string; appearance_summary: string }> {
  const res = await fetch(`${BASE_URL}/storyboard/ckg/update-identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      character_id: characterId,
      identity,
      species,
      variants,
    }),
  })
  return handleResponse<{ character_id: string; appearance_summary: string }>(res)
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
