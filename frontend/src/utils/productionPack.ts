import JSZip from 'jszip'
import fileSaver from 'file-saver'
import type { StoryboardFrame, StoryboardProject, StoryboardScene } from '../types/storyboard'

const FORMAT = 'baseboard-production-pack'
const SCHEMA_VERSION = '1.3.0'
const ZIP_ENTRY_DATE = new Date(2000, 0, 1, 0, 0, 0)

type ApprovalStatus = 'pending' | 'approved'

interface ProductionShot {
  scene_id: string
  scene_number: number
  location_heading: string
  environmental_type: string
  time_of_day: string
  emotional_tone: string
  frame_id: string
  frame_number: number
  approval_status: ApprovalStatus
  review_state: 'draft' | 'approved'
  shot_type: string
  narrative_action: string | null
  visual_action: string | null
  action_breakdown: string
  animation_beats: string[]
  action_pose: string | null
  props_present: string[]
  screen_direction: string
  continuity_reference_ids: string[]
  continuity_notes: string | null
  duration_seconds: number
  camera_angle: string
  camera_movement: string | null
  lens: string | null
  focal_length: string | null
  depth_style: string | null
  lighting_notes: string
  mood: string | null
  purpose: string | null
  characters_present: string[]
  frame_emotion: string | null
  dialogue: string | null
  sound_cue: string | null
  director_notes: string | null
  image_path: string | null
}

interface PackImage {
  scene_id: string
  frame_id: string
  path: string
  content_type: string
  bytes: Uint8Array
}

interface MissingStoryboardImage {
  scene_id: string
  scene_number: number
  frame_id: string
  frame_number: number
  approval_status: ApprovalStatus
}

export interface ProductionPackArchive {
  blob: Blob
  shotCount: number
  imageCount: number
  missingImageCount: number
}

export function formatProductionPackDownloadNotice(
  { shotCount, imageCount, missingImageCount }: Omit<ProductionPackArchive, 'blob'>,
): { message: string; type: 'success' | 'info' } {
  const missingSummary = missingImageCount === 0
    ? 'no missing storyboard images'
    : `${missingImageCount} missing storyboard image${missingImageCount === 1 ? '' : 's'}`
  return {
    message: `Production Pack ready — ${shotCount} shot${shotCount === 1 ? '' : 's'}, ${imageCount} image${imageCount === 1 ? '' : 's'}, ${missingSummary}`,
    type: missingImageCount === 0 ? 'success' : 'info',
  }
}

const CSV_COLUMNS = [
  'scene_id', 'scene_number', 'location_heading', 'environmental_type', 'time_of_day', 'emotional_tone',
  'frame_id', 'frame_number', 'approval_status', 'review_state', 'shot_type', 'narrative_action', 'visual_action', 'action_breakdown',
  'animation_beats', 'action_pose', 'props_present', 'screen_direction', 'continuity_reference_ids', 'continuity_notes',
  'duration_seconds', 'camera_angle', 'camera_movement', 'lens', 'focal_length',
  'depth_style', 'lighting_notes', 'mood', 'purpose', 'characters_present', 'frame_emotion', 'dialogue',
  'sound_cue', 'director_notes', 'image_path',
] as const satisfies readonly (keyof ProductionShot)[]

const MIME_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/tiff': 'tif',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
}

function paddedNumber(value: number): string {
  return String(value).padStart(4, '0')
}

function sceneId(sceneNumber: number): string {
  return `scene-${paddedNumber(sceneNumber)}`
}

function frameId(sceneNumber: number, frameNumber: number): string {
  return `${sceneId(sceneNumber)}-frame-${paddedNumber(frameNumber)}`
}

