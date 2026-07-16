/**
 * VariantManager — Layer 3 of the Character Identity System
 *
 * Displays a character's appearance variants (Default, Battle Armor, Winter,
 * Elf Form, etc.) and allows creators to add, edit, and delete them.
 *
 * Variants inherit identity — they never modify the core identity layer.
 * Only outfit, hair, accessories, species, age, and scene range change per variant.
 *
 * Usage:
 *   <VariantManager
 *     variants={char.variants ?? []}
 *     activeVariantId={char.active_variant_id ?? 'default'}
 *     onActivate={(id) => setActiveVariant(id)}
 *     onChange={(updated) => setVariants(updated)}
 *   />
 */

import { useState } from 'react'
import type { CharacterVariant } from '../types/storyboard'

const PRESET_VARIANTS: Omit<CharacterVariant, 'variant_id'>[] = [
  { label: 'Default',       outfit: null,                   hair_override: null, age_override: null, species_override: null, extra_accessories: [], scene_range: null, notes: 'Base character appearance' },
  { label: 'Battle Armor',  outfit: 'full combat armor set', hair_override: null, age_override: null, species_override: null, extra_accessories: ['combat gauntlets'], scene_range: null, notes: null },
  { label: 'Winter Outfit', outfit: 'heavy winter coat, scarf, gloves', hair_override: null, age_override: null, species_override: null, extra_accessories: [], scene_range: null, notes: null },
  { label: 'Elf Form',      outfit: null,                   hair_override: null, age_override: null, species_override: 'elf', extra_accessories: [], scene_range: null, notes: 'Alternate species variant' },
  { label: 'Vampire Form',  outfit: 'dark Victorian attire',hair_override: null, age_override: null, species_override: 'vampire', extra_accessories: ['cape'], scene_range: null, notes: null },
  { label: 'Future Version',outfit: null,                   hair_override: null, age_override: 65,   species_override: null, extra_accessories: [], scene_range: null, notes: 'Timeline age variant' },
]

interface Props {
  variants: CharacterVariant[]
  activeVariantId: string | null
  onActivate: (variantId: string) => void
  onChange: (updated: CharacterVariant[]) => void
}

function emptyVariant(): CharacterVariant {
  return {
    variant_id: `variant_${Date.now()}`,
    label: 'New Variant',
    outfit: null,
    hair_override: null,
    age_override: null,
    species_override: null,
    extra_accessories: [],
    scene_range: null,
    notes: null,
  }
}

export default function VariantManager({ variants, activeVariantId, onActivate, onChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)

  function addPreset(preset: Omit<CharacterVariant, 'variant_id'>) {
    const v: CharacterVariant = {
      variant_id: `preset_${preset.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      ...preset,
    }
    onChange([...variants, v])
    setShowPresets(false)
  }

  function addBlank() {
    const v = emptyVariant()
    onChange([...variants, v])
    setEditing(v.variant_id)
  }

  function deleteVariant(id: string) {
    onChange(variants.filter(v => v.variant_id !== id))
    if (editing === id) setEditing(null)
  }

  function patchVariant(id: string, patch: Partial<CharacterVariant>) {
    onChange(variants.map(v => v.variant_id === id ? { ...v, ...patch } : v))
  }

  const displayed = variants.length > 0 ? variants : [{ variant_id: 'default', label: 'Default', outfit: null, hair_override: null, age_override: null, species_override: null, extra_accessories: [], scene_range: null, notes: 'No variants yet — add one below' }]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6 }}>
          Variants
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowPresets(v => !v)} style={btnStyle(false)}>+ Preset</button>
          <button onClick={addBlank} style={btnStyle(false)}>+ Custom</button>
        </div>
      </div>

      {/* Preset picker */}
      {showPresets && (
        <div style={{ marginBottom: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-raised)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5, marginBottom: 6, letterSpacing: '0.1em' }}>Quick-add preset:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESET_VARIANTS.map(p => (
              <button key={p.label} onClick={() => addPreset(p)} style={btnStyle(false)}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Variant list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayed.map(v => {
          const isActive = v.variant_id === activeVariantId
          const isExpanded = editing === v.variant_id

          return (
            <div
              key={v.variant_id}
              style={{
                border: `1px solid ${isActive ? 'rgba(201,168,76,0.45)' : 'var(--border)'}`,
                borderRadius: 6,
                background: isActive ? 'rgba(201,168,76,0.04)' : 'var(--bg-raised)',
                overflow: 'hidden',
                transition: 'border-color 150ms ease',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 8 }}>
                {/* Active indicator */}
                <div
                  onClick={() => onActivate(v.variant_id)}
                  style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                    background: isActive ? 'var(--gold)' : 'transparent',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 4px var(--gold-dim)' : 'none',
                    transition: 'all 120ms ease',
                  }}
                />
                <span style={{ flex: 1, fontSize: 11, color: isActive ? 'var(--gold)' : 'var(--text-base)', fontWeight: isActive ? 600 : 400 }}>
                  {v.label}
                </span>
                {v.species_override && (
                  <span style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.6, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 3, padding: '1px 4px' }}>
                    {v.species_override}
                  </span>
                )}
                {v.age_override != null && (
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.55 }}>age {v.age_override}</span>
                )}
                <button onClick={() => setEditing(isExpanded ? null : v.variant_id)} style={{ ...btnStyle(false), padding: '2px 6px', fontSize: 8 }}>
                  {isExpanded ? 'Close' : 'Edit'}
                </button>
                {v.variant_id !== 'default' && variants.length > 0 && (
                  <button onClick={() => deleteVariant(v.variant_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', opacity: 0.35, padding: 0, lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
                  >✕</button>
                )}
              </div>

              {/* Edit fields */}
              {isExpanded && (
                <div style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Field label="Label" value={v.label} onChange={val => patchVariant(v.variant_id, { label: val })} />
                  <Field label="Outfit" value={v.outfit ?? ''} onChange={val => patchVariant(v.variant_id, { outfit: val || null })} placeholder="e.g. full combat armor, leather jacket" />
                  <Field label="Hair override" value={v.hair_override ?? ''} onChange={val => patchVariant(v.variant_id, { hair_override: val || null })} placeholder="Leave blank to use identity hair" />
                  <Field label="Species override" value={v.species_override ?? ''} onChange={val => patchVariant(v.variant_id, { species_override: val || null })} placeholder="e.g. elf, vampire (blank = inherit)" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Field label="Age override" value={v.age_override != null ? String(v.age_override) : ''} onChange={val => patchVariant(v.variant_id, { age_override: val ? parseInt(val, 10) : null })} placeholder="Leave blank to inherit" />
                    </div>
                  </div>
                  <Field label="Notes" value={v.notes ?? ''} onChange={val => patchVariant(v.variant_id, { notes: val || null })} placeholder="Optional notes" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, marginTop: 8, lineHeight: 1.6 }}>
        Variants inherit the identity layer. Changing an outfit or hair here never modifies the character's core face, eyes, or distinct markers.
      </p>
    </div>
  )
}

function btnStyle(active: boolean) {
  return {
    padding: '4px 8px',
    borderRadius: 3,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: 'transparent',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
    fontSize: 9,
    cursor: 'pointer',
    letterSpacing: '0.06em',
  } as React.CSSProperties
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.5, marginBottom: 3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '5px 8px', borderRadius: 3,
          border: '1px solid var(--border)', background: 'var(--bg-base)',
          color: 'var(--text-base)', fontSize: 10, outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}
