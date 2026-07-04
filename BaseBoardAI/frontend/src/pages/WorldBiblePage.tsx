import type { StoryboardScene } from '../types/storyboard'

const SUB_TABS = ['Locations', 'Factions', 'Lore', 'Artifacts', 'Timelines']

interface Props {
  scenes: StoryboardScene[]
}

function LocationCard({ scene }: { scene: StoryboardScene }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-sm hover:border-[var(--gold)]/40 transition-all overflow-hidden cursor-pointer group"
      style={{ minWidth: 200, maxWidth: 240 }}>
      {/* Parchment-style image area */}
      <div className="aspect-[4/3] w-full bg-[var(--bg-base)] relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--bg-base) 50%, var(--bg-surface) 100%)' }} />
        <div className="relative z-10 text-center px-4">
          <div className="text-[var(--gold)]/30 text-3xl mb-2" style={{ fontFamily: 'Georgia,serif' }}>◈</div>
          <p className="text-[10px] tracking-widest text-[var(--text-base)]/30 uppercase">{scene.environmental_type}</p>
        </div>
        {/* Parchment border effect */}
        <div className="absolute inset-0 border border-[var(--gold)]/10 m-2 pointer-events-none" />
      </div>

      {/* Details */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[10px] font-semibold text-[var(--text-base)]/80 tracking-wide leading-tight">{scene.location_heading}</p>
          <p className="text-[8px] tracking-widest text-[var(--gold)]/40 uppercase mt-0.5">{scene.time_of_day}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px]">
            <span className="text-[var(--text-base)]/30 uppercase tracking-wider">Climate</span>
            <span className="text-[var(--text-base)]/50">{scene.emotional_tone}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-[var(--text-base)]/30 uppercase tracking-wider">Lighting</span>
            <span className="text-[var(--gold)]/60">{scene.time_of_day}</span>
          </div>
        </div>
        {/* Palette strip */}
        <div className="flex gap-1 pt-1">
          {scene.color_palette.slice(0, 4).map((c, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorldBiblePage({ scenes }: Props) {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
        <h1 className="text-sm font-semibold text-[var(--text-base)]/90 tracking-widest">World Bible</h1>
        <p className="text-[9px] text-[var(--gold)]/40 mt-0.5 tracking-wider">{scenes.length} location{scenes.length !== 1 ? 's' : ''} mapped</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 px-6 border-b border-[var(--border)] flex-shrink-0">
        {SUB_TABS.map((tab, i) => (
          <button key={tab} className={`relative px-4 py-2.5 text-[9px] tracking-widest uppercase transition-all ${
            i === 0 ? 'text-[var(--gold)] tab-active' : 'text-[var(--text-base)]/30 hover:text-[var(--text-base)]/60'
          }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-[var(--text-base)]/20 text-sm tracking-widest uppercase">No locations yet</p>
            <p className="text-[9px] text-[var(--text-base)]/10 tracking-wider">Run the pipeline to build your world bible</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {scenes.map((scene) => (
              <LocationCard key={scene.scene_number} scene={scene} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
