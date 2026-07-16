import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { FrameExportItem, StoryboardProject, StoryboardScene } from '../types/storyboard'

export function downloadFramePng(
  dataUrl: string | null,
  filename = 'frame.png'
): void {
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export function prepareFrameBatch(scenes: StoryboardScene[]): FrameExportItem[] {
  const items: FrameExportItem[] = []
  for (const scene of scenes) {
    for (const frame of scene.frames) {
      if (!frame.generated_image_url) continue
      items.push({
        sceneNumber: scene.scene_number,
        frameNumber: frame.frame_number,
        filename: `s${scene.scene_number}_f${frame.frame_number}.png`,
        dataUrl: frame.generated_image_url,
      })
    }
  }
  return items
}

export function prepareLockedCut(
  scenes: StoryboardScene[],
  selectedKeys: Set<string>
): FrameExportItem[] {
  const items: FrameExportItem[] = []
  for (const scene of scenes) {
    for (const frame of scene.frames) {
      const key = `s${scene.scene_number}_f${frame.frame_number}`
      if (!selectedKeys.has(key)) continue
      if (!frame.generated_image_url) continue
      items.push({
        sceneNumber: scene.scene_number,
        frameNumber: frame.frame_number,
        filename: `${key}.png`,
        dataUrl: frame.generated_image_url,
      })
    }
  }
  return items
}

export function buildManifestMd(
  project: StoryboardProject,
  items: FrameExportItem[]
): string {
  const lines = [
    `# ${project.project_title} — Production Manifest`,
    ``,
    `- **Render Style:** ${project.render_style}`,
    `- **Global Aesthetic:** ${project.global_aesthetic}`,
    `- **Exported:** ${new Date().toISOString()}`,
    ``,
    `| Scene | Frame | Filename |`,
    `|-------|-------|----------|`,
    ...items.map(
      (i) => `| ${i.sceneNumber} | ${i.frameNumber} | ${i.filename} |`
    ),
  ]
  return lines.join('\n')
}

export async function exportLockedCutZip(
  project: StoryboardProject,
  items: FrameExportItem[]
): Promise<void> {
  const zip = new JSZip()
  const folder = zip.folder('frames')!
  for (const item of items) {
    const base64 = item.dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    folder.file(item.filename, bytes)
  }
  zip.file('production_manifest.md', buildManifestMd(project, items))
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${project.project_title}_locked_cut.zip`)
}
