import type { StoryboardProject, StoryboardScene } from '../types/storyboard'

interface Props {
  project: StoryboardProject
  activeSceneNumber: number
  onSelectScene: (scene: StoryboardScene) => void
}

export default function SceneIndex({ project, activeSceneNumber, onSelectScene }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Scene Index</p>
        <input placeholder="Search scenes…"
          style={{
            width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '5px 8px', fontSize: 10, color: 'var(--text-base)',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Staggered scene list */}
      <div className="flex-1 overflow-y-auto py-1 scene-stagger">
        {project.scenes.map((scene) => {
          const active = scene.scene_number === activeSceneNumber
          return (
            <button key={scene.scene_number} onClick={() => onSelectScene(scene)}
              className="w-full text-left px-3 py-2.5 transition-all btn-tactile"
              style={{
                borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                background: active ? 'var(--gold-dim)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.15em', color: active ? 'var(--gold)' : 'var(--gold)', opacity: active ? 1 : 0.4 }}>
                  SCENE {String(scene.scene_number).padStart(2, '0')}
                </span>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-base)', opacity: 0.7, lineHeight: 1.3 }} className="truncate">
                {scene.location_heading}
              </p>
              <p style={{ fontSize: 9, marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? 'var(--gold)' : 'var(--text-muted)', opacity: active ? 0.6 : 0.4 }}>
                {scene.time_of_day}
              </p>
            </button>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px' }}>
        <button className="btn-tactile" style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
          + New Scene
        </button>
      </div>
    </div>
  )
}
