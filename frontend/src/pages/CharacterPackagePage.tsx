/**
 * CharacterPackagePage — full studio character reference package.
 *
 * Sections (lazy-loaded per tab):
 *   Overview · Portrait · Turnaround · Expressions · Poses · Outfits
 *   Palette · Props · Relationships · Scenes · AI Prompt · Versions
 *
 * Auto-generates default sections (portrait, turnaround, expressions,
 * poses, outfits) on first mount.
 *
 * Premium action "Generate Full Character Reference Pack" adds:
 *   360° turntable (8 angles) · T-pose / A-pose + extended poses
 *   Close-up material references
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { saveAs } from 'file-saver'
import type {
  RenderStyle,
  CharacterProfile,
  CharacterPackage,
  CharacterOverview,
  CharacterRelationship,
  StoryboardScene,
  CharacterIdentity,
  SpeciesProfile,
  PhysicalForm,
  CharacterVariant,
  QARepairAction,
} from '../types/storyboard'
import {
  generateCharacterPackage,
  regenerateCharacterImage,
  generateCharacterOverview,
  generateFullCharacterPack,
  runCharacterQA,
} from '../api/storyboard'
import GalleryLightbox, { type GalleryItem } from '../components/GalleryLightbox'
import IdentityUploader from '../components/IdentityUploader'
import VariantManager from '../components/VariantManager'
import VisualQAPanel from '../components/VisualQAPanel'
import SpeciesSelector from '../components/SpeciesSelector'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TURNAROUND_KEYS = ['front', 'three_q_front', 'side', 'three_q_back', 'back'] as const
const TURNAROUND_LABELS: Record<string, string> = {
  front: 'Front', three_q_front: '¾ Front', side: 'Side', three_q_back: '¾ Back', back: 'Back',
}

const EXPRESSION_KEYS = ['neutral','happy','laughing','angry','sad','surprised','fearful','thinking','crying'] as const
const EXPRESSION_EMOJIS: Record<string, string> = {
  neutral:'🙂', happy:'😊', laughing:'😂', angry:'😡', sad:'😢',
  surprised:'😲', fearful:'😨', thinking:'🤔', crying:'😭',
}

const POSE_KEYS = ['standing','walking','running','sitting','pointing','holding_object','hero_pose'] as const
const POSE_LABELS: Record<string, string> = {
  standing:'Standing', walking:'Walking', running:'Running', sitting:'Sitting',
  pointing:'Pointing', holding_object:'Holding Object', hero_pose:'Hero Pose',
}

const OUTFIT_KEYS = ['default','casual','formal','travel','combat','winter','summer'] as const
const OUTFIT_LABELS: Record<string, string> = {
  default:'Default', casual:'Casual', formal:'Formal', travel:'Travel',
  combat:'Combat', winter:'Winter', summer:'Summer',
}

const TURNAROUND_360_KEYS = ['deg_000','deg_045','deg_090','deg_135','deg_180','deg_225','deg_270','deg_315'] as const
const TURNAROUND_360_LABELS: Record<string, string> = {
  deg_000:'0°', deg_045:'45°', deg_090:'90°', deg_135:'135°',
  deg_180:'180°', deg_225:'225°', deg_270:'270°', deg_315:'315°',
}

const PREMIUM_POSE_KEYS = ['t_pose','a_pose','crouching','climbing','fighting_stance','falling','celebrating','kneeling'] as const
const PREMIUM_POSE_LABELS: Record<string, string> = {
  t_pose:'T-Pose', a_pose:'A-Pose', crouching:'Crouching', climbing:'Climbing',
  fighting_stance:'Fighting Stance', falling:'Falling', celebrating:'Celebrating', kneeling:'Kneeling',
}

const MATERIAL_KEYS = ['face_closeup','hair_closeup','fabric_closeup','hand_closeup','eye_closeup'] as const
const MATERIAL_LABELS: Record<string, string> = {
  face_closeup:'Face', hair_closeup:'Hair', fabric_closeup:'Fabric',
  hand_closeup:'Hands', eye_closeup:'Eyes',
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  ally:'#4ade80', enemy:'#f87171', romantic:'#f472b6', mentor:'#60a5fa',
  family:'#a78bfa', neutral:'#94a3b8', rival:'#fb923c',
}

const PACKAGE_TABS = [
  'Overview', 'Identity', 'Variants', 'Expressions', 'Poses',
  'Outfits', 'Abilities', 'Relationships', 'Scenes', 'Quality', 'AI Prompt', 'Versions',
] as const
type PackageTab = typeof PACKAGE_TABS[number]

// Default sections that auto-generate on mount
const AUTO_INIT_SECTIONS = ['portrait', 'turnaround', 'expressions', 'poses', 'outfits']

// ---------------------------------------------------------------------------
// Helper — build empty package state
// ---------------------------------------------------------------------------

const DEFAULT_PHYSICAL_FORM: PhysicalForm = {
  form: 'humanoid',
  custom_description: null,
  limb_count: null,
  has_wings: false,
  has_tail: false,
}

const DEFAULT_SPECIES: SpeciesProfile = {
  species_id: 'human',
  label: 'Human',
  custom_notes: null,
}

function buildEmptyPackage(char: CharacterProfile, renderStyle: RenderStyle): CharacterPackage {
  const fb = char.facial_blueprint
  const basePrompt = [
    char.name,
    fb?.base_ethnicity_or_type,
    fb?.estimated_age ? `age ${fb.estimated_age}` : '',
    fb?.bone_structure,
    fb?.distinct_markers ?? '',
    char.wardrobe_defaults,
  ].filter(Boolean).join(', ')

  return {
    charId: char.id,
    overview: null,
    prompt: basePrompt,
    renderStyle,
    starredImage: null,
    lockedImages: new Set<string>(),
    lockedImage: null,
    portrait: null,
    turnaround: Object.fromEntries(TURNAROUND_KEYS.map(k => [k, null])),
    expressions: Object.fromEntries(EXPRESSION_KEYS.map(k => [k, null])),
    poses: Object.fromEntries(POSE_KEYS.map(k => [k, null])),
    outfits: Object.fromEntries(OUTFIT_KEYS.map(k => [k, null])),
    props: {},
    turnaround360: null,
    premiumPoses: null,
    materialCloseups: null,
    fullPackLoading: false,
    fullPackGenerated: false,
    relationships: [],
    loading: {},
    versions: [],
    sceneAppearances: [],
    autoInitDone: false,
    // ── Character DNA System ─────────────────────────────────────────────
    identity: char.identity ?? null,
    species: char.species ?? DEFAULT_SPECIES,
    physicalForm: char.physical_form ?? DEFAULT_PHYSICAL_FORM,
    classification: char.classification ?? null,
    abilities: char.abilities ?? [],
    visualRules: char.visual_rules ?? [],
    variants: char.variants ?? [
      { variant_id: 'default', label: 'Default', outfit: null, hair_override: null,
        age_override: null, species_override: null, extra_accessories: [], scene_range: null, notes: 'Base appearance' }
    ],
    activeVariantId: char.active_variant_id ?? 'default',
    qaResult: null,
    completionScore: 0,
  }
}

function buildOverview(char: CharacterProfile): CharacterOverview {
  return {
    name: char.name,
    role: 'Supporting',
    age: char.facial_blueprint?.estimated_age ? String(char.facial_blueprint.estimated_age) : '',
    gender: '',
    occupation: '',
    species: 'Human',
    nationality: '',
    height: '',
    biography: char.wardrobe_defaults ?? '',
    personality: char.facial_blueprint?.distinct_markers ?? '',
    goals: '',
    fears: '',
    strengths: char.facial_blueprint?.bone_structure ?? '',
    weaknesses: '',
  }
}

/** Infer relationships from shared scene appearances */
function buildRelationships(
  char: CharacterProfile,
  allChars: CharacterProfile[],
  scenes: StoryboardScene[],
): CharacterRelationship[] {
  const firstName = char.name.split(' ')[0].toLowerCase()
  return allChars
    .filter(c => c.id !== char.id)
    .map(other => {
      const otherFirst = other.name.split(' ')[0].toLowerCase()
      const shared = scenes
        .filter(s => s.frames.some(f => {
          const ab = f.action_breakdown?.toLowerCase() ?? ''
          return ab.includes(firstName) && ab.includes(otherFirst)
        }))
        .map(s => s.scene_number)
      if (shared.length === 0) return null
      return {
        targetCharId: other.id,
        targetName: other.name,
        type: 'neutral' as CharacterRelationship['type'],
        strength: Math.min(shared.length, 5),
        sharedScenes: shared,
        description: `Appears together in ${shared.length} scene${shared.length !== 1 ? 's' : ''}.`,
      } satisfies CharacterRelationship
    })
    .filter((r): r is CharacterRelationship => r !== null)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, height:'100%', minHeight:80 }}>
      <div style={{ width:18, height:18, border:'2px solid rgba(201,168,76,0.15)', borderTop:'2px solid rgba(201,168,76,0.7)', borderRadius:'50%', animation:'pkg-spin 0.8s linear infinite' }} />
      <span style={{ fontSize:8, color:'var(--gold)', opacity:0.5, letterSpacing:'0.2em', textTransform:'uppercase' }}>Rendering</span>
    </div>
  )
}

function StarBanner({ starredImage, onClear }: { starredImage: string | null; onClear: () => void }) {
  if (!starredImage) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.35)', borderRadius:5, padding:'8px 14px', marginBottom:16 }}>
      <img src={starredImage} alt="starred reference" style={{ width:32, height:32, objectFit:'cover', borderRadius:3, border:'1px solid var(--gold)' }} />
      <div style={{ flex:1 }}>
        <span style={{ fontSize:9, letterSpacing:'0.2em', color:'var(--gold)', textTransform:'uppercase', fontWeight:600 }}>⭐ Reference image set</span>
        <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.7, marginTop:2 }}>All regenerations use this as a reference. Starred image is protected from regeneration.</p>
      </div>
      <button onClick={onClear} title="Clear star" style={{ background:'none', border:'1px solid rgba(201,168,76,0.3)', borderRadius:4, padding:'4px 10px', fontSize:9, letterSpacing:'0.15em', color:'var(--gold)', cursor:'pointer', opacity:0.7, textTransform:'uppercase' }}>
        Clear
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GeneratedImagePicker — pick any already-generated image into an identity slot
// ---------------------------------------------------------------------------

