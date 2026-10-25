import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'

export interface ContinuitySource {
  frame_id: string
  scene_number: number
  frame_number: number
  approval_status: 'pending' | 'approved'
  review_required: boolean
  available: boolean
  image_url: string | null
  visual_action: string | null
  action_pose: string | null
  props_present: string[]
  screen_direction: StoryboardFrame['screen_direction']
}

export function getShotId(sceneNumber: number, frameNumber: number): string {
  return `scene_${sceneNumber}_frame_${frameNumber}`
}

export function resolveFrameContinuityInputs(
  scenes: StoryboardScene[],
  sceneNumber: number,
  frameNumber: number,
): ContinuitySource[] {
  const frame = scenes
    .find(scene => scene.scene_number === sceneNumber)
    ?.frames.find(item => item.frame_number === frameNumber)
  if (!frame) return []

  const framesById = new Map<string, { sceneNumber: number; frame: StoryboardFrame }>()
  for (const scene of scenes) {
    for (const item of scene.frames) {
      framesById.set(getShotId(scene.scene_number, item.frame_number), {
        sceneNumber: scene.scene_number,
        frame: item,
      })
    }
  }

  return (frame.continuity_dependency_ids ?? []).map(frameId => {
    const source = framesById.get(frameId)
    const sourceFrame = source?.frame
    const approved = sourceFrame?.approval_status === 'approved'
    const reviewRequired = Boolean(sourceFrame?.continuity_review_required)
    return {
      frame_id: frameId,
      scene_number: source?.sceneNumber ?? 0,
      frame_number: sourceFrame?.frame_number ?? 0,
      approval_status: sourceFrame?.approval_status ?? 'pending',
      review_required: reviewRequired,
      available: Boolean(sourceFrame && approved && !reviewRequired),
      image_url: sourceFrame?.generated_image_url ?? null,
      visual_action: sourceFrame?.visual_action ?? sourceFrame?.action_breakdown ?? null,
      action_pose: sourceFrame?.action_pose ?? null,
      props_present: sourceFrame?.props_present ?? [],
      screen_direction: sourceFrame?.screen_direction ?? 'unspecified',
    }
  })
}

const SHOT_OUTPUT_FIELDS: (keyof StoryboardFrame)[] = [
  'narrative_action', 'visual_action', 'animation_beats', 'action_pose',
  'props_present', 'screen_direction', 'continuity_dependency_ids',
  'shot_type', 'camera_angle', 'camera_movement', 'duration_seconds',
  'lighting_notes', 'mood', 'characters_present', 'frame_emotion',
  'generated_image_url',
]

function changedShotOutput(
  previous: StoryboardFrame,
  next: StoryboardFrame,
  patch: Partial<StoryboardFrame>,
): boolean {
  if (previous.approval_status !== next.approval_status) return true
  return SHOT_OUTPUT_FIELDS.some(field =>
    Object.prototype.hasOwnProperty.call(patch, field)
    && JSON.stringify(previous[field]) !== JSON.stringify(next[field]),
  )
}

/** Apply a shot edit and conservatively invalidate all transitive dependants. */
export function patchShotWithContinuityReview(
  scenes: StoryboardScene[],
  sceneNumber: number,
  frameNumber: number,
  patch: Partial<StoryboardFrame>,
): StoryboardScene[] {
  const targetId = getShotId(sceneNumber, frameNumber)
  const targetScene = scenes.find(scene => scene.scene_number === sceneNumber)
  const previous = targetScene?.frames.find(frame => frame.frame_number === frameNumber)
  if (!previous) return scenes

  const nextFrame: StoryboardFrame = {
    ...previous,
    ...patch,
    approval_status: patch.approval_status ?? 'pending',
    continuity_review_required: patch.approval_status === 'approved'
      ? false
      : previous.continuity_review_required ?? false,
  }
  const invalidatesDependants = changedShotOutput(previous, nextFrame, patch)
  let updatedScenes = scenes.map(scene => scene.scene_number !== sceneNumber
    ? scene
    : {
      ...scene,
      frames: scene.frames.map(frame => frame.frame_number === frameNumber ? nextFrame : frame),
    })

  if (!invalidatesDependants) return updatedScenes

  const invalidated = new Set<string>([targetId])
  const pending = [targetId]
  while (pending.length > 0) {
    const sourceId = pending.shift()!
    for (const scene of updatedScenes) {
      for (const frame of scene.frames) {
        const frameId = getShotId(scene.scene_number, frame.frame_number)
        if (invalidated.has(frameId) || !(frame.continuity_dependency_ids ?? []).includes(sourceId)) continue
        invalidated.add(frameId)
        pending.push(frameId)
      }
    }
  }

  updatedScenes = updatedScenes.map(scene => ({
    ...scene,
    frames: scene.frames.map(frame => {
      const frameId = getShotId(scene.scene_number, frame.frame_number)
      if (frameId === targetId || !invalidated.has(frameId)) return frame
      return {
        ...frame,
        approval_status: 'pending',
        continuity_review_required: true,
      }
    }),
  }))
  return updatedScenes
}
