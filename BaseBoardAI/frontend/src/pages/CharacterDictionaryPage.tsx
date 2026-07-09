import { useState, useCallback, useRef } from 'react'
import { saveAs } from 'file-saver'
import type { CharacterProfile, StoryboardScene } from '../types/storyboard'
import { generateImage } from '../api/storyboard'
import CharacterPackagePage from './CharacterPackagePage'

const ROLE_TAGS = ['Protagonist', 'Antagonist', 'Supporting', 'Other']

interface Props {
  characters: CharacterProfile[]
  scenes?: StoryboardScene[]
  renderStyle?: string
  /** Called when the user uploads a replacement portrait for a character.
   *  Receives the character ID and a base64 data URL. */
  onReplacePortrait?: (charId: string, dataUrl: string) => void
}

function downloadCharacterJson(char: CharacterProfile) {
  const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
  saveAs(blob, `character_${char.id.toLowerCase()}.json`)
}

async function downloadPortraitPng(url: string, name: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    saveAs(blob, `portrait_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`)
  } catch {
    window.open(url, '_blank')
  }
}

function buildPortraitPrompt(char: CharacterProfile): string {
  const { facial_blueprint: fb, wardrobe_defaults: wd, name } = char
  const parts = [
    `portrait of ${name}`,
    fb?.base_ethnicity_or_type && `${fb.base_ethnicity_or_type} character`,
    fb?.estimated_age != null && `approximately ${fb.estimated_age} years old`,
    fb?.bone_structure && `${fb.bone_structure} facial structure`,
    fb?.distinct_markers && `${fb.distinct_markers}`,
    wd && `wearing ${wd}`,
    'looking at camera, plain neutral background',
  ]
  return parts.filter(Boolean).join(', ')
}

