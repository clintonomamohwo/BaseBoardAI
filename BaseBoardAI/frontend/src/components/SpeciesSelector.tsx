/**
 * SpeciesSelector — Layer 2 of the Character Identity System
 *
 * A chip-select grid of built-in species profiles.  Each chip shows the
 * species name, anatomy notes, and QA rules that will be applied during
 * image validation.  Selecting a species updates the character's SpeciesProfile.
 *
 * The active species never changes the character's Identity layer — only the
 * anatomy constraints and prompt prefix change.
 *
 * Usage:
 *   <SpeciesSelector
 *     species={char.species}
 *     onChange={(sp) => updateCharSpecies(sp)}
 *   />
 */

import { useState } from 'react'
import type { SpeciesProfile } from '../types/storyboard'

const BUILTIN_SPECIES: {
  id: string
  label: string
  anatomy: string
  prefix: string
}[] = [
  { id: 'human',   label: 'Human',         anatomy: '2 arms, 2 legs. Standard bipedal human anatomy.',                                prefix: '' },
  { id: 'elf',     label: 'Elf',           anatomy: 'Human base. Pointed ears, elongated proportions.',                               prefix: 'elf, pointed ears' },
  { id: 'wolf',    label: 'Wolf',          anatomy: 'Fur-covered. Canine snout, tail, claws.',                                         prefix: 'wolf, fur, tail' },
  { id: 'dragon',  label: 'Dragon',        anatomy: '4 legs, 2 wings. Scales, horns, tail, claws.',                                    prefix: 'dragon, scales, wings' },
  { id: 'robot',   label: 'Robot',         anatomy: 'Mechanical limbs, metal plating, sensors. No biological anatomy.',                prefix: 'robot, mechanical' },
  { id: 'vampire', label: 'Vampire',       anatomy: 'Human bipedal. Pale skin, fangs, sharp features.',                               prefix: 'vampire, pale, fangs' },
  { id: 'custom',  label: 'Custom',        anatomy: 'Define your own anatomy constraints below.',                                      prefix: '' },
]

interface Props {
  species: SpeciesProfile
  onChange: (updated: SpeciesProfile) => void
}

export default function SpeciesSelector({ species, onChange }: Props) {
  const [showNotes, setShowNotes] = useState(false)

  const active = BUILTIN_SPECIES.find(s => s.id === species.species_id) ?? BUILTIN_SPECIES[0]

  function select(id: string) {
    const s = BUILTIN_SPECIES.find(b => b.id === id)
    if (!s) return
    onChange({
      species_id: id,
      label: s.label,
      custom_notes: id === 'custom' ? (species.custom_notes ?? '') : null,
    })
  }

  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6, marginBottom: 10 }}>
        Species
      </p>

      {/* Chip grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {BUILTIN_SPECIES.map(s => {
          const isActive = species.species_id === s.id
          return (
            <button
              key={s.id}
              onClick={() => select(s.id)}
              style={{
                padding: '5px 10px',
                borderRadius: 4,
                border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 120ms ease',
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = 'var(--text-base)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Anatomy notes for active species */}
      <div
        style={{
          padding: '8px 10px',
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: 'var(--bg-raised)',
          marginBottom: species.species_id === 'custom' ? 10 : 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: 'var(--text-base)', fontWeight: 500 }}>{active.label} Anatomy</p>
          <button
            onClick={() => setShowNotes(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--gold)', opacity: 0.6, padding: 0 }}
          >
            {showNotes ? 'Hide' : 'Details'}
          </button>
        </div>
        {showNotes && (
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.7, marginTop: 4, lineHeight: 1.6 }}>
            {active.anatomy}
          </p>
        )}
        {active.prefix && (
          <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.4, marginTop: 4, fontFamily: 'monospace' }}>
            Prompt prefix: "{active.prefix}"
          </p>
        )}
      </div>

      {/* Custom notes textarea */}
      {species.species_id === 'custom' && (
        <div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.55, marginBottom: 4 }}>
            Describe this species' anatomy constraints (used by the QA Engine):
          </p>
          <textarea
            value={species.custom_notes ?? ''}
            onChange={e => onChange({ ...species, custom_notes: e.target.value })}
            placeholder="e.g. 4 legs, feathered wings, beak, no tail, avian proportions"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              color: 'var(--text-base)',
              fontSize: 10,
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  )
}
