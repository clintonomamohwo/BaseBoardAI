import { useState, useEffect, useCallback } from 'react'
import logoSrc from './assets/logo.png'
import type { RenderStyle, StoryboardProject } from './types/storyboard'
import { useDirectorsLight } from './hooks/useDirectorsLight'
import { DEMO_PROJECT } from './data/demoProject'
import LandingPage            from './pages/LandingPage'
import CompassNavPage         from './pages/CompassNavPage'
import NewProjectPage         from './pages/NewProjectPage'
import GenesisEnginePage      from './pages/GenesisEnginePage'
import CreativeDirectorReport from './pages/CreativeDirectorReport'
import StudioPage             from './pages/StudioPage'
import CharacterDictionaryPage from './pages/CharacterDictionaryPage'
import WorldBiblePage         from './pages/WorldBiblePage'
import ProjectLibraryPage     from './pages/ProjectLibraryPage'
import ThemeToggle            from './components/ThemeToggle'
import GraniteNotification    from './components/GraniteNotification'

type AppView =
  | 'landing'
  | 'compass'
  | 'new-project'      // 3-card creation method selector
  | 'genesis-running'  // AI analysis pipeline
  | 'report'           // Creative Director's Report
  | 'studio'
  | 'library'          // Project folder library

type StudioTab = 'storyboard' | 'characters' | 'world-bible'

interface Notif { id: number; message: string; type?: 'success' | 'info' }

interface GenesisState { file: File | null; title: string; renderStyle: RenderStyle }

function getInitialDark(): boolean {
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return true
}

