import { useState, useEffect } from 'react'
import type { StoryboardProject } from '../types/storyboard'
import { listProjects, getProject, deleteProject } from '../api/storyboard'

interface Props {
  onLoadProject: (project: StoryboardProject) => void
}

export default function ProjectLibraryPage({ onLoadProject }: Props) {
  const [projects, setProjects] = useState<StoryboardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleLoad(dbId: number) {
    try {
      const project = await getProject(dbId)
      onLoadProject(project)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    }
  }

  async function handleDelete(dbId: number) {
    try {
      await deleteProject(dbId)
      setProjects((prev) => prev.filter((p) => p.db_id !== dbId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
        Loading projects…
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#F5F5F7] dark:bg-[#0d0b14]">
      <h2 className="text-lg font-bold text-[#2D1B69] dark:text-[#e2d9f3] mb-6 tracking-tight">Project Library</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-600 text-sm">
          No saved projects yet. Run the pipeline from the Workspace to create one.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p) => {
            const sceneCount = p.scenes.length
            const frameCount = p.scenes.reduce((s, sc) => s + sc.frames.length, 0)
            return (
              <div key={p.db_id} className="rounded-2xl bg-white dark:bg-[#16102a] border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-3 hover:shadow-md transition-all">
                <div>
                  <h3 className="font-semibold text-[#2D1B69] dark:text-[#e2d9f3] text-sm truncate">{p.project_title}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.global_aesthetic}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{sceneCount} scene{sceneCount !== 1 ? 's' : ''}</span>
                  <span>{frameCount} frame{frameCount !== 1 ? 's' : ''}</span>
                  <span className="text-[#2D1B69] dark:text-[#00D4FF] font-medium">{p.render_style}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => p.db_id != null && handleLoad(p.db_id)}
                    className="flex-1 py-1.5 rounded-lg bg-[#2D1B69] text-white text-xs font-medium hover:bg-[#2D1B69]/90 transition-all"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => p.db_id != null && handleDelete(p.db_id)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs hover:border-red-300 hover:text-red-500 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
