import type {
  PipelineExecutionRequest,
  StoryboardProject,
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