export default function App() {
  // BMS-1: Director's Light — activate once for the whole app
  useDirectorsLight()

  const [view, setView]              = useState<AppView>('landing')
  const [studioTab, setStudioTab]    = useState<StudioTab>('storyboard')
  const [project, setProject]        = useState<StoryboardProject | null>(null)
  const [isDark, setIsDark]          = useState(getInitialDark)
  const [tabKey, setTabKey]          = useState(0)
  const [notifs, setNotifs]          = useState<Notif[]>([])
  const [notifId, setNotifId]        = useState(0)
  const [idle, setIdle]              = useState(false)
  const [genesisState, setGenesisState] = useState<GenesisState>({ file: null, title: '', renderStyle: 'bw_sketch' })
  // Completed project held for the Report screen before entering Studio
  const [pendingProject, setPending] = useState<StoryboardProject | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reset = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 10000) }
    reset()
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    return () => { clearTimeout(t); window.removeEventListener('mousemove', reset); window.removeEventListener('keydown', reset) }
  }, [])

  const pushNotif = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = notifId + 1
    setNotifId(id)
    setNotifs(n => [...n, { id, message, type }])
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 3500)
  }, [notifId])

  /** Genesis Engine finished — show the report before Studio */
  function handleGenesisComplete(p: StoryboardProject) {
    setPending(p)
    setView('report')
  }

  /** User clicks "Enter Studio" on the report card */
  function handleEnterStudio() {
    if (!pendingProject) return
    setProject(pendingProject)
    setPending(null)
    setStudioTab('storyboard')
    setView('studio')
    pushNotif('Genesis Engine complete — your project is ready ✓')
  }

  function handleLoadDemo() {
    setPending(DEMO_PROJECT)
    setView('report')
    pushNotif('Demo project loaded — The Last Broadcast ✓', 'info')
  }

  function handleStartBlank() {
    // Start Blank skips Genesis Engine entirely — goes straight to Studio
    // with a null project so the user sees the empty PipelineForm.
    setProject(null)
    setStudioTab('storyboard')
    setView('studio')
  }

  function handleFileReady(file: File, title: string, renderStyle: RenderStyle = 'bw_sketch') {
    setGenesisState({ file, title, renderStyle })
    setView('genesis-running')
  }

  function handleLoadProject(p: StoryboardProject) {
    setProject(p)
    setStudioTab('storyboard')
    setView('studio')
    pushNotif(`"${p.project_title}" loaded ✓`)
  }

  function switchTab(tab: StudioTab) {
    setStudioTab(tab)
    setTabKey(k => k + 1)
  }

  function handleDeleteScene(sceneNumber: number) {
    setProject(p => p ? {
      ...p,
      scenes: p.scenes.filter(s => s.scene_number !== sceneNumber),
    } : p)
  }

  /* ─── Landing ─────────────────────────────────────────────────────────── */
  if (view === 'landing') return (
    <LandingPage
      onNewProject={() => setView('new-project')}
      onEnter={() => setView('compass')}
      onDemo={handleLoadDemo}
      idle={idle}
    />
  )

  /* ─── Compass nav ─────────────────────────────────────────────────────── */
  if (view === 'compass') return (
    <CompassNavPage
      entering
      onSelect={(s) => { switchTab(s as StudioTab); setView('studio') }}
    />
  )

  /* ─── New Project — 3-card creation selector ──────────────────────────── */
  if (view === 'new-project') return (
    <NewProjectPage
      onFileReady={handleFileReady}
      onStartBlank={handleStartBlank}
      onLanding={() => setView('landing')}
    />
  )

  /* ─── Genesis running ─────────────────────────────────────────────────── */
  if (view === 'genesis-running') return (
    <GenesisEnginePage
      file={genesisState.file}
      projectTitle={genesisState.title}
      renderStyle={genesisState.renderStyle}
      onComplete={handleGenesisComplete}
      onNotify={pushNotif}
      onLanding={() => setView('landing')}
      onBack={() => setView('new-project')}
    />
  )

  /* ─── Project Library ────────────────────────────────────────────────── */
  if (view === 'library') return (
    <ProjectLibraryPage
      onLoadProject={handleLoadProject}
      onNewProject={() => setView('new-project')}
      onLanding={() => setView('landing')}
    />
  )

  /* ─── Creative Director's Report ─────────────────────────────────────── */
  if (view === 'report' && pendingProject) return (
    <CreativeDirectorReport
      project={pendingProject}
      onEnterStudio={handleEnterStudio}
      onLanding={() => setView('landing')}
    />
  )

  /* ─── Studio ──────────────────────────────────────────────────────────── */
  const TABS: { id: StudioTab; label: string }[] = [
    { id: 'storyboard',  label: 'STORYBOARD' },
    { id: 'characters',  label: 'CHARACTERS' },
    { id: 'world-bible', label: 'WORLD BIBLE' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-base)', fontFamily: 'system-ui,sans-serif' }}>

      {/* Top bar */}
      <header className="flex items-center flex-shrink-0 px-5" style={{ height: 44, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setView('landing')} className="flex items-center gap-2 mr-6 group btn-tactile">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)', opacity: 0.7, transition: 'opacity 0.25s ease, box-shadow 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.boxShadow = '0 0 8px rgba(201,168,76,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '0.7'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <img src={logoSrc} alt="Baseboard AI" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
          </div>
        </button>

        <nav className="flex items-center h-full">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => switchTab(tab.id)}
              className={`relative h-full px-5 text-[9px] tracking-[0.25em] btn-tactile transition-all ${studioTab === tab.id ? 'tab-active' : ''}`}
              style={{ color: studioTab === tab.id ? 'var(--gold)' : 'var(--text-muted)' }}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Library shortcut */}
          <button onClick={() => setView('library')} className="btn-tactile"
            style={{
              fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-muted)',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 999, padding: '4px 12px',
              textTransform: 'uppercase', cursor: 'pointer', opacity: 0.6,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            📁 Library
          </button>
          {/* New Project shortcut */}
          <button onClick={() => setView('new-project')} className="btn-tactile"
            style={{
              fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold)',
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              borderRadius: 999, padding: '4px 12px',
              textTransform: 'uppercase', cursor: 'pointer', opacity: 0.7,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
            ⊕ New Project
          </button>
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(d => !d)} />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full pulse-gold" style={{ background: 'var(--gold)' }} />
            <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--gold)', opacity: 0.5 }}>Granite Active</span>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.6, fontFamily: 'Georgia,serif' }}>◉</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div key={tabKey} className="flex flex-1 overflow-hidden anim-tab-in" style={{ height: 'calc(100vh - 44px)' }}>
        {studioTab === 'storyboard' && (
          <StudioPage key={project?.db_id ?? 'new'} initialProject={project} onNotify={pushNotif} />
        )}
        {studioTab === 'characters' && (
          <CharacterDictionaryPage
            characters={project?.characters ?? []}
            scenes={project?.scenes ?? []}
            renderStyle={project?.render_style ?? 'bw_sketch'}
            project={project}
            onReplacePortrait={(_charId, _dataUrl) => {
              // Portrait URLs live in CharacterRow local state — no App-level action needed.
            }}
            onUpdateCharacter={(updated) => {
              setProject(p => p ? {
                ...p,
                characters: p.characters.map(c => c.id === updated.id ? updated : c),
              } : p)
            }}
            onUpdateSceneFrames={(updatedScenes) => {
              setProject(p => p ? { ...p, scenes: updatedScenes } : p)
            }}
            onNotify={pushNotif}
          />
        )}
        {studioTab === 'world-bible' && (
          <WorldBiblePage
            scenes={project?.scenes ?? []}
            project={project}
            renderStyle={project?.render_style ?? 'bw_sketch'}
            onDeleteScene={handleDeleteScene}
            onUpdateSceneFrames={(updatedScenes) => {
              setProject(p => p ? { ...p, scenes: updatedScenes } : p)
            }}
            onNotify={pushNotif}
          />
        )}
      </div>

      {/* Notifications */}
      <div className="fixed top-12 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {notifs.map(n => <GraniteNotification key={n.id} message={n.message} type={n.type} />)}
      </div>
    </div>
  )
}