function CharacterRow({
  char,
  onDelete,
  onOpenPackage,
  onReplacePortrait,
  renderStyle,
  isPackageReady = false,
}: {
  char: CharacterProfile
  onDelete: () => void
  onOpenPackage: () => void
  onReplacePortrait?: (charId: string, dataUrl: string) => void
  renderStyle: string
  isPackageReady?: boolean
}) {
  const [expanded,     setExpanded]     = useState(false)
  const [confirming,   setConfirming]   = useState(false)
  const [portraitUrl,  setPortraitUrl]  = useState<string | null>(null)
  const [portraitLoading, setPortraitLoading] = useState(false)
  const [lightbox,     setLightbox]     = useState(false)
  const portraitUploadRef = useRef<HTMLInputElement>(null)

  const initials = char.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  function handlePortraitUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPortraitUrl(dataUrl)
      onReplacePortrait?.(char.id, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleExpand = useCallback(async () => {
    const next = !expanded
    setExpanded(next)
    // Generate portrait on first expand if not already loaded
    if (next && !portraitUrl && !portraitLoading) {
      setPortraitLoading(true)
      try {
        const prompt = buildPortraitPrompt(char)
        const url = await generateImage(prompt, renderStyle)
        setPortraitUrl(url)
      } catch {
        // silently leave as null — placeholder shows
      } finally {
        setPortraitLoading(false)
      }
    }
  }, [expanded, portraitUrl, portraitLoading, char, renderStyle])

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox && portraitUrl && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={portraitUrl}
            alt={char.name}
            style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 6, border: '1px solid rgba(201,168,76,0.3)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 24, right: 28,
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: 28, cursor: 'pointer', lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}

      <div
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 6, overflow: 'hidden',
          transition: 'border-color 200ms ease',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.35)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
      >
        {/* Header row — click to expand */}
        <button
          className="w-full text-left btn-tactile"
          onClick={handleExpand}
          style={{ padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar / portrait thumbnail */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-raised)', border: '1px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {portraitUrl ? (
                <img src={portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--gold)', opacity: 0.7, fontSize: 13, fontFamily: 'Georgia,serif', fontWeight: 'bold' }}>{initials}</span>
              )}
            </div>

            {/* Name + ID */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', fontFamily: 'Georgia,serif', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {char.name}
              </p>
              <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.4, textTransform: 'uppercase', marginTop: 2 }}>
                {char.id}
              </p>
            </div>

            {/* Age badge */}
            {char.facial_blueprint?.estimated_age && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6, flexShrink: 0 }}>
                Age {char.facial_blueprint.estimated_age}
              </span>
            )}

            {/* Package ready badge */}
            {isPackageReady && (
              <span style={{ fontSize:7, letterSpacing:'0.15em', color:'#4ade80', opacity:0.7, textTransform:'uppercase', flexShrink:0, border:'1px solid rgba(74,222,128,0.3)', borderRadius:999, padding:'2px 6px' }}>
                ✓ PKG
              </span>
            )}

            <span style={{ fontSize: 12, color: 'var(--gold)', opacity: 0.5, flexShrink: 0, transition: 'transform 150ms ease', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>›</span>
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--border)' }}>

            {/* Portrait + Blueprint side-by-side */}
            <div style={{ padding: '12px 14px', display: 'flex', gap: 14 }}>
              {/* Portrait image */}
              <div style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: 100, height: 130, borderRadius: 5,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: portraitUrl ? 'zoom-in' : 'default',
                    position: 'relative',
                  }}
                  onClick={() => portraitUrl && setLightbox(true)}
                >
                  {/* Hidden upload input */}
                  <input
                    ref={portraitUploadRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handlePortraitUpload}
                  />
                  {portraitLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, border: '2px solid rgba(201,168,76,0.2)',
                        borderTop: '2px solid rgba(201,168,76,0.7)',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                      <span style={{ fontSize: 7, color: 'var(--gold)', opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Rendering</span>
                    </div>
                  ) : portraitUrl ? (
                    <img
                      src={portraitUrl}
                      alt={`Portrait of ${char.name}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                      onClick={() => portraitUploadRef.current?.click()}
                      title="Upload your own portrait"
                    >
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.3, textAlign: 'center', padding: '0 8px', letterSpacing: '0.1em' }}>No portrait</span>
                      <span style={{ fontSize: 7, color: 'var(--gold)', opacity: 0.4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>+ Upload</span>
                    </div>
                  )}
                  {/* Replace overlay — shows on hover when portrait exists */}
                  {portraitUrl && (
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.55)', cursor: 'pointer', borderRadius: 4 }}
                      onClick={e => { e.stopPropagation(); portraitUploadRef.current?.click() }}
                      title="Replace portrait"
                    >
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>⇪ Replace</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.4, textAlign: 'center', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Portrait</p>
              </div>

              {/* Blueprint grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', alignContent: 'start' }}>
                {[
                  { label: 'Heritage / Type',  value: char.facial_blueprint?.base_ethnicity_or_type },
                  { label: 'Estimated Age',    value: char.facial_blueprint?.estimated_age != null ? String(char.facial_blueprint.estimated_age) : null },
                  { label: 'Bone Structure',   value: char.facial_blueprint?.bone_structure },
                  { label: 'Distinct Markers', value: char.facial_blueprint?.distinct_markers ?? 'None' },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-base)', opacity: 0.85, lineHeight: 1.4 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Wardrobe */}
            <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, margin: '10px 0 4px' }}>Wardrobe Defaults</p>
              <p style={{ fontSize: 11, color: 'var(--text-base)', opacity: 0.75, lineHeight: 1.6 }}>{char.wardrobe_defaults}</p>
            </div>

            {/* Actions */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              {confirming ? (
                <>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, opacity: 0.7, alignSelf: 'center' }}>Delete this character?</span>
                  <button className="btn-tactile"
                    onClick={onDelete}
                    style={{ padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid rgba(180,30,30,0.6)', background: 'rgba(180,30,30,0.15)', color: '#e06060', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Delete
                  </button>
                  <button className="btn-tactile"
                    onClick={() => setConfirming(false)}
                    style={{ padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-tactile"
                    onClick={onOpenPackage}
                    style={{ padding: '7px 14px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'border-color 150ms ease, color 150ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'transparent' }}>
                    ✦ Full Package
                  </button>
                  {portraitUrl && (
                    <button className="btn-tactile"
                      onClick={() => downloadPortraitPng(portraitUrl!, char.name)}
                      style={{ padding: '7px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'border-color 150ms ease, color 150ms ease' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                      ↓ PNG
                    </button>
                  )}
                  <button className="btn-tactile"
                    onClick={() => downloadCharacterJson(char)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'border-color 150ms ease, color 150ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    ↓ Download JSON
                  </button>
                  <button className="btn-tactile"
                    onClick={() => setConfirming(true)}
                    style={{ padding: '7px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', transition: 'border-color 150ms ease, color 150ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,30,30,0.5)'; e.currentTarget.style.color = '#e06060' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function CharacterDictionaryPage({ characters: initialCharacters, scenes = [], renderStyle = 'bw_sketch', onReplacePortrait }: Props) {
  const [characters,       setCharacters]       = useState(initialCharacters)
  const [search,           setSearch]           = useState('')
  const [activePackage,    setActivePackage]    = useState<CharacterProfile | null>(null)
  const [packagedCharIds,  setPackagedCharIds]  = useState<Set<string>>(new Set())

  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(id: string) {
    setCharacters(prev => prev.filter(c => c.id !== id))
  }

  function handlePackageComplete(charId: string) {
    setPackagedCharIds(prev => new Set([...prev, charId]))
  }

  // Full-screen character package view
  if (activePackage) {
    return (
      <CharacterPackagePage
        character={activePackage}
        allCharacters={characters}
        scenes={scenes}
        renderStyle={renderStyle}
        onBack={() => setActivePackage(null)}
        onAutoInitComplete={handlePackageComplete}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden">
      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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

      {/* Filter row */}
      <div className="flex gap-1 px-6 py-3 border-b border-[var(--border)] flex-shrink-0">
        {['All', ...ROLE_TAGS].map((tag) => (
          <button key={tag} className="text-[9px] tracking-widest px-3 py-1 rounded-full uppercase transition-all border border-[var(--border)] text-[var(--text-base)]/40 hover:border-[var(--gold)]/40 hover:text-[var(--gold)]/70">
            {tag}
          </button>
        ))}
        <div className="ml-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-1 text-[10px] text-[var(--text-base)]/60 placeholder-[var(--text-base)]/20 focus:outline-none focus:border-[var(--gold)]/40 w-40"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-[var(--text-base)]/20 text-sm tracking-widest uppercase">
              {characters.length === 0 ? 'No characters yet' : 'No matches'}
            </p>
            <p className="text-[9px] text-[var(--text-base)]/10 tracking-wider">
              {characters.length === 0 ? 'Run the pipeline to generate your character bible' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 680 }}>
            {filtered.map((char) => (
              <CharacterRow
                key={char.id}
                char={char}
                onDelete={() => handleDelete(char.id)}
                onOpenPackage={() => setActivePackage(char)}
                onReplacePortrait={onReplacePortrait}
                renderStyle={renderStyle}
                isPackageReady={packagedCharIds.has(char.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
