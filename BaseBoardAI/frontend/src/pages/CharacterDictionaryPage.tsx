import type { CharacterProfile } from '../types/storyboard'

const ROLE_TAGS = ['Protagonist', 'Antagonist', 'Supporting', 'Other']

interface Props {
  characters: CharacterProfile[]
}

function CharacterCard({ char }: { char: CharacterProfile }) {
  const initials = char.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded hover:border-[var(--gold)]/40 transition-all overflow-hidden group cursor-pointer">
      {/* Portrait placeholder */}
      <div className="aspect-[3/4] w-full bg-[var(--bg-base)] relative flex items-center justify-center overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-raised)] border border-[var(--gold)]/20 flex items-center justify-center">
          <span className="text-[var(--gold)]/60 text-xl font-bold" style={{ fontFamily: 'Georgia,serif' }}>{initials}</span>
        </div>
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(10,8,7,0.6) 100%)' }} />
        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-[var(--bg-base)]/90 to-transparent">
          <p className="text-xs font-semibold text-[var(--text-base)]/90 tracking-wide">{char.name}</p>
          <p className="text-[9px] text-[var(--gold)]/50 tracking-widest uppercase mt-0.5">{char.id}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[8px] tracking-widest text-[var(--gold)]/40 uppercase mb-1">Appearance</p>
          <p className="text-[9px] text-[var(--text-base)]/50 leading-relaxed line-clamp-3">{char.wardrobe_defaults}</p>
        </div>
        {char.facial_blueprint && (
          <div>
            <p className="text-[8px] tracking-widest text-[var(--gold)]/40 uppercase mb-1">Blueprint</p>
            <p className="text-[9px] text-[var(--text-base)]/40 leading-relaxed line-clamp-2">{char.facial_blueprint.bone_structure}</p>
          </div>
        )}
        {/* Color palette dots */}
        <div className="flex gap-1.5 pt-1">
          {['#8B7355', '#4A4036', '#C9A84C'].map((c) => (
            <div key={c} className="w-4 h-4 rounded-full border border-[var(--border)]" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CharacterDictionaryPage({ characters }: Props) {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-base)]/90 tracking-widest">Character Dictionary</h1>
          <p className="text-[9px] text-[var(--gold)]/40 mt-0.5 tracking-wider">{characters.length} character{characters.length !== 1 ? 's' : ''} in bible</p>
        </div>
        <button className="text-[9px] tracking-widest text-[var(--gold)] border border-[var(--gold)]/30 hover:border-[var(--gold)]/70 px-3 py-1.5 rounded uppercase transition-all">
          + New Character
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-[var(--border)] flex-shrink-0">
        {['All', ...ROLE_TAGS].map((tag) => (
          <button key={tag} className="text-[9px] tracking-widest px-3 py-1 rounded-full uppercase transition-all border border-[var(--border)] text-[var(--text-base)]/40 hover:border-[var(--gold)]/40 hover:text-[var(--gold)]/70">
            {tag}
          </button>
        ))}
        <div className="ml-auto">
          <input placeholder="Search characters..." className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-1 text-[10px] text-[var(--text-base)]/60 placeholder-[var(--text-base)]/20 focus:outline-none focus:border-[var(--gold)]/40 w-40" />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-[var(--text-base)]/20 text-sm tracking-widest uppercase">No characters yet</p>
            <p className="text-[9px] text-[var(--text-base)]/10 tracking-wider">Run the pipeline to generate your character bible</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {characters.map((char) => (
              <CharacterCard key={char.id} char={char} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
