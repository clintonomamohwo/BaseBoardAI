import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getShotId,
  patchShotWithContinuityReview,
  resolveFrameContinuityInputs,
} from '../src/utils/shotContinuity.ts'

function frame(frame_number, overrides = {}) {
  return {
    frame_number,
    narrative_action: null,
    visual_action: `Shot ${frame_number} action`,
    animation_beats: [],
    action_breakdown: `Shot ${frame_number} action`,
    action_pose: `Shot ${frame_number} ending pose`,
    props_present: [`prop-${frame_number}`],
    screen_direction: 'static',
    continuity_dependency_ids: [],
    continuity_review_required: false,
    shot_type: 'Medium Shot',
    camera_angle: 'Eye-level',
    camera_movement: null,
    duration_seconds: 3,
    lighting_notes: 'Soft light',
    mood: null,
    purpose: null,
    characters_present: [],
    frame_emotion: null,
    dialogue: null,
    director_notes: null,
    sound_cue: null,
    generated_image_url: `mock://shot-${frame_number}`,
    approval_status: 'approved',
    ...overrides,
  }
}

function threeShotSequence() {
  return [{
    scene_number: 1,
    location_heading: 'INT. TEST ROOM - DAY',
    environmental_type: 'Interior',
    time_of_day: 'Day',
    emotional_tone: 'Focused',
    color_palette: ['#333333'],
    frames: [
      frame(1),
      frame(2, { continuity_dependency_ids: [getShotId(1, 1)] }),
      frame(3, { continuity_dependency_ids: [getShotId(1, 2)] }),
    ],
  }]
}

test('three-shot chain resolves approved ending frames and propagates source edits for review', () => {
  const original = threeShotSequence()
  const shot2Input = resolveFrameContinuityInputs(original, 1, 2)
  const shot3Input = resolveFrameContinuityInputs(original, 1, 3)

  assert.equal(shot2Input.length, 1)
  assert.equal(shot2Input[0].available, true)
  assert.equal(shot2Input[0].frame_id, 'scene_1_frame_1')
  assert.equal(shot2Input[0].image_url, 'mock://shot-1')
  assert.equal(shot2Input[0].action_pose, 'Shot 1 ending pose')
  assert.deepEqual(shot2Input[0].props_present, ['prop-1'])
  assert.equal(shot3Input[0].available, true)
  assert.equal(shot3Input[0].action_pose, 'Shot 2 ending pose')

  const edited = patchShotWithContinuityReview(original, 1, 1, {
    action_pose: 'Shot 1 now ends seated, facing the door',
  })
  const [shot1, shot2, shot3] = edited[0].frames

  assert.equal(shot1.approval_status, 'pending', 'editing resets the source approval')
  assert.equal(shot2.approval_status, 'pending')
  assert.equal(shot2.continuity_review_required, true)
  assert.equal(shot3.approval_status, 'pending', 'review propagates through the dependency chain')
  assert.equal(shot3.continuity_review_required, true)
  assert.equal(resolveFrameContinuityInputs(edited, 1, 2)[0].available, false)
  assert.equal(resolveFrameContinuityInputs(edited, 1, 3)[0].available, false)

  const reapprovedShot1 = patchShotWithContinuityReview(edited, 1, 1, { approval_status: 'approved' })
  assert.equal(resolveFrameContinuityInputs(reapprovedShot1, 1, 2)[0].available, true)
  assert.equal(reapprovedShot1[0].frames[1].continuity_review_required, true,
    'upstream approval does not silently clear downstream review')
})
