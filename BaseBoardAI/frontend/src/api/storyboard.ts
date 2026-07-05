import type {
  PipelineExecutionRequest,
  StoryboardProject,
  CharacterOverview,
} from '../types/storyboard'

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
  charData: object,
): Promise<Partial<CharacterOverview>> {
  const res = await fetch(`${BASE_URL}/storyboard/character-package/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char_data: charData }),
  })
  return handleResponse<Partial<CharacterOverview>>(res)
}

export async function generateFullCharacterPack(
  charData: object,
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
  charData: object,
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

export async function regenerateCharacterImage(
  charData: object,
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