type RefSlot = 'reference_primary' | 'reference_front' | 'reference_left' | 'reference_right' | 'reference_back'
const REF_SLOTS: { key: RefSlot; label: string }[] = [
  { key: 'reference_primary', label: 'Primary' },
  { key: 'reference_front',   label: 'Front'   },
  { key: 'reference_left',    label: 'Left'    },
  { key: 'reference_right',   label: 'Right'   },
  { key: 'reference_back',    label: 'Back'    },
]

interface GeneratedImagePickerProps {
  images: { url: string; label: string }[]
  onSelect: (url: string, slot: RefSlot) => void
}

function GeneratedImagePicker({ images, onSelect }: GeneratedImagePickerProps) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  if (images.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6, marginBottom: 10 }}>
        Use Generated Image
      </p>
      {/* Thumbnail row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: pendingUrl ? 12 : 0 }}>
        {images.map(({ url, label }) => (
          <div key={url} style={{ position: 'relative' }}>
            <img
              src={url}
              alt={label}
              title={`Use "${label}" as identity reference`}
              onClick={() => setPendingUrl(pendingUrl === url ? null : url)}
              style={{
                width: 64, height: 80, objectFit: 'cover', borderRadius: 5, cursor: 'pointer',
                border: pendingUrl === url
                  ? '2px solid var(--gold)'
                  : '1px solid var(--border)',
                transition: 'border 120ms',
              }}
            />
            <p style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Slot selector — only shown after picking a thumbnail */}
      {pendingUrl && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6, marginBottom: 8, letterSpacing: '0.1em' }}>
            Assign to slot:
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {REF_SLOTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { onSelect(pendingUrl, key); setPendingUrl(null) }}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 9, cursor: 'pointer',
                  border: '1px solid rgba(201,168,76,0.5)',
                  background: 'transparent', color: 'var(--gold)',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setPendingUrl(null)}
              style={{ padding: '5px 14px', borderRadius: 999, fontSize: 9, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.1em' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageTile({
  url, label, width = 120, height = 140, onRegen, isLoading, onOpen,
  isStarred, onToggleStar, isLocked, onToggleLock, isProtected,
}: {
  url: string | null; label: string; width?: number; height?: number;
  onRegen?: () => void; isLoading?: boolean;
  onOpen?: () => void;
  isStarred?: boolean;      // ⭐ — reference image (also protected)
  onToggleStar?: () => void;
  isLocked?: boolean;       // 🔒 — protected from regen only
  onToggleLock?: () => void;
  isProtected?: boolean;    // true if starred OR locked
}) {
  async function handleDownload() {
    if (!url) return
    try { const r = await fetch(url); const b = await r.blob(); saveAs(b, `${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.png`) }
    catch { window.open(url, '_blank') }
  }

  const borderColor = isStarred ? 'var(--gold)' : isLocked ? '#7c5cd8' : 'var(--border)'
  const borderWidth = (isStarred || isLocked) ? '2px' : '1px'

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5 }}>
      <div
        style={{ width, height, borderRadius:5, border:`${borderWidth} solid ${borderColor}`, background:'var(--bg-base)', overflow:'hidden', display:'flex',alignItems:'center',justifyContent:'center', cursor: url ? 'zoom-in' : 'default', position:'relative', opacity: isProtected && !isStarred && !isLocked ? 1 : 1 }}
        onClick={() => url && onOpen?.()}
      >
        {isLoading ? <Spinner /> : url ? (
          <img src={url} alt={label} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
        ) : (
          <span style={{ fontSize:9,color:'var(--text-muted)',opacity:0.25,textAlign:'center',padding:'0 8px',letterSpacing:'0.1em' }}>{label}</span>
        )}
        {/* Badge — top-right corner */}
        {isStarred && (
          <div style={{ position:'absolute',top:4,right:4,background:'var(--gold)',borderRadius:3,padding:'1px 5px',fontSize:9,lineHeight:1.4,color:'#000',fontWeight:700,pointerEvents:'none' }}>
            ⭐ REF
          </div>
        )}
        {!isStarred && isLocked && (
          <div style={{ position:'absolute',top:4,right:4,background:'#7c5cd8',borderRadius:3,padding:'1px 5px',fontSize:9,lineHeight:1.4,color:'#fff',fontWeight:700,pointerEvents:'none' }}>
            🔒
          </div>
        )}
      </div>
      <div style={{ display:'flex',gap:4,alignItems:'center' }}>
        <span style={{ fontSize:8,color:'var(--text-muted)',opacity:0.5,letterSpacing:'0.12em',textTransform:'uppercase' }}>{label}</span>
        {/* Star — set as reference (also protects) */}
        {url && onToggleStar && (
          <button onClick={onToggleStar} title={isStarred ? 'Remove star' : 'Star as reference (protects from regen)'} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gold)',opacity:isStarred?1:0.3,fontSize:11,padding:0,lineHeight:1 }}>
            {isStarred ? '⭐' : '☆'}
          </button>
        )}
        {/* Lock — protect from regen only */}
        {url && onToggleLock && !isStarred && (
          <button onClick={onToggleLock} title={isLocked ? 'Unlock' : 'Lock (protect from regen)'} style={{ background:'none',border:'none',cursor:'pointer',color:'#7c5cd8',opacity:isLocked?1:0.3,fontSize:10,padding:0,lineHeight:1 }}>
            {isLocked ? '🔒' : '🔓'}
          </button>
        )}
        {/* Regen — hidden if starred or locked */}
        {onRegen && !isStarred && !isLocked && (
          <button onClick={onRegen} disabled={isLoading} title="Regenerate" style={{ background:'none',border:'none',cursor:isLoading?'wait':'pointer',color:'var(--gold)',opacity:isLoading?0.3:0.5,fontSize:10,padding:0 }}>↺</button>
        )}
        {url && (
          <button onClick={handleDownload} title="Download PNG" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gold)',opacity:0.4,fontSize:9,padding:0 }}>↓</button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section: Overview
// ---------------------------------------------------------------------------

function OverviewSection({
  pkg, onUpdate, onGenerateOverview, isGenerating,
}: {
  pkg: CharacterPackage
  onUpdate: (ov: CharacterOverview) => void
  onGenerateOverview: () => void
  isGenerating: boolean
}) {
  const ov = pkg.overview!

  const fields: { key: keyof CharacterOverview; label: string; multiline?: boolean }[] = [
    { key:'name',        label:'Name' },
    { key:'role',        label:'Role' },
    { key:'age',         label:'Age' },
    { key:'gender',      label:'Gender' },
    { key:'occupation',  label:'Occupation' },
    { key:'species',     label:'Species' },
    { key:'nationality', label:'Nationality' },
    { key:'height',      label:'Height' },
    { key:'biography',   label:'Short Biography',  multiline:true },
    { key:'personality', label:'Personality',      multiline:true },
    { key:'goals',       label:'Goals',            multiline:true },
    { key:'fears',       label:'Fears',            multiline:true },
    { key:'strengths',   label:'Strengths',        multiline:true },
    { key:'weaknesses',  label:'Weaknesses',       multiline:true },
  ]

  const inputStyle = {
    width:'100%', background:'var(--bg-base)', border:'1px solid var(--border)',
    borderRadius:4, padding:'7px 10px', fontSize:11, color:'var(--text-base)',
    outline:'none', resize:'vertical' as const, fontFamily:'inherit',
  }

  return (
    <div>
      {/* Generate / Regenerate Overview button */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Character Overview</h2>
        <button
          onClick={onGenerateOverview}
          disabled={isGenerating}
          style={{
            fontSize:9, letterSpacing:'0.15em', color:'var(--gold)', textTransform:'uppercase',
            background:'none', border:'1px solid rgba(201,168,76,0.3)', borderRadius:4,
            padding:'5px 14px', cursor:isGenerating?'wait':'pointer', opacity:isGenerating?0.4:1,
          }}>
          {isGenerating ? 'Generating…' : '✦ AI-Generate Overview'}
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 24px', maxWidth:640 }}>
        {fields.map(({ key, label, multiline }) => (
          <div key={key} style={{ gridColumn: multiline ? 'span 2' : 'span 1' }}>
            <p style={{ fontSize:8,letterSpacing:'0.2em',color:'var(--text-muted)',textTransform:'uppercase',opacity:0.6,marginBottom:4 }}>{label}</p>
            {multiline ? (
              <textarea rows={3} value={ov[key]} onChange={e => onUpdate({ ...ov, [key]: e.target.value })} style={inputStyle} />
            ) : (
              <input value={ov[key]} onChange={e => onUpdate({ ...ov, [key]: e.target.value })} style={inputStyle}
                onFocus={e=>(e.target.style.borderColor='var(--gold)')}
                onBlur={e=>(e.target.style.borderColor='var(--border)')} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section: Relationship Graph
// ---------------------------------------------------------------------------

function RelationshipGraph({
  relationships, characterName,
}: {
  relationships: CharacterRelationship[]
  characterName: string
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [localRels, setLocalRels] = useState(relationships)

  const REL_TYPES: CharacterRelationship['type'][] = [
    'ally','enemy','romantic','mentor','family','neutral','rival',
  ]

  if (localRels.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:10 }}>
        <p style={{ fontSize:11, color:'var(--text-muted)', opacity:0.3, letterSpacing:'0.15em', textTransform:'uppercase' }}>No relationships detected</p>
        <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.2, textAlign:'center', maxWidth:280, lineHeight:1.7 }}>
          Relationships are inferred from scenes where two characters appear in the same frame action. Generate the storyboard first.
        </p>
      </div>
    )
  }

  // Simple radial SVG layout
  const cx = 200, cy = 180, r = 120
  const nodeR = 22

  return (
    <div>
      <div style={{ display:'flex', gap:32, alignItems:'flex-start' }}>
        {/* SVG Graph */}
        <svg width={400} height={360} style={{ flexShrink:0, background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
          {/* Draw edges */}
          {localRels.map((rel, i) => {
            const angle = (i / localRels.length) * 2 * Math.PI - Math.PI / 2
            const tx = cx + r * Math.cos(angle)
            const ty = cy + r * Math.sin(angle)
            const color = RELATIONSHIP_COLORS[rel.type] ?? '#94a3b8'
            return (
              <g key={rel.targetCharId}>
                <line x1={cx} y1={cy} x2={tx} y2={ty}
                  stroke={color} strokeWidth={rel.strength * 0.8} strokeOpacity={0.4}
                  strokeDasharray={rel.type === 'enemy' ? '4,3' : undefined} />
              </g>
            )
          })}
          {/* Center node (this character) */}
          <circle cx={cx} cy={cy} r={nodeR} fill="rgba(201,168,76,0.15)" stroke="var(--gold)" strokeWidth={1.5} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize:9, fill:'var(--gold)', fontFamily:'Georgia,serif' }}>
            {characterName.split(' ')[0].slice(0,6)}
          </text>
          {/* Outer nodes */}
          {localRels.map((rel, i) => {
            const angle = (i / localRels.length) * 2 * Math.PI - Math.PI / 2
            const tx = cx + r * Math.cos(angle)
            const ty = cy + r * Math.sin(angle)
            const color = RELATIONSHIP_COLORS[rel.type] ?? '#94a3b8'
            const shortName = rel.targetName.split(' ')[0].slice(0,6)
            return (
              <g key={rel.targetCharId} style={{ cursor:'pointer' }} onClick={() => setEditingIdx(i)}>
                <circle cx={tx} cy={ty} r={nodeR} fill={`${color}22`} stroke={color} strokeWidth={1.2} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize:8, fill:'var(--text-base)', fontFamily:'system-ui,sans-serif' }}>
                  {shortName}
                </text>
                {/* Relationship type label on edge midpoint */}
                <text
                  x={(cx + tx) / 2} y={(cy + ty) / 2 - 5}
                  textAnchor="middle"
                  style={{ fontSize:7, fill:color, fontFamily:'system-ui,sans-serif', textTransform:'capitalize' }}>
                  {rel.type}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Relationship list / editor */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:4 }}>
            Relationships · click a node to edit
          </p>
          {localRels.map((rel, i) => {
            const color = RELATIONSHIP_COLORS[rel.type] ?? '#94a3b8'
            const isEditing = editingIdx === i
            return (
              <div key={rel.targetCharId} style={{
                background:'var(--bg-surface)', border:`1px solid ${isEditing ? color : 'var(--border)'}`,
                borderRadius:6, padding:'10px 12px', transition:'border-color 150ms ease',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: isEditing ? 10 : 0 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:'var(--text-base)', flex:1, opacity:0.85 }}>{rel.targetName}</span>
                  <span style={{ fontSize:8, color, opacity:0.8, letterSpacing:'0.1em', textTransform:'uppercase' }}>{rel.type}</span>
                  <span style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4 }}>
                    {'★'.repeat(rel.strength)}{'☆'.repeat(5 - rel.strength)}
                  </span>
                  <button onClick={() => setEditingIdx(isEditing ? null : i)}
                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gold)',opacity:0.4,fontSize:10,padding:0 }}>
                    {isEditing ? '✕' : '✎'}
                  </button>
                </div>
                {isEditing && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {/* Type selector */}
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {REL_TYPES.map(t => (
                        <button key={t} onClick={() => {
                          const updated = [...localRels]
                          updated[i] = { ...updated[i], type: t }
                          setLocalRels(updated)
                        }}
                          style={{
                            padding:'3px 8px', borderRadius:999, fontSize:8, cursor:'pointer',
                            border:`1px solid ${RELATIONSHIP_COLORS[t]}`,
                            background: rel.type === t ? `${RELATIONSHIP_COLORS[t]}33` : 'transparent',
                            color: RELATIONSHIP_COLORS[t], letterSpacing:'0.08em', textTransform:'capitalize',
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {/* Strength slider */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:8, color:'var(--text-muted)', opacity:0.6, textTransform:'uppercase', letterSpacing:'0.1em', width:60 }}>Strength</span>
                      <input type="range" min={1} max={5} value={rel.strength}
                        onChange={e => {
                          const updated = [...localRels]
                          updated[i] = { ...updated[i], strength: Number(e.target.value) }
                          setLocalRels(updated)
                        }}
                        style={{ flex:1, accentColor:'var(--gold)' }} />
                      <span style={{ fontSize:9, color:'var(--gold)', width:12 }}>{rel.strength}</span>
                    </div>
                    {/* Description */}
                    <textarea rows={2} value={rel.description}
                      onChange={e => {
                        const updated = [...localRels]
                        updated[i] = { ...updated[i], description: e.target.value }
                        setLocalRels(updated)
                      }}
                      style={{ width:'100%', background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 8px', fontSize:10, color:'var(--text-base)', outline:'none', resize:'vertical', fontFamily:'inherit' }}
                    />
                    {/* Shared scenes */}
                    <p style={{ fontSize:8, color:'var(--text-muted)', opacity:0.4 }}>
                      Shared scenes: {rel.sharedScenes.length > 0 ? rel.sharedScenes.map(n => `#${n}`).join(', ') : 'None detected'}
                    </p>
                  </div>
                )}
                {!isEditing && (
                  <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.45, marginTop:4, lineHeight:1.5 }}>{rel.description}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:20 }}>
        {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
            <span style={{ fontSize:8, color:'var(--text-muted)', opacity:0.5, textTransform:'capitalize', letterSpacing:'0.08em' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
// Sub-component: RuleAdder (inline text input to add a visual rule)
// ---------------------------------------------------------------------------

function RuleAdder({ onAdd }: { onAdd: (rule: string) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <div style={{ display:'flex', gap:8, marginTop:4 }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onAdd(draft.trim()); setDraft('') } }}
        placeholder="e.g. always show wings"
        style={{ flex:1, background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 10px', fontSize:10, color:'var(--text-base)', outline:'none', fontFamily:'inherit' }}
        onFocus={e => (e.target.style.borderColor='var(--gold)')}
        onBlur={e => (e.target.style.borderColor='var(--border)')}
      />
      <button
        disabled={!draft.trim()}
        onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft('') } }}
        style={{ padding:'6px 14px', borderRadius:4, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer', border:'1px solid rgba(201,168,76,0.35)', background:'transparent', color:'var(--gold)', opacity: draft.trim() ? 1 : 0.4, transition:'opacity 120ms' }}>
        + Add
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface Props {
  character: CharacterProfile
  allCharacters?: CharacterProfile[]
  scenes: StoryboardScene[]
  renderStyle?: RenderStyle | 'bw_detailed'
  onBack?: () => void
  /** Called when auto-init for this character completes */
  onAutoInitComplete?: (charId: string) => void
}

// Detail level only applies when the base render style is a B&W variant.
type DetailLevel = 'simple' | 'detailed'

function resolveRenderStyle(base: RenderStyle | 'bw_detailed', detail: DetailLevel): RenderStyle {
  if (base === 'bw_sketch' || base === 'bw_detailed') {
    return detail === 'detailed' ? 'bw_detailed' : 'bw_sketch'
  }
  return base as RenderStyle // flat_color / full_shaded — detail level has no effect
}

// ---------------------------------------------------------------------------
// localStorage persistence — keyed by charId so each character is independent
// ---------------------------------------------------------------------------

// Only persist lightweight metadata — NOT images.
// Image data URLs are large (50–200 KB each) and will exceed the 5 MB
// localStorage quota for any character with a full package, causing silent
// write failures and the cache to never be written at all.
// Images stay in React state for the lifetime of the tab session.
// On a hard page refresh the user will need to regenerate, but switching
// tabs within the app preserves everything via React state (see tabKey fix).
const PKG_FIELDS_TO_PERSIST = ['autoInitDone', 'overview', 'renderStyle'] as const

function pkgCacheKey(charId: string): string {
  return `baseboard_pkg_v1_${charId}`
}

function loadPkgCache(charId: string): Partial<CharacterPackage> | null {
  try {
    const raw = localStorage.getItem(pkgCacheKey(charId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function savePkgCache(charId: string, pkg: CharacterPackage): void {
  try {
    const subset: Record<string, unknown> = {}
    for (const k of PKG_FIELDS_TO_PERSIST) subset[k] = pkg[k as keyof CharacterPackage]
    localStorage.setItem(pkgCacheKey(charId), JSON.stringify(subset))
  } catch { /* storage full — silent */ }
}

export default function CharacterPackagePage({
  character, allCharacters = [], scenes, renderStyle = 'bw_sketch', onBack, onAutoInitComplete,
}: Props) {
  // Detect if the base style is B&W so the toggle is shown
  const isBW = renderStyle === 'bw_sketch' || renderStyle === 'bw_detailed'
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(
    renderStyle === 'bw_detailed' ? 'detailed' : 'simple'
  )

  const [activeTab, setActiveTab] = useState<PackageTab>('Overview')
  const [pkg, setPkg] = useState<CharacterPackage>(() => {
    const base = buildEmptyPackage(character, resolveRenderStyle(renderStyle, renderStyle === 'bw_detailed' ? 'detailed' : 'simple'))
    base.overview = buildOverview(character)
    base.sceneAppearances = scenes
      .filter(s => s.frames.some(f => f.action_breakdown?.toLowerCase().includes(character.name.split(' ')[0].toLowerCase())))
      .map(s => s.scene_number)
    base.relationships = buildRelationships(character, allCharacters, scenes)
    // Restore cached images if available
    const cached = loadPkgCache(character.id)
    if (cached) {
      return { ...base, ...cached, loading: {}, versions: base.versions,
        sceneAppearances: base.sceneAppearances, relationships: base.relationships,
        lockedImages: new Set<string>() }
    }
    return base
  })
  const [promptDraft, setPromptDraft] = useState(pkg.prompt)
  const [overviewGenerating, setOverviewGenerating] = useState(false)
  const loadedTabs  = useRef<Set<string>>(new Set(['Overview', 'Scenes', 'Relationships']))
  const autoInitRef = useRef(false)

  // Persist images (and autoInitDone) to localStorage.
  // We use a ref-based approach to avoid stale-closure bugs: the effect always
  // reads from a ref that tracks the latest pkg value, so savePkgCache is
  // guaranteed to write the most recent state rather than a stale snapshot.
  const pkgRef = useRef(pkg)
  pkgRef.current = pkg  // keep ref in sync on every render

  // Pre-populate loadedTabs for any section that already has images in the
  // initial pkg state (from autoInit or a previous session). This prevents
  // loadTab from firing API calls on tabs that don't need them after a
  // component remount (e.g. navigating away and back to Character Dictionary).
  useEffect(() => {
    const p = pkgRef.current
    if (p.portrait)                                          loadedTabs.current.add('Portrait')
    if (Object.values(p.turnaround).some(Boolean))          loadedTabs.current.add('Turnaround')
    if (Object.values(p.expressions).some(Boolean))         loadedTabs.current.add('Expressions')
    if (Object.values(p.poses).some(Boolean))               loadedTabs.current.add('Poses')
    if (Object.values(p.outfits).some(Boolean))             loadedTabs.current.add('Outfits')
    if (p.props && Object.values(p.props).some(Boolean))    loadedTabs.current.add('Props')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = pkgRef.current
    if (p.autoInitDone || p.portrait || Object.values(p.turnaround).some(Boolean)) {
      savePkgCache(character.id, p)
    }
  }, [pkg.autoInitDone, pkg.portrait, pkg.turnaround, pkg.expressions, pkg.poses, pkg.outfits,
      pkg.props, pkg.turnaround360, pkg.premiumPoses, pkg.materialCloseups]) // eslint-disable-line react-hooks/exhaustive-deps

  // Shared gallery lightbox state — null = closed
  const [gallery, setGallery] = useState<{ items: GalleryItem[]; index: number } | null>(null)

  /** Build a GalleryItem list from a keyed image map and open at the given key */
  function openGallery(imageMap: Record<string, string | null>, keys: readonly string[], labels: Record<string, string>, clickedKey: string) {
    const items = keys
      .filter(k => imageMap[k])
      .map(k => ({ url: imageMap[k]!, label: labels[k] ?? k }))
    const index = items.findIndex(it => it.label === (labels[clickedKey] ?? clickedKey))
    if (items.length === 0) return
    setGallery({ items, index: Math.max(0, index) })
  }

  // ---------------------------------------------------------------------------
  // Auto-init: generate all default sections when package first mounts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (autoInitRef.current || pkg.autoInitDone) return
    autoInitRef.current = true
    autoInit()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function autoInit(style?: string) {
    const effectiveStyle = style ?? pkg.renderStyle
    // Mark all default sections as loading
    setPkg(p => ({
      ...p,
      loading: Object.fromEntries(AUTO_INIT_SECTIONS.map(s => [s, true])),
    }))

    try {
      const result = await generateCharacterPackage(character, AUTO_INIT_SECTIONS, effectiveStyle, pkg.starredImage)
      setPkg(p => ({
        ...p,
        portrait:    (result['portrait'] as string | null) ?? p.portrait,
        turnaround:  { ...p.turnaround,   ...(result['turnaround']  as object ?? {}) },
        expressions: { ...p.expressions,  ...(result['expressions'] as object ?? {}) },
        poses:       { ...p.poses,        ...(result['poses']       as object ?? {}) },
        outfits:     { ...p.outfits,      ...(result['outfits']     as object ?? {}) },
        loading:     Object.fromEntries(AUTO_INIT_SECTIONS.map(s => [s, false])),
        autoInitDone: true,
      }))
      // Also mark tabs as loaded so they don't re-fetch
      AUTO_INIT_SECTIONS.forEach(s => loadedTabs.current.add(s.charAt(0).toUpperCase() + s.slice(1) as PackageTab))
      loadedTabs.current.add('Portrait')
    } catch {
      setPkg(p => ({
        ...p,
        loading: Object.fromEntries(AUTO_INIT_SECTIONS.map(s => [s, false])),
        autoInitDone: true,
      }))
    }

    onAutoInitComplete?.(character.id)
  }

  // ---------------------------------------------------------------------------
  // Detail level toggle — switches pkg.renderStyle and regens all loaded sections
  // ---------------------------------------------------------------------------

  async function handleDetailToggle(next: DetailLevel) {
    if (next === detailLevel) return
    setDetailLevel(next)
    const newStyle = resolveRenderStyle(renderStyle, next)
    // Update pkg render style so every future regen uses the new value
    setPkg(p => ({
      ...p,
      renderStyle: newStyle,
      // Clear existing images so sections show loading state cleanly
      portrait:    null,
      turnaround:  Object.fromEntries(TURNAROUND_KEYS.map(k => [k, null])),
      expressions: Object.fromEntries(EXPRESSION_KEYS.map(k => [k, null])),
      poses:       Object.fromEntries(POSE_KEYS.map(k => [k, null])),
      outfits:     Object.fromEntries(OUTFIT_KEYS.map(k => [k, null])),
      autoInitDone: false,
    }))
    // Reset loaded-tabs tracking so lazy load works fresh
    loadedTabs.current = new Set(['Overview', 'Scenes', 'Relationships'])
    autoInitRef.current = false
    // Kick off regeneration for the new style
    await autoInit(newStyle)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const setLoading = useCallback((section: string, val: boolean) => {
    setPkg(p => ({ ...p, loading: { ...p.loading, [section]: val } }))
  }, [])

  const saveVersion = useCallback((images: Record<string, string | null>) => {
    setPkg(p => ({
      ...p,
      versions: [...p.versions, {
        version: p.versions.length + 1,
        timestamp: new Date().toLocaleString(),
        images,
      }]
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // Generate LLM overview
  // ---------------------------------------------------------------------------

  async function handleGenerateOverview() {
    setOverviewGenerating(true)
    try {
      const ov = await generateCharacterOverview(character)
      setPkg(p => ({
        ...p,
        overview: { ...buildOverview(character), ...ov },
      }))
    } catch { /* leave existing */ }
    finally { setOverviewGenerating(false) }
  }

  // ---------------------------------------------------------------------------
  // Load a tab (lazy — only for tabs not auto-inited)
  // ---------------------------------------------------------------------------

  const loadTab = useCallback(async (tab: PackageTab) => {
    if (loadedTabs.current.has(tab)) return

    const sectionMap: Partial<Record<PackageTab, string>> = {
      Portrait:    'portrait',
      Turnaround:  'turnaround',
      Expressions: 'expressions',
      Poses:       'poses',
      Outfits:     'outfits',
      Props:       'props',
    }
    const section = sectionMap[tab]
    if (!section) return

    // If the section already has images in the current pkg state, mark it loaded
    // and skip the API call. This handles remounts where loadedTabs resets but
    // images are still in component state (autoInit already ran).
    const p = pkgRef.current
    const alreadyHasData =
      section === 'portrait'
        ? !!p.portrait
        : Object.values((p[section as keyof CharacterPackage] ?? {}) as Record<string, unknown>).some(Boolean)
    if (alreadyHasData) {
      loadedTabs.current.add(tab)
      return
    }

    loadedTabs.current.add(tab)
    setLoading(section, true)
    try {
      const result = await generateCharacterPackage(character, [section], pkgRef.current.renderStyle)
      setPkg(p => ({
        ...p,
        ...(section === 'portrait' ? { portrait: result['portrait'] as string | null } : {}),
        ...(section !== 'portrait' ? { [section]: { ...p[section as keyof typeof p] as object, ...(result[section] as object ?? {}) } } : {}),
      }))
    } catch { /* silently leave nulls */ }
    finally { setLoading(section, false) }
  }, [character, setLoading]) // pkg.renderStyle removed — read from pkgRef to avoid stale closure

  function handleTabChange(tab: PackageTab) {
    setActiveTab(tab)
    loadTab(tab)
  }

  // ---------------------------------------------------------------------------
  // Bulk regenerate a section
  // ---------------------------------------------------------------------------

  async function handleBulkRegen(section: string) {
    saveVersion({ portrait: pkg.portrait, ...pkg.turnaround, ...pkg.expressions, ...pkg.poses, ...pkg.outfits })

    if (section === 'portrait') {
      if (!isProtected(pkg.portrait)) {
        setLoading('portrait', true)
        try {
          const result = await generateCharacterPackage(character, ['portrait'], pkg.renderStyle, pkg.starredImage)
          setPkg(p => ({ ...p, prompt: promptDraft, portrait: result['portrait'] as string | null }))
        } catch { /* leave existing */ }
        finally { setLoading('portrait', false) }
      }
      return
    }

    // For grid sections: regenerate only the unlocked/unstarred keys individually
    const sectionMap: Record<string, string[]> = {
      expressions: [...EXPRESSION_KEYS],
      poses:       [...POSE_KEYS],
      outfits:     [...OUTFIT_KEYS],
      turnaround:  [...TURNAROUND_KEYS],
    }
    const keys = sectionMap[section]
    if (!keys) return

    const sectionData = pkg[section as keyof typeof pkg] as Record<string, string | null>
    const unprotectedKeys = keys.filter(k => !isProtected(sectionData?.[k] ?? null))
    if (unprotectedKeys.length === 0) return

    // Regenerate each unprotected key one by one
    for (const key of unprotectedKeys) {
      await handleRegenOne(`${section}/${key}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Regenerate a single image
  // ---------------------------------------------------------------------------

  function handleToggleStar(url: string) {
    setPkg(p => ({
      ...p,
      starredImage: p.starredImage === url ? null : url,
      lockedImage: p.starredImage === url ? null : url, // keep compat
    }))
  }

  function handleToggleLock(url: string) {
    setPkg(p => {
      const next = new Set(p.lockedImages)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return { ...p, lockedImages: next }
    })
  }

  function isProtected(url: string | null) {
    if (!url) return false
    return pkg.starredImage === url || pkg.lockedImages.has(url)
  }

  async function handleRegenOne(sectionKey: string) {
    // Resolve the current image URL for this tile
    const [topSection, subKey] = sectionKey.includes('/') ? sectionKey.split('/') : [sectionKey, null]
    const currentUrl = subKey
      ? (pkg[topSection as keyof typeof pkg] as Record<string, string | null>)?.[subKey]
      : (pkg[topSection as keyof typeof pkg] as string | null)
    if (isProtected(currentUrl ?? null)) return   // starred or locked — skip

    setLoading(sectionKey, true)
    try {
      const url = await regenerateCharacterImage(character, sectionKey, promptDraft, pkg.starredImage)
      const [topSection, subKey] = sectionKey.includes('/') ? sectionKey.split('/') : [sectionKey, null]
      setPkg(p => {
        if (!subKey) return { ...p, [topSection]: url }
        return { ...p, [topSection]: { ...(p[topSection as keyof typeof p] as object), [subKey]: url } }
      })
    } catch { /* leave existing */ }
    finally { setLoading(sectionKey, false) }
  }

  // ---------------------------------------------------------------------------
  // Visual QA
  // ---------------------------------------------------------------------------

  async function handleRunQA() {
    if (!pkg.identity) {
      alert('Set character identity first (Identity tab)')
      return
    }
    setLoading('qa', true)
    try {
      const result = await runCharacterQA(
        pkg.prompt,
        pkg.identity,
        pkg.species?.species_id ?? 'human',
        pkg.variants.find(v => v.id === pkg.activeVariantId),
        (pkg.classification as 'character' | 'creature' | 'animal' | 'robot' | 'vehicle' | null) ?? 'character',
      )
      setPkg(p => ({ ...p, qaResult: result }))
    } catch { /* leave existing */ }
    finally { setLoading('qa', false) }
  }

  function handleRepair(action: QARepairAction) {
    if (action.endpoint === '/storyboard/frame/reforge-composition' || action.category === 'identity') {
      handleRegenOne('portrait')
    } else if (action.category === 'composition') {
      handleRegenOne('turnaround/front')
    } else if (action.category === 'props') {
      const firstPropKey = Object.keys(pkg.props)[0]
      if (firstPropKey) handleRegenOne(`props/${firstPropKey}`)
    } else {
      handleRegenOne('portrait')
    }
  }

  // ---------------------------------------------------------------------------
  // Full Reference Pack (premium)
  // ---------------------------------------------------------------------------

  async function handleFullPack() {
    if (pkg.fullPackLoading) return
    setPkg(p => ({ ...p, fullPackLoading: true }))
    try {
      const result = await generateFullCharacterPack(
        character, pkg.renderStyle,
        ['turnaround_360', 'premium_poses', 'material_closeups'],
      )
      setPkg(p => ({
        ...p,
        turnaround360:   result['turnaround_360'] ?? null,
        premiumPoses:    result['premium_poses']  ?? null,
        materialCloseups:result['material_closeups'] ?? null,
        fullPackLoading: false,
        fullPackGenerated: true,
      }))
    } catch {
      setPkg(p => ({ ...p, fullPackLoading: false }))
    }
  }

  // ---------------------------------------------------------------------------
  // Download section as ZIP
  // ---------------------------------------------------------------------------

  async function downloadSectionZip(sectionName: string, images: Record<string, string | null>) {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const folder = zip.folder(sectionName)!
    await Promise.all(Object.entries(images).filter(([,v]) => v).map(async ([k, v]) => {
      try {
        const res = await fetch(v!)
        folder.file(`${k}.png`, await res.blob())
      } catch { /* skip */ }
    }))
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `${character.name.replace(/\s+/g,'_')}_${sectionName}.zip`)
  }

  // ---------------------------------------------------------------------------
  // Colour palette (derived from character description)
  // ---------------------------------------------------------------------------

  const isDark = character.facial_blueprint?.base_ethnicity_or_type?.toLowerCase().includes('dark')
  const paletteColors = [
    { label:'Skin',             color: isDark ? '#5c3a1e' : '#d4956a' },
    { label:'Hair',             color:'#3a2c1a' },
    { label:'Eyes',             color:'#2e5ca8' },
    { label:'Primary Clothing', color:'#3a3a5c' },
    { label:'Accent',           color:'#c9a84c' },
  ]

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const isLoading = (section: string) => !!pkg.loading[section]

  // Auto-init progress indicator
  const autoInitInProgress = AUTO_INIT_SECTIONS.some(s => isLoading(s))
  const autoInitDoneCount  = AUTO_INIT_SECTIONS.filter(s => {
    if (s === 'portrait') return !!pkg.portrait
    const map = pkg[s as keyof CharacterPackage] as Record<string, string | null> | null
    return map && Object.values(map).some(v => v !== null)
  }).length

  function SectionHeader({ title, section }: { title: string; section: string }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>{title}</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => handleBulkRegen(section.toLowerCase())} disabled={isLoading(section.toLowerCase())}
            style={{ fontSize:9, letterSpacing:'0.15em', color:'var(--gold)', textTransform:'uppercase', background:'none', border:'1px solid rgba(201,168,76,0.3)', borderRadius:4, padding:'5px 12px', cursor:isLoading(section.toLowerCase())?'wait':'pointer', opacity:isLoading(section.toLowerCase())?0.4:1 }}>
            {isLoading(section.toLowerCase()) ? 'Rendering…' : '↺ Regenerate All'}
          </button>
          {section !== 'portrait' && (
            <button onClick={() => {
              const imgMap = section === 'turnaround' ? pkg.turnaround : section === 'expressions' ? pkg.expressions : section === 'poses' ? pkg.poses : pkg.outfits
              downloadSectionZip(section, imgMap)
            }}
              style={{ fontSize:9, letterSpacing:'0.15em', color:'var(--text-muted)', textTransform:'uppercase', background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'5px 12px', cursor:'pointer', opacity:0.6 }}>
              ↓ ZIP
            </button>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden">
      <style>{`@keyframes pkg-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Shared gallery lightbox */}
      {gallery && (
        <GalleryLightbox
          items={gallery.items}
          initialIndex={gallery.index}
          onClose={() => setGallery(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding:'14px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gold)', opacity:0.5, fontSize:18, padding:0, lineHeight:1 }}>←</button>
        )}
        {pkg.portrait ? (
          <img src={pkg.portrait} alt="" style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:'1px solid rgba(201,168,76,0.3)', flexShrink:0 }} />
        ) : (
          <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--bg-raised)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
            <span style={{ color:'var(--gold)', opacity:0.6, fontSize:14, fontFamily:'Georgia,serif', fontWeight:'bold' }}>
              {character.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </span>
            {autoInitInProgress && (
              <div style={{
                position:'absolute', inset:0, borderRadius:'50%',
                border:'2px solid transparent', borderTop:'2px solid var(--gold)',
                animation:'pkg-spin 1s linear infinite',
              }} />
            )}
          </div>
        )}
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:14, fontWeight:600, color:'var(--text-base)', fontFamily:'Georgia,serif', letterSpacing:'0.04em' }}>{character.name}</h1>
          <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--gold)', opacity:0.4, textTransform:'uppercase', marginTop:2 }}>Character DNA · {character.id}</p>
        </div>

        {/* Auto-init progress bar */}
        {!pkg.autoInitDone && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
            <span style={{ fontSize:8, letterSpacing:'0.15em', color:'var(--gold)', opacity:0.6, textTransform:'uppercase' }}>
              {autoInitInProgress ? `Auto-generating… ${autoInitDoneCount}/${AUTO_INIT_SECTIONS.length}` : 'Initialising…'}
            </span>
            <div style={{ width:120, height:2, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
              <div style={{
                height:'100%', background:'var(--gold)', borderRadius:2,
                width:`${(autoInitDoneCount / AUTO_INIT_SECTIONS.length) * 100}%`,
                transition:'width 400ms ease',
              }} />
            </div>
          </div>
        )}
        {pkg.autoInitDone && (
          <span style={{ fontSize:8, letterSpacing:'0.15em', color:'#4ade80', opacity:0.7, textTransform:'uppercase' }}>✓ Package Ready</span>
        )}

        {/* Detail level toggle — only shown for B&W styles */}
        {isBW && (
          <div style={{ display:'flex', alignItems:'center', gap:0, border:'1px solid var(--border)', borderRadius:4, overflow:'hidden', flexShrink:0 }}>
            {(['simple', 'detailed'] as DetailLevel[]).map((level, i) => {
              const active = detailLevel === level
              const label  = level === 'simple' ? 'Simple' : 'Detailed'
              const tooltip = level === 'simple'
                ? 'Clean outlines only — download and add your own shading'
                : 'Fully inked with crosshatch shading — studio-ready reference'
              return (
                <button
                  key={level}
                  title={tooltip}
                  onClick={() => handleDetailToggle(level)}
                  disabled={autoInitInProgress}
                  style={{
                    padding:'5px 12px', fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase',
                    cursor: autoInitInProgress ? 'wait' : 'pointer',
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? 'var(--bg-base)' : 'var(--text-muted)',
                    border:'none',
                    borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                    fontWeight: active ? 700 : 400,
                    opacity: autoInitInProgress && !active ? 0.4 : 1,
                    transition:'background 150ms ease, color 150ms ease',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Premium Full Pack Banner */}
      {!pkg.fullPackGenerated && (
        <div style={{
          padding:'10px 24px', background:'rgba(201,168,76,0.04)', borderBottom:'1px solid rgba(201,168,76,0.15)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <div>
            <span style={{ fontSize:9, letterSpacing:'0.2em', color:'var(--gold)', textTransform:'uppercase', opacity:0.8 }}>
              ✦ Full Character Reference Pack
            </span>
            <span style={{ fontSize:9, color:'var(--text-muted)', opacity:0.45, marginLeft:10 }}>
              360° turntable · T/A-pose · Close-up material refs · Export-ready sheets
            </span>
          </div>
          <button
            onClick={handleFullPack}
            disabled={pkg.fullPackLoading}
            style={{
              padding:'7px 18px', borderRadius:4, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase',
              cursor: pkg.fullPackLoading ? 'wait' : 'pointer',
              border:'1px solid var(--gold)', background: pkg.fullPackLoading ? 'rgba(201,168,76,0.1)' : 'var(--gold)',
              color: pkg.fullPackLoading ? 'var(--gold)' : 'var(--bg-base)',
              fontWeight: 700, opacity: pkg.fullPackLoading ? 0.5 : 1,
              transition:'all 150ms ease',
            }}>
            {pkg.fullPackLoading ? 'Generating…' : 'Generate Full Pack'}
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, padding:'0 24px', borderBottom:'1px solid var(--border)', flexShrink:0, overflowX:'auto' }}>
        {PACKAGE_TABS.map(tab => {
          const hasNew = tab === 'Versions' && pkg.versions.length > 0
          return (
            <button key={tab} onClick={() => handleTabChange(tab)}
              style={{
                padding:'10px 14px', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer',
                background:'none', border:'none', borderBottom: activeTab===tab ? '2px solid var(--gold)' : '2px solid transparent',
                color: activeTab===tab ? 'var(--gold)' : 'var(--text-muted)', opacity: activeTab===tab ? 1 : 0.5,
                transition:'color 150ms ease', whiteSpace:'nowrap', position:'relative',
              }}>
              {tab}
              {hasNew && (
                <span style={{ position:'absolute', top:8, right:4, width:4, height:4, borderRadius:'50%', background:'var(--gold)' }} />
              )}
              {/* Loading indicator per tab */}
              {isLoading(tab.toLowerCase()) && (
                <span style={{
                  position:'absolute', bottom:0, left:0, right:0, height:2,
                  background:'linear-gradient(90deg, transparent, var(--gold), transparent)',
                  animation:'shimmer 1s ease infinite',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:24 }}>

        {/* ── Overview ─────────────────────────────────── */}
        {activeTab === 'Overview' && pkg.overview && (
          <OverviewSection
            pkg={pkg}
            onUpdate={ov => setPkg(p => ({ ...p, overview: ov }))}
            onGenerateOverview={handleGenerateOverview}
            isGenerating={overviewGenerating}
          />
        )}

        {/* ── Identity ─────────────────────────────────── */}
        {activeTab === 'Identity' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Character Identity</h2>
                <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:4, lineHeight:1.6 }}>
                  Layer 1 — who the character is. Immutable across species, outfits, and rendering styles.
                </p>
              </div>
            </div>

            {/* Species Selector */}
            <div style={{ marginBottom:28 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>Species Profile</p>
              <SpeciesSelector
                species={pkg.species}
                onChange={sp => setPkg(p => ({ ...p, species: sp }))}
              />
            </div>

            {/* Physical Form */}
            <div style={{ marginBottom:28 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>Physical Form</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                {(['humanoid','quadruped','dragon','bird','serpent','spirit','robot','vehicle','hybrid','custom'] as const).map(f => (
                  <button key={f} onClick={() => setPkg(p => ({ ...p, physicalForm: { ...p.physicalForm, form: f } }))}
                    style={{
                      padding:'5px 12px', borderRadius:999, fontSize:9, cursor:'pointer',
                      border:`1px solid ${pkg.physicalForm.form===f ? 'var(--gold)' : 'var(--border)'}`,
                      background: pkg.physicalForm.form===f ? 'rgba(201,168,76,0.15)' : 'transparent',
                      color: pkg.physicalForm.form===f ? 'var(--gold)' : 'var(--text-muted)',
                      letterSpacing:'0.1em', textTransform:'capitalize', transition:'all 120ms',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:16 }}>
                {[{key:'has_wings', label:'Has Wings'},{key:'has_tail', label:'Has Tail'}].map(({key, label}) => (
                  <label key={key} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:'var(--text-muted)', opacity:0.7 }}>
                    <input type="checkbox"
                      checked={pkg.physicalForm[key as 'has_wings'|'has_tail']}
                      onChange={e => setPkg(p => ({ ...p, physicalForm: { ...p.physicalForm, [key]: e.target.checked } }))}
                      style={{ accentColor:'var(--gold)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Classification */}
            <div style={{ marginBottom:28 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>
                Classification — narrative role only, never affects anatomy
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(['human','god','demon','angel','alien','robot','spirit','monster','hero','villain','deity','custom'] as const).map(c => (
                  <button key={c} onClick={() => setPkg(p => ({ ...p, classification: pkg.classification === c ? null : c }))}
                    style={{
                      padding:'5px 12px', borderRadius:999, fontSize:9, cursor:'pointer',
                      border:`1px solid ${pkg.classification===c ? 'var(--gold)' : 'var(--border)'}`,
                      background: pkg.classification===c ? 'rgba(201,168,76,0.15)' : 'transparent',
                      color: pkg.classification===c ? 'var(--gold)' : 'var(--text-muted)',
                      letterSpacing:'0.1em', textTransform:'capitalize', transition:'all 120ms',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Use Generated Image → Identity Slot */}
            {(() => {
              const generated: { url: string; label: string }[] = []
              if (pkg.portrait) generated.push({ url: pkg.portrait, label: 'Portrait' })
              Object.entries(pkg.turnaround).forEach(([k, v]) => {
                if (v) generated.push({ url: v, label: { front:'Front', three_q_front:'¾ Front', side:'Side', three_q_back:'¾ Back', back:'Back' }[k] ?? k })
              })
              Object.entries(pkg.expressions).forEach(([k, v]) => {
                if (v) generated.push({ url: v, label: k.charAt(0).toUpperCase() + k.slice(1) })
              })
              Object.entries(pkg.poses).forEach(([k, v]) => {
                if (v) generated.push({ url: v, label: k.charAt(0).toUpperCase() + k.slice(1) })
              })
              if (generated.length === 0) return null
              const handlePickIdentity = (url: string, slot: RefSlot) => {
                const base: import('../types/storyboard').CharacterIdentity = pkg.identity ?? {
                  name: character.name, face_description: null, hair_description: null,
                  eye_description: null, body_proportions: null, age: null,
                  distinct_markers: null, signature_accessories: [],
                  reference_primary: null, reference_front: null, reference_left: null,
                  reference_right: null, reference_back: null,
                }
                setPkg(p => ({ ...p, identity: { ...base, [slot]: url } }))
              }
              return <GeneratedImagePicker images={generated} onSelect={handlePickIdentity} />
            })()}

            {/* Reference Image Upload */}
            {pkg.identity ? (
              <IdentityUploader
                identity={pkg.identity}
                onChange={id => setPkg(p => ({ ...p, identity: id }))}
                characterId={character.id}
              />
            ) : (
              <div style={{ padding:'24px 0' }}>
                <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginBottom:12, lineHeight:1.7 }}>
                  No identity set yet. Fill in the fields below to establish the character's canonical identity.
                </p>
                <button onClick={() => setPkg(p => ({
                  ...p, identity: {
                    name: character.name, face_description: null, hair_description: null,
                    eye_description: null, body_proportions: null, age: null,
                    distinct_markers: null, signature_accessories: [],
                    reference_primary: null, reference_front: null, reference_left: null,
                    reference_right: null, reference_back: null,
                  }
                }))}
                  style={{ padding:'8px 20px', borderRadius:4, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', border:'1px solid var(--gold)', background:'transparent', color:'var(--gold)' }}>
                  + Initialise Identity
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Variants ─────────────────────────────────── */}
        {activeTab === 'Variants' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Appearance Variants</h2>
              <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:4, lineHeight:1.6 }}>
                Layer 3 — how the character appears at different story points. Variants inherit identity and never modify it.
              </p>
            </div>
            <VariantManager
              variants={pkg.variants}
              activeVariantId={pkg.activeVariantId}
              onActivate={id => setPkg(p => ({ ...p, activeVariantId: id }))}
              onChange={updated => setPkg(p => ({ ...p, variants: updated }))}
            />
          </div>
        )}

        {/* ── (old Portrait tab content mapped to Expressions now — kept below) ── */}
        {activeTab === 'Portrait' && (
          <div>
            <SectionHeader title="Hero Portrait" section="portrait" />
            <StarBanner starredImage={pkg.starredImage} onClear={() => setPkg(p => ({ ...p, starredImage: null, lockedImage: null }))} />
            <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
              <ImageTile url={pkg.portrait} label="Portrait" width={200} height={260} isLoading={isLoading('portrait')} onRegen={() => handleRegenOne('portrait')}
                isStarred={!!pkg.portrait && pkg.starredImage === pkg.portrait}
                onToggleStar={() => pkg.portrait && handleToggleStar(pkg.portrait)}
                isLocked={!!pkg.portrait && pkg.lockedImages.has(pkg.portrait)}
                onToggleLock={() => pkg.portrait && handleToggleLock(pkg.portrait)}
                onOpen={() => pkg.portrait && setGallery({ items:[{ url: pkg.portrait, label:'Portrait' }], index:0 })} />
              <div style={{ flex:1, maxWidth:320 }}>
                <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.6, marginBottom:8 }}>Generation Notes</p>
                <p style={{ fontSize:11, color:'var(--text-base)', opacity:0.65, lineHeight:1.7 }}>
                  Neutral pose, looking at camera, clean background, cinematic lighting. Used for character identification and header thumbnails.
                </p>
                {pkg.portrait && (
                  <button onClick={async () => { try { const r=await fetch(pkg.portrait!); saveAs(await r.blob(), `${character.name}_portrait.png`) } catch { window.open(pkg.portrait!,'_blank') }}}
                    style={{ marginTop:16, padding:'8px 18px', borderRadius:4, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', border:'1px solid var(--gold)', background:'transparent', color:'var(--gold)' }}>
                    ↓ Download PNG
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Turnaround ───────────────────────────────── */}
        {activeTab === 'Turnaround' && (
          <div>
            <SectionHeader title="Turnaround Sheet — 5 Views" section="turnaround" />
            <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.5, marginBottom:20, lineHeight:1.6 }}>
              Industry-standard 5-view reference sheet. For the 360° turntable (8 angles) use the Full Reference Pack.
            </p>
            <StarBanner starredImage={pkg.starredImage} onClear={() => setPkg(p => ({ ...p, starredImage: null, lockedImage: null }))} />
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {TURNAROUND_KEYS.map(key => (
                <ImageTile key={key} url={pkg.turnaround[key]} label={TURNAROUND_LABELS[key]} width={130} height={180}
                  isLoading={isLoading(`turnaround/${key}`)} onRegen={() => handleRegenOne(`turnaround/${key}`)}
                  isStarred={!!pkg.turnaround[key] && pkg.starredImage === pkg.turnaround[key]}
                  onToggleStar={() => pkg.turnaround[key] && handleToggleStar(pkg.turnaround[key]!)}
                  isLocked={!!pkg.turnaround[key] && pkg.lockedImages.has(pkg.turnaround[key]!)}
                  onToggleLock={() => pkg.turnaround[key] && handleToggleLock(pkg.turnaround[key]!)}
                  onOpen={() => openGallery(pkg.turnaround, TURNAROUND_KEYS, TURNAROUND_LABELS, key)} />
              ))}
            </div>

            {/* 360° section (premium) */}
            {pkg.fullPackGenerated && pkg.turnaround360 && (
              <div style={{ marginTop:32 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <h3 style={{ fontSize:10, letterSpacing:'0.25em', color:'var(--gold)', opacity:0.8, textTransform:'uppercase', fontWeight:500 }}>360° Turntable</h3>
                    <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:2 }}>8-angle full rotation — export-ready for Maya, Blender, Unreal, Unity</p>
                  </div>
                  <button onClick={() => downloadSectionZip('turnaround_360', pkg.turnaround360!)}
                    style={{ fontSize:9, letterSpacing:'0.15em', color:'var(--text-muted)', textTransform:'uppercase', background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'5px 12px', cursor:'pointer', opacity:0.6 }}>
                    ↓ ZIP
                  </button>
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {TURNAROUND_360_KEYS.map(key => (
                    <ImageTile key={key} url={pkg.turnaround360![key] ?? null} label={TURNAROUND_360_LABELS[key]}
                      width={110} height={150} onRegen={() => handleRegenOne(`turnaround/${key}`)}
                      onOpen={() => openGallery(pkg.turnaround360! as Record<string,string|null>, TURNAROUND_360_KEYS, TURNAROUND_360_LABELS, key)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Expressions ──────────────────────────────── */}
        {activeTab === 'Expressions' && (
          <div>
            <SectionHeader title="Expression Sheet — 9 Expressions" section="expressions" />
            <StarBanner starredImage={pkg.starredImage} onClear={() => setPkg(p => ({ ...p, starredImage: null, lockedImage: null }))} />
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              {EXPRESSION_KEYS.map(key => (
                <ImageTile key={key} url={pkg.expressions[key]} label={`${EXPRESSION_EMOJIS[key]} ${key.charAt(0).toUpperCase()+key.slice(1)}`}
                  width={110} height={130} isLoading={isLoading(`expressions/${key}`)} onRegen={() => handleRegenOne(`expressions/${key}`)}
                  isStarred={!!pkg.expressions[key] && pkg.starredImage === pkg.expressions[key]}
                  onToggleStar={() => pkg.expressions[key] && handleToggleStar(pkg.expressions[key]!)}
                  isLocked={!!pkg.expressions[key] && pkg.lockedImages.has(pkg.expressions[key]!)}
                  onToggleLock={() => pkg.expressions[key] && handleToggleLock(pkg.expressions[key]!)}
                  onOpen={() => {
                    const emojiLabels = Object.fromEntries(EXPRESSION_KEYS.map(k => [k, `${EXPRESSION_EMOJIS[k]} ${k.charAt(0).toUpperCase()+k.slice(1)}`]))
                    openGallery(pkg.expressions, EXPRESSION_KEYS, emojiLabels, key)
                  }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Poses ────────────────────────────────────── */}
        {activeTab === 'Poses' && (
          <div>
            <SectionHeader title="Pose Sheet — 7 Common Poses" section="poses" />
            <StarBanner starredImage={pkg.starredImage} onClear={() => setPkg(p => ({ ...p, starredImage: null, lockedImage: null }))} />
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {POSE_KEYS.map(key => (
                <ImageTile key={key} url={pkg.poses[key]} label={POSE_LABELS[key]} width={110} height={130}
                  isLoading={isLoading(`poses/${key}`)} onRegen={() => handleRegenOne(`poses/${key}`)}
                  isStarred={!!pkg.poses[key] && pkg.starredImage === pkg.poses[key]}
                  onToggleStar={() => pkg.poses[key] && handleToggleStar(pkg.poses[key]!)}
                  isLocked={!!pkg.poses[key] && pkg.lockedImages.has(pkg.poses[key]!)}
                  onToggleLock={() => pkg.poses[key] && handleToggleLock(pkg.poses[key]!)}
                  onOpen={() => openGallery(pkg.poses, POSE_KEYS, POSE_LABELS, key)} />
              ))}
            </div>

            {/* Premium poses */}
            {pkg.fullPackGenerated && pkg.premiumPoses && (
              <div style={{ marginTop:32 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <h3 style={{ fontSize:10, letterSpacing:'0.25em', color:'var(--gold)', opacity:0.8, textTransform:'uppercase', fontWeight:500 }}>Extended Pose Library</h3>
                    <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:2 }}>T-pose · A-pose · 6 additional action poses</p>
                  </div>
                  <button onClick={() => downloadSectionZip('premium_poses', pkg.premiumPoses!)}
                    style={{ fontSize:9, letterSpacing:'0.15em', color:'var(--text-muted)', textTransform:'uppercase', background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'5px 12px', cursor:'pointer', opacity:0.6 }}>
                    ↓ ZIP
                  </button>
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  {PREMIUM_POSE_KEYS.map(key => (
                    <ImageTile key={key} url={pkg.premiumPoses![key] ?? null} label={PREMIUM_POSE_LABELS[key]}
                      width={120} height={160}
                      onOpen={() => openGallery(pkg.premiumPoses! as Record<string,string|null>, PREMIUM_POSE_KEYS, PREMIUM_POSE_LABELS, key)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Outfits ──────────────────────────────────── */}
        {activeTab === 'Outfits' && (
          <div>
            <SectionHeader title="Outfit Variations — 7 Costumes" section="outfits" />
            <StarBanner starredImage={pkg.starredImage} onClear={() => setPkg(p => ({ ...p, starredImage: null, lockedImage: null }))} />
            <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.5, marginBottom:20, lineHeight:1.6 }}>
              Each outfit can be regenerated independently without affecting the others.
            </p>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {OUTFIT_KEYS.map(key => (
                <ImageTile key={key} url={pkg.outfits[key]} label={OUTFIT_LABELS[key]} width={110} height={130}
                  isLoading={isLoading(`outfits/${key}`)} onRegen={() => handleRegenOne(`outfits/${key}`)}
                  isStarred={!!pkg.outfits[key] && pkg.starredImage === pkg.outfits[key]}
                  onToggleStar={() => pkg.outfits[key] && handleToggleStar(pkg.outfits[key]!)}
                  isLocked={!!pkg.outfits[key] && pkg.lockedImages.has(pkg.outfits[key]!)}
                  onToggleLock={() => pkg.outfits[key] && handleToggleLock(pkg.outfits[key]!)}
                  onOpen={() => openGallery(pkg.outfits, OUTFIT_KEYS, OUTFIT_LABELS, key)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Colour Palette ───────────────────────────── */}
        {activeTab === 'Palette' && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500, marginBottom:20 }}>Colour Palette</h2>
            <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.5, marginBottom:20, lineHeight:1.6 }}>
              Extracted from character description. These colours maintain visual consistency across all generated assets.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:28 }}>
              {paletteColors.map(({ label, color }) => (
                <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ width:56, height:56, borderRadius:8, background:color, border:'1px solid rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize:8, color:'var(--text-muted)', opacity:0.6, textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
                  <span style={{ fontSize:8, color:'var(--text-muted)', opacity:0.4, fontFamily:'monospace' }}>{color}</span>
                </div>
              ))}
            </div>

            {/* Material close-ups (premium) */}
            {pkg.fullPackGenerated && pkg.materialCloseups && (
              <div style={{ marginTop:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <h3 style={{ fontSize:10, letterSpacing:'0.25em', color:'var(--gold)', opacity:0.8, textTransform:'uppercase', fontWeight:500 }}>Material Close-up References</h3>
                  <button onClick={() => downloadSectionZip('material_closeups', pkg.materialCloseups!)}
                    style={{ fontSize:9, letterSpacing:'0.15em', color:'var(--text-muted)', textTransform:'uppercase', background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'5px 12px', cursor:'pointer', opacity:0.6 }}>
                    ↓ ZIP
                  </button>
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {MATERIAL_KEYS.map(key => (
                    <ImageTile key={key} url={pkg.materialCloseups![key] ?? null} label={MATERIAL_LABELS[key]}
                      width={100} height={100}
                      onOpen={() => openGallery(pkg.materialCloseups! as Record<string,string|null>, MATERIAL_KEYS, MATERIAL_LABELS, key)} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'14px 16px', marginTop:20 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', opacity:0.5, textTransform:'uppercase', marginBottom:10 }}>Wardrobe Description</p>
              <p style={{ fontSize:11, color:'var(--text-base)', opacity:0.75, lineHeight:1.7 }}>{character.wardrobe_defaults}</p>
            </div>
          </div>
        )}

        {/* ── Props ────────────────────────────────────── */}
        {activeTab === 'Props' && (
          <div>
            <SectionHeader title="Props & Accessories" section="props" />
            {Object.keys(pkg.props).length === 0 && !isLoading('props') ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:180, gap:12 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', opacity:0.3, letterSpacing:'0.15em', textTransform:'uppercase' }}>No props generated yet</p>
                <button onClick={() => handleBulkRegen('props')}
                  style={{ padding:'8px 20px', borderRadius:4, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', border:'1px solid var(--gold)', background:'transparent', color:'var(--gold)' }}>
                  Auto-Detect & Generate Props
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {Object.entries(pkg.props).map(([key, url]) => (
                  <ImageTile key={key} url={url} label={key} width={100} height={100}
                    isLoading={isLoading(`props/${key}`)} onRegen={() => handleRegenOne(`props/${key}`)}
                    onOpen={() => openGallery(pkg.props, Object.keys(pkg.props), Object.fromEntries(Object.keys(pkg.props).map(k => [k,k])), key)} />
                ))}
                {isLoading('props') && <Spinner />}
              </div>
            )}
          </div>
        )}

        {/* ── Abilities ────────────────────────────────── */}
        {activeTab === 'Abilities' && (
          <div style={{ maxWidth:680 }}>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Character Abilities</h2>
              <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:4, lineHeight:1.6 }}>
                Abilities influence Director Engine shot selection. A flying character gets aerial shots preferred;
                fire_breath gets wide dramatic framing. These are injected into every frame prompt at generation time.
              </p>
            </div>

            {/* Ability chip grid */}
            <div style={{ marginBottom:24 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>Active Abilities</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(['flight','teleportation','fire_breath','immortality','shapeshifting','magic','lightning','healing','super_strength','invisibility','mind_control'] as const).map(a => {
                  const active = pkg.abilities.includes(a)
                  return (
                    <button key={a} onClick={() => setPkg(p => ({
                      ...p, abilities: active ? p.abilities.filter(x => x !== a) : [...p.abilities, a]
                    }))}
                      style={{
                        padding:'5px 12px', borderRadius:999, fontSize:9, cursor:'pointer',
                        border:`1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                        background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                        color: active ? 'var(--gold)' : 'var(--text-muted)',
                        letterSpacing:'0.1em', textTransform:'capitalize', transition:'all 120ms',
                      }}>
                      {a.replace(/_/g,' ')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Visual Rules */}
            <div style={{ marginBottom:24 }}>
              <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>
                Visual Rules — enforced by QA Engine and Director Engine
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {pkg.visualRules.map((rule, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 10px' }}>
                    <span style={{ flex:1, fontSize:10, color:'var(--text-base)', opacity:0.75 }}>{rule}</span>
                    <button onClick={() => setPkg(p => ({ ...p, visualRules: p.visualRules.filter((_,j) => j !== i) }))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', opacity:0.4, fontSize:12, padding:0 }}>✕</button>
                  </div>
                ))}
                <RuleAdder onAdd={rule => setPkg(p => ({ ...p, visualRules: [...p.visualRules, rule] }))} />
              </div>
            </div>

            {/* Active ability details */}
            {pkg.abilities.length > 0 && (
              <div>
                <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.5, marginBottom:10 }}>Director Engine Effect</p>
                {pkg.abilities.map(a => {
                  const EFFECT: Record<string, {shots: string; modifier: string}> = {
                    flight:        { shots: 'Aerial, Wide, Establishing preferred · Close avoided', modifier: 'aerial perspective, character in flight' },
                    teleportation: { shots: 'Insert, Close, Medium preferred', modifier: 'energy flash, motion blur, mid-teleport' },
                    fire_breath:   { shots: 'Wide, Extreme Wide, Close preferred · OTS avoided', modifier: 'fire breath, flames, dramatic orange glow' },
                    lightning:     { shots: 'Wide, Establishing, Medium preferred', modifier: 'lightning bolt, electric energy, dramatic flash' },
                    magic:         { shots: 'Medium, Close, Insert preferred', modifier: 'magical energy, arcane glow' },
                    super_strength:{ shots: 'Wide, Medium, Tracking preferred', modifier: 'power stance, dynamic action' },
                    shapeshifting: { shots: 'Medium, Close, Insert preferred', modifier: 'mid-transformation, fluid form' },
                    immortality:   { shots: 'No shot bias', modifier: 'none' },
                    healing:       { shots: 'Close, Insert preferred', modifier: 'glowing aura, healing light' },
                    invisibility:  { shots: 'Medium, Wide preferred', modifier: 'semi-transparent silhouette, shimmer' },
                    mind_control:  { shots: 'Close, OTS preferred', modifier: 'intense eye contact, psychic energy' },
                  }
                  const ef = EFFECT[a]
                  if (!ef) return null
                  return (
                    <div key={a} style={{ marginBottom:8, padding:'10px 14px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'var(--gold)', opacity:0.85, textTransform:'capitalize' }}>{a.replace(/_/g,' ')}</span>
                      </div>
                      <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.5, lineHeight:1.6 }}>Shots: {ef.shots}</p>
                      <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.5, lineHeight:1.6 }}>Prompt: "{ef.modifier}"</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Quality (Visual QA) ───────────────────────── */}
        {activeTab === 'Quality' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Visual QA Engine</h2>
              <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, marginTop:4, lineHeight:1.6 }}>
                Project-Aware QA validates generated images against the character's DNA: identity, species, anatomy,
                composition, camera, lighting, props, environment, and continuity. Pass threshold is 80%.
              </p>
            </div>
            <VisualQAPanel
              qaResult={pkg.qaResult}
              onRunQA={handleRunQA}
              onRepair={handleRepair}
              loading={isLoading('qa')}
            />
          </div>
        )}

        {/* ── Relationships ────────────────────────────── */}
        {activeTab === 'Relationships' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500 }}>Relationship Graph</h2>
              <span style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4 }}>
                {pkg.relationships.length} connection{pkg.relationships.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <RelationshipGraph relationships={pkg.relationships} characterName={character.name} />
          </div>
        )}

        {/* ── Scene Appearances ────────────────────────── */}
        {activeTab === 'Scenes' && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500, marginBottom:20 }}>Scene Appearances</h2>
            {pkg.sceneAppearances.length === 0 ? (
              <p style={{ fontSize:11, color:'var(--text-muted)', opacity:0.35, lineHeight:1.7 }}>
                No scene appearances detected. The character's first name was not found in any frame action descriptions.
              </p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pkg.sceneAppearances.map(num => {
                  const scene = scenes.find(s => s.scene_number === num)
                  if (!scene) return null
                  const thumb = scene.frames.find(f => f.generated_image_url)?.generated_image_url
                  return (
                    <div key={num} style={{ display:'flex', alignItems:'center', gap:14, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 14px' }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width:64, height:40, objectFit:'cover', borderRadius:3, border:'1px solid var(--border)', flexShrink:0 }} />
                      ) : (
                        <div style={{ width:64, height:40, background:'var(--bg-base)', borderRadius:3, border:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:9, color:'var(--text-muted)', opacity:0.3 }}>S{num}</span>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize:12, color:'var(--text-base)', opacity:0.8, fontFamily:'Georgia,serif' }}>Scene {num}</p>
                        <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.5, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>{scene.location_heading} · {scene.time_of_day}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI Prompt ────────────────────────────────── */}
        {activeTab === 'AI Prompt' && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500, marginBottom:8 }}>AI Generation Prompt</h2>
            <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.5, marginBottom:16, lineHeight:1.6 }}>
              This prompt drives all generated images in this package. Edit it to control appearance, then click Save. The next regeneration of any section will use the updated prompt.
            </p>

            {/* Detail level inline control */}
            {isBW && (
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, padding:'10px 14px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:8, letterSpacing:'0.2em', color:'var(--text-muted)', textTransform:'uppercase', opacity:0.6, marginBottom:3 }}>Detail Level</p>
                  <p style={{ fontSize:10, color:'var(--text-base)', opacity:0.6, lineHeight:1.5 }}>
                    {detailLevel === 'simple'
                      ? 'Clean outlines only — lightweight reference for artists to shade themselves.'
                      : 'Fully inked with crosshatch shading — studio-ready reference.'}
                  </p>
                </div>
                <div style={{ display:'flex', gap:0, border:'1px solid var(--border)', borderRadius:4, overflow:'hidden', flexShrink:0 }}>
                  {(['simple', 'detailed'] as DetailLevel[]).map((level, i) => (
                    <button key={level}
                      onClick={() => handleDetailToggle(level)}
                      disabled={autoInitInProgress}
                      style={{
                        padding:'6px 14px', fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase',
                        cursor: autoInitInProgress ? 'wait' : 'pointer',
                        background: detailLevel === level ? 'var(--gold)' : 'transparent',
                        color: detailLevel === level ? 'var(--bg-base)' : 'var(--text-muted)',
                        border:'none', borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                        fontWeight: detailLevel === level ? 700 : 400,
                        transition:'background 150ms ease, color 150ms ease',
                      }}>
                      {level === 'simple' ? 'Simple' : 'Detailed'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              rows={7}
              style={{ width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'12px 14px', fontSize:11, color:'var(--text-base)', outline:'none', resize:'vertical', fontFamily:'monospace', lineHeight:1.7 }}
              onFocus={e=>(e.target.style.borderColor='var(--gold)')}
              onBlur={e=>(e.target.style.borderColor='var(--border)')}
            />
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <button onClick={() => setPkg(p => ({ ...p, prompt: promptDraft }))}
                style={{ padding:'8px 18px', borderRadius:4, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', border:'1px solid var(--gold)', background:'var(--gold)', color:'var(--bg-base)', fontWeight:700 }}>
                ✓ Save Prompt
              </button>
              <button onClick={() => setPromptDraft(pkg.prompt)}
                style={{ padding:'8px 14px', borderRadius:4, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)' }}>
                Reset
              </button>
            </div>
            {promptDraft !== pkg.prompt && (
              <p style={{ fontSize:9, color:'rgba(201,168,76,0.7)', marginTop:8, letterSpacing:'0.1em' }}>⚠ Unsaved changes — save before regenerating</p>
            )}
          </div>
        )}

        {/* ── Versions ─────────────────────────────────── */}
        {activeTab === 'Versions' && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontSize:11, letterSpacing:'0.3em', color:'var(--text-base)', opacity:0.7, textTransform:'uppercase', fontWeight:500, marginBottom:20 }}>Version History</h2>
            {pkg.versions.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:140, gap:8 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', opacity:0.25, letterSpacing:'0.15em', textTransform:'uppercase' }}>No versions yet</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.2, lineHeight:1.6, textAlign:'center', maxWidth:280 }}>
                  Every time you click "Regenerate All" on any section, the current images are saved as a version here.
                </p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[...pkg.versions].reverse().map(v => (
                  <div key={v.version} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'var(--text-base)', opacity:0.7 }}>Version {v.version}</span>
                      <span style={{ fontSize:9, color:'var(--text-muted)', opacity:0.4, letterSpacing:'0.1em' }}>{v.timestamp}</span>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {Object.entries(v.images).filter(([,url]) => url).slice(0,8).map(([key, url]) => (
                        <img key={key} src={url!} alt={key} style={{ width:48, height:48, objectFit:'cover', borderRadius:3, border:'1px solid var(--border)' }} />
                      ))}
                    </div>
                    <button
                      onClick={() => setPkg(p => ({
                        ...p,
                        portrait: (v.images['portrait'] ?? p.portrait),
                      }))}
                      style={{ marginTop:10, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'5px 12px', cursor:'pointer', color:'var(--text-muted)' }}>
                      ↺ Restore this version
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