function parseImageDataUrl(dataUrl: string): { contentType: string; extension: string; bytes: Uint8Array } {
  const match = /^data:(image\/[a-z0-9.+-]+)((?:;[^,]*)?),(.*)$/is.exec(dataUrl)
  if (!match) {
    throw new Error('A storyboard image is not a supported image data URL.')
  }

  const contentType = match[1].toLowerCase()
  const parameters = match[2]
  const payload = match[3]
  let bytes: Uint8Array

  if (/;base64(?:;|$)/i.test(parameters)) {
    const binary = atob(payload)
    bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
  } else {
    const decoded: number[] = []
    for (let offset = 0; offset < payload.length;) {
      if (payload[offset] === '%') {
        const hex = payload.slice(offset + 1, offset + 3)
        if (!/^[\da-f]{2}$/i.test(hex)) {
          throw new Error('A storyboard image contains an invalid percent escape.')
        }
        decoded.push(Number.parseInt(hex, 16))
        offset += 3
        continue
      }
      const codePoint = payload.codePointAt(offset)
      if (codePoint === undefined) break
      const character = String.fromCodePoint(codePoint)
      decoded.push(...new TextEncoder().encode(character))
      offset += character.length
    }
    bytes = new Uint8Array(decoded)
  }

  const isSvg = contentType === 'image/svg+xml'
    && /<svg(?:\s|>)/i.test(new TextDecoder().decode(bytes.subarray(0, 4096)))
  const hasSignature = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte)
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end))
  const matchesDeclaredType = isSvg
    || (contentType === 'image/png' && hasSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || ((contentType === 'image/jpeg' || contentType === 'image/jpg') && hasSignature([0xff, 0xd8, 0xff]))
    || (contentType === 'image/gif' && ['GIF87a', 'GIF89a'].includes(ascii(0, 6)))
    || (contentType === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP')
    || (contentType === 'image/bmp' && ascii(0, 2) === 'BM')
    || (contentType === 'image/tiff' && (hasSignature([0x49, 0x49, 0x2a, 0x00]) || hasSignature([0x4d, 0x4d, 0x00, 0x2a])))
    || (contentType === 'image/x-icon' && hasSignature([0x00, 0x00, 0x01, 0x00]))
    || (contentType === 'image/avif' && ascii(4, 8) === 'ftyp' && /^(avif|avis)$/.test(ascii(8, 12)))
  if (bytes.length === 0 || !matchesDeclaredType || !MIME_EXTENSIONS[contentType]) {
    throw new Error(`A storyboard image has invalid or unsupported ${contentType} data.`)
  }

  return { contentType, extension: MIME_EXTENSIONS[contentType] ?? 'img', bytes }
}

function sortedScenes(scenes: StoryboardScene[]): StoryboardScene[] {
  return [...scenes].sort((left, right) => left.scene_number - right.scene_number)
}

function sortedFrames(scene: StoryboardScene): StoryboardFrame[] {
  return [...scene.frames].sort((left, right) => left.frame_number - right.frame_number)
}

function makeShot(scene: StoryboardScene, frame: StoryboardFrame, imagePath: string | null): ProductionShot {
  return {
    scene_id: sceneId(scene.scene_number),
    scene_number: scene.scene_number,
    location_heading: scene.location_heading,
    environmental_type: scene.environmental_type,
    time_of_day: scene.time_of_day,
    emotional_tone: scene.emotional_tone,
    frame_id: frameId(scene.scene_number, frame.frame_number),
    frame_number: frame.frame_number,
    approval_status: frame.approval_status ?? 'pending',
    review_state: frame.approval_status === 'approved' ? 'approved' : 'draft',
    shot_type: frame.shot_type,
    narrative_action: frame.narrative_action,
    visual_action: frame.visual_action,
    action_breakdown: frame.action_breakdown,
    animation_beats: frame.animation_beats,
    action_pose: frame.action_pose ?? null,
    props_present: frame.props_present ?? [],
    screen_direction: frame.screen_direction ?? 'unspecified',
    continuity_reference_ids: frame.continuity_reference_ids ?? [],
    continuity_notes: frame.continuity_notes ?? null,
    duration_seconds: frame.duration_seconds,
    camera_angle: frame.camera_angle,
    camera_movement: frame.camera_movement,
    lens: frame.lens ?? null,
    focal_length: frame.focal_length ?? null,
    depth_style: frame.depth_style ?? null,
    lighting_notes: frame.lighting_notes,
    mood: frame.mood,
    purpose: frame.purpose,
    characters_present: frame.characters_present,
    frame_emotion: frame.frame_emotion,
    dialogue: frame.dialogue,
    sound_cue: frame.sound_cue,
    director_notes: frame.director_notes,
    image_path: imagePath,
  }
}

function csvCell(value: string | number | string[] | null): string {
  const rawText = value === null ? '' : Array.isArray(value) ? JSON.stringify(value) : String(value)
  const text = typeof value === 'number' || !/^[\s\p{Cc}]*[=+\-@]/u.test(rawText)
    ? rawText
    : `'${rawText}`
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(shots: ProductionShot[]): string {
  const header = CSV_COLUMNS.map(csvCell).join(',')
  const rows = shots.map(shot => CSV_COLUMNS.map(column => csvCell(shot[column])).join(','))
  return [header, ...rows].join('\r\n') + '\r\n'
}

function safeFileSlug(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
  return slug || 'production-pack'
}

function buildProductionPackData(project: StoryboardProject, scenes: StoryboardScene[]) {
  const seenScenes = new Set<number>()
  for (const scene of scenes) {
    if (!Number.isSafeInteger(scene.scene_number) || scene.scene_number < 1 || seenScenes.has(scene.scene_number)) {
      throw new Error(`Duplicate or invalid scene number: ${scene.scene_number}`)
    }
    seenScenes.add(scene.scene_number)
    const seenFrames = new Set<number>()
    for (const frame of scene.frames) {
      if (!Number.isSafeInteger(frame.frame_number) || frame.frame_number < 1 || seenFrames.has(frame.frame_number)) {
        throw new Error(`Duplicate or invalid frame number ${frame.frame_number} in scene ${scene.scene_number}`)
      }
      seenFrames.add(frame.frame_number)
    }
  }

  const images: PackImage[] = []
  const shots: ProductionShot[] = []
  const missingStoryboardImages: MissingStoryboardImage[] = []
  const sceneRecords = sortedScenes(scenes).map(scene => {
    const sceneKey = sceneId(scene.scene_number)
    const sceneShots = sortedFrames(scene).map(frame => {
      let imagePath: string | null = null
      if (frame.generated_image_url) {
        const image = parseImageDataUrl(frame.generated_image_url)
        imagePath = `images/${sceneKey}/frame-${paddedNumber(frame.frame_number)}.${image.extension}`
        images.push({
          scene_id: sceneKey,
          frame_id: frameId(scene.scene_number, frame.frame_number),
          path: imagePath,
          content_type: image.contentType,
          bytes: image.bytes,
        })
      }
      const shot = makeShot(scene, frame, imagePath)
      shots.push(shot)
      if (imagePath === null) {
        missingStoryboardImages.push({
          scene_id: shot.scene_id,
          scene_number: shot.scene_number,
          frame_id: shot.frame_id,
          frame_number: shot.frame_number,
          approval_status: shot.approval_status,
        })
      }
      return shot
    })

    return {
      scene_id: sceneKey,
      scene_number: scene.scene_number,
      location_heading: scene.location_heading,
      environmental_type: scene.environmental_type,
      time_of_day: scene.time_of_day,
      emotional_tone: scene.emotional_tone,
      color_palette: scene.color_palette,
      shots: sceneShots,
    }
  })

  const projectDocument = {
    format: FORMAT,
    schema_version: SCHEMA_VERSION,
    project: {
      project_id: project.db_id,
      title: project.project_title,
      global_aesthetic: project.global_aesthetic,
      render_style: project.render_style,
      canon: project.canon ?? null,
      story_development: project.story_development ?? null,
      characters: project.characters,
      scenes: sceneRecords,
    },
  }

  const manifest = {
    format: FORMAT,
    schema_version: SCHEMA_VERSION,
    project_title: project.project_title,
    files: {
      project_json: 'project.json',
      shots_csv: 'shots.csv',
    },
    counts: {
      scenes: sceneRecords.length,
      shots: shots.length,
      approved_shots: shots.filter(shot => shot.review_state === 'approved').length,
      draft_shots: shots.filter(shot => shot.review_state === 'draft').length,
      images: images.length,
      missing_storyboard_images: missingStoryboardImages.length,
    },
    images: images.map(({ scene_id, frame_id, path, content_type }) => ({
      scene_id,
      frame_id,
      path,
      content_type,
    })),
    missing_storyboard_images: missingStoryboardImages,
  }

  return { projectDocument, manifest, shots, images, missingStoryboardImages }
}

export async function createProductionPackArchive(
  project: StoryboardProject,
  scenes: StoryboardScene[] = project.scenes,
): Promise<ProductionPackArchive> {
  const { projectDocument, manifest, shots, images, missingStoryboardImages } = buildProductionPackData(project, scenes)
  const zip = new JSZip()
  const fileOptions = { date: ZIP_ENTRY_DATE, createFolders: false }
  zip.file('project.json', `${JSON.stringify(projectDocument, null, 2)}\n`, fileOptions)
  zip.file('shots.csv', toCsv(shots), fileOptions)
  for (const image of images) {
    zip.file(image.path, image.bytes, { ...fileOptions, binary: true })
  }
  zip.file('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, fileOptions)

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return {
    blob,
    shotCount: shots.length,
    imageCount: images.length,
    missingImageCount: missingStoryboardImages.length,
  }
}

export function downloadProductionPackArchive(archive: ProductionPackArchive, projectTitle: string): void {
  fileSaver.saveAs(archive.blob, `${safeFileSlug(projectTitle)}_production_pack.zip`)
}

export async function exportProductionPackZip(
  project: StoryboardProject,
  scenes: StoryboardScene[] = project.scenes,
): Promise<{ shotCount: number; imageCount: number; missingImageCount: number }> {
  const archive = await createProductionPackArchive(project, scenes)
  downloadProductionPackArchive(archive, project.project_title)
  return {
    shotCount: archive.shotCount,
    imageCount: archive.imageCount,
    missingImageCount: archive.missingImageCount,
  }
}
