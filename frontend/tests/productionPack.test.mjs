import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import {
  createProductionPackArchive,
  formatProductionPackDownloadNotice,
} from '../src/utils/productionPack.ts'

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function frame({ frame_number, approval_status, generated_image_url = null }) {
  return {
    frame_number,
    narrative_action: null,
    visual_action: `Test action ${frame_number}`,
    animation_beats: [],
    action_pose: 'Standing, facing screen left',
    props_present: ['blue notebook'],
    screen_direction: 'left_to_right',
    continuity_reference_ids: ['scene_1_frame_1'],
    continuity_notes: 'Keep the notebook in her right hand.',
    action_breakdown: `Test action ${frame_number}`,
    shot_type: 'Medium Shot',
    camera_angle: 'Eye Level',
    camera_movement: null,
    duration_seconds: 4,
    lighting_notes: 'Soft light',
    mood: null,
    purpose: null,
    characters_present: [],
    frame_emotion: null,
    dialogue: null,
    director_notes: null,
    sound_cue: null,
    generated_image_url,
    ...(approval_status ? { approval_status } : {}),
  }
}

function scene(frames) {
  return {
    scene_number: 1,
    location_heading: 'INT. SAMPLE ROOM - DAY',
    environmental_type: 'Interior',
    time_of_day: 'Day',
    emotional_tone: 'Curious',
    color_palette: ['blue'],
    frames,
  }
}

function project(scenes) {
  return {
    db_id: 12,
    project_title: 'Sample Export',
    global_aesthetic: 'Clean cinematic look',
    render_style: 'full_shaded',
    characters: [{
      id: 'CHAR_1',
      name: 'Lea',
      facial_blueprint: { base_ethnicity_or_type: 'unspecified' },
      wardrobe_defaults: 'blue coat',
      reference_image: 'data:image/png;base64,reference',
      identity: { name: 'Lea', reference_primary: 'data:image/jpeg;base64,portrait' },
    }],
    scenes,
    canon: { world_bible_summary: 'A city built above the clouds' },
    story_development: {
      idea: 'A courier discovers a message in the clouds',
      format: 'short film',
      genre: 'science fiction',
      notes: 'Keep the tone intimate.',
      outline: 'The courier investigates.',
      script: 'EXT. SKYBRIDGE - DAY',
    },
  }
}

async function readArchive(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const readText = async name => {
    const file = zip.file(name)
    assert.ok(file, `Expected ${name} in the Production Pack archive`)
    return file.async('string')
  }
  return {
    zip,
    projectDocument: JSON.parse(await readText('project.json')),
    manifest: JSON.parse(await readText('manifest.json')),
    csv: await readText('shots.csv'),
  }
}

test('exports approved and pending shots in versioned JSON and CSV', async () => {
  const scenes = [scene([
    frame({ frame_number: 2, generated_image_url: null }),
    frame({
      frame_number: 1,
      approval_status: 'approved',
      generated_image_url: `data:image/png;base64,${TINY_PNG}`,
    }),
  ])]
  const archive = await createProductionPackArchive(project(scenes), scenes)
  const { zip, projectDocument, manifest, csv } = await readArchive(archive.blob)
  const shots = projectDocument.project.scenes.flatMap(item => item.shots)

  assert.equal(projectDocument.schema_version, '1.3.0')
  assert.equal(manifest.schema_version, '1.3.0')
  assert.equal(archive.shotCount, 2, 'pending shots remain in the pack')
  assert.equal(archive.imageCount, 1)
  assert.equal(archive.missingImageCount, 1)
  assert.deepEqual(shots.map(shot => shot.approval_status), ['approved', 'pending'])
  assert.deepEqual(shots.map(shot => shot.review_state), ['approved', 'draft'])
  assert.equal(manifest.counts.approved_shots, 1)
  assert.equal(manifest.counts.draft_shots, 1)
  assert.match(csv.split('\r\n')[0], /"approval_status","review_state"/)
  assert.match(csv, /"scene-0001-frame-0001","1","approved","approved"/)
  assert.match(csv, /"scene-0001-frame-0002","2","pending","draft"/)
  assert.ok(zip.file('images/scene-0001/frame-0001.png'))
  assert.equal(projectDocument.project.canon.world_bible_summary, 'A city built above the clouds')
  assert.equal(projectDocument.project.characters[0].reference_image, 'data:image/png;base64,reference')
  assert.equal(projectDocument.project.characters[0].identity.reference_primary, 'data:image/jpeg;base64,portrait')
  assert.deepEqual(projectDocument.project.story_development, project(scenes).story_development)
  assert.equal(shots[0].action_pose, 'Standing, facing screen left')
  assert.deepEqual(shots[0].props_present, ['blue notebook'])
  assert.deepEqual(shots[0].continuity_reference_ids, ['scene_1_frame_1'])
})

test('records missing storyboard images and their approval status in the manifest', async () => {
  const scenes = [scene([frame({ frame_number: 3 })])]
  const archive = await createProductionPackArchive(project(scenes), scenes)
  const { projectDocument, manifest, csv } = await readArchive(archive.blob)
  const missing = manifest.missing_storyboard_images

  assert.equal(archive.shotCount, 1)
  assert.equal(archive.imageCount, 0)
  assert.equal(archive.missingImageCount, 1)
  assert.equal(manifest.counts.missing_storyboard_images, 1)
  assert.deepEqual(missing, [{
    scene_id: 'scene-0001',
    scene_number: 1,
    frame_id: 'scene-0001-frame-0003',
    frame_number: 3,
    approval_status: 'pending',
  }])
  assert.equal(projectDocument.project.scenes[0].shots[0].approval_status, 'pending')
  assert.equal(projectDocument.project.scenes[0].shots[0].image_path, null)
  assert.match(csv, /"scene-0001-frame-0003","3","pending","draft"/)
})

test('reports an empty missing-image inventory when every storyboard frame has an image', async () => {
  const scenes = [scene([frame({
    frame_number: 1,
    approval_status: 'approved',
    generated_image_url: `data:image/png;base64,${TINY_PNG}`,
  })])]
  const archive = await createProductionPackArchive(project(scenes), scenes)
  const { manifest } = await readArchive(archive.blob)

  assert.equal(archive.missingImageCount, 0)
  assert.equal(manifest.counts.missing_storyboard_images, 0)
  assert.deepEqual(manifest.missing_storyboard_images, [])
})

test('download notice reports pack readiness and missing storyboard images', () => {
  assert.deepEqual(formatProductionPackDownloadNotice({
    shotCount: 3,
    imageCount: 2,
    missingImageCount: 1,
  }), {
    message: 'Production Pack ready — 3 shots, 2 images, 1 missing storyboard image',
    type: 'info',
  })

  assert.deepEqual(formatProductionPackDownloadNotice({
    shotCount: 1,
    imageCount: 1,
    missingImageCount: 0,
  }), {
    message: 'Production Pack ready — 1 shot, 1 image, no missing storyboard images',
    type: 'success',
  })
})

test('rejects image data whose bytes do not match its declared media type', async () => {
  const scenes = [scene([frame({ frame_number: 1, generated_image_url: 'data:image/png;base64,AQID' })])]
  await assert.rejects(
    createProductionPackArchive(project(scenes), scenes),
    /invalid or unsupported image\/png data/i,
  )
})

test('preserves binary bytes in percent-encoded image data URLs', async () => {
  const pngBytes = Buffer.from(TINY_PNG, 'base64')
  const encodedPng = [...pngBytes].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join('')
  const scenes = [scene([frame({ frame_number: 1, generated_image_url: `data:image/png,${encodedPng}` })])]
  const archive = await createProductionPackArchive(project(scenes), scenes)
  const { zip } = await readArchive(archive.blob)
  const exportedBytes = await zip.file('images/scene-0001/frame-0001.png').async('uint8array')
  assert.deepEqual(Buffer.from(exportedBytes), pngBytes)
})

test('rejects duplicate scene and frame identifiers before creating ZIP paths', async () => {
  const first = scene([frame({ frame_number: 1 })])
  const duplicateScene = { ...scene([frame({ frame_number: 2 })]), scene_number: 1 }
  await assert.rejects(
    createProductionPackArchive(project([first, duplicateScene]), [first, duplicateScene]),
    /Duplicate or invalid scene number: 1/,
  )

  const duplicateFrameScene = scene([frame({ frame_number: 1 }), frame({ frame_number: 1 })])
  await assert.rejects(
    createProductionPackArchive(project([duplicateFrameScene]), [duplicateFrameScene]),
    /Duplicate or invalid frame number 1 in scene 1/,
  )
})

test('neutralizes spreadsheet formula-leading text in CSV cells', async () => {
  const maliciousFrame = frame({ frame_number: 1 })
  maliciousFrame.visual_action = '=1+1'
  const scenes = [scene([maliciousFrame])]
  const archive = await createProductionPackArchive(project(scenes), scenes)
  const { csv } = await readArchive(archive.blob)
  assert.ok(csv.includes("\"'=1+1\""))
})
