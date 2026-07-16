/**
 * IdentityUploader — Character Identity Reference Image Grid
 *
 * Allows a creator to upload up to 5 canonical reference views for a
 * character's identity:  Primary Portrait, Front, Left Profile,
 * Right Profile, and Back.  Uploading any image triggers a backend
 * LLM extraction pass that populates identity fields automatically.
 *
 * Usage:
 *   <IdentityUploader
 *     identity={char.identity}
 *     onChange={(updated) => setIdentity(updated)}
 *     onExtracted={(fields) => mergeIdentityFields(fields)}
 *     characterId={char.id}
 *   />
 */

import { useRef } from 'react'
import type { CharacterIdentity } from '../types/storyboard'

type RefSlot = 'reference_primary' | 'reference_front' | 'reference_left' | 'reference_right' | 'reference_back'

const SLOTS: { key: RefSlot; label: string; hint: string }[] = [
  { key: 'reference_primary', label: 'Primary',      hint: 'Main portrait / any angle' },
  { key: 'reference_front',   label: 'Front',         hint: 'Full front view' },
  { key: 'reference_left',    label: 'Left',          hint: 'Left profile, 90°' },
  { key: 'reference_right',   label: 'Right',         hint: 'Right profile, 90°' },
  { key: 'reference_back',    label: 'Back',          hint: 'Full back view' },
]

interface Props {
  identity: CharacterIdentity
  onChange: (updated: CharacterIdentity) => void
  /** Called after LLM extraction completes with the extracted field map. */
  onExtracted?: (fields: Record<string, string>, slot: RefSlot) => void
  characterId: string
  loading?: boolean
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function IdentityUploader({ identity, onChange, onExtracted, characterId, loading = false }: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function triggerInput(slot: RefSlot) {
    inputRefs.current[slot]?.click()
  }

  async function handleFileSelect(slot: RefSlot, file: File) {
    const dataUrl = await readFileAsDataUrl(file)

    // Update the identity locally first for immediate preview
    const updated: CharacterIdentity = { ...identity, [slot]: dataUrl }
    onChange(updated)

    // Trigger backend extraction (non-blocking)
    if (onExtracted) {
      try {
        const { importCharacterAsset } = await import('../api/storyboard')
        const result = await importCharacterAsset(characterId, slot, dataUrl, true)
        if (result.updated_identity_fields && Object.keys(result.updated_identity_fields).length > 0) {
          onExtracted(result.updated_identity_fields, slot)
        }
      } catch {
        // extraction is best-effort — failure is silent
      }
    }
  }

  function handleDrop(slot: RefSlot, e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(slot, file)
    }
  }

  function clearSlot(slot: RefSlot) {
    onChange({ ...identity, [slot]: null })
  }

  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6, marginBottom: 12 }}>
        Reference Images
      </p>

      {/* Primary — large slot */}
      <div style={{ marginBottom: 12 }}>
        <SlotCard
          slot={SLOTS[0]}
          value={identity[SLOTS[0].key]}
          large
          loading={loading}
          inputRef={el => { inputRefs.current[SLOTS[0].key] = el }}
          onTrigger={() => triggerInput(SLOTS[0].key)}
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
          onClear={clearSlot}
        />
      </div>

      {/* Secondary views — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SLOTS.slice(1).map(slot => (
          <SlotCard
            key={slot.key}
            slot={slot}
            value={identity[slot.key]}
            loading={loading}
            inputRef={el => { inputRefs.current[slot.key] = el }}
            onTrigger={() => triggerInput(slot.key)}
            onFileSelect={handleFileSelect}
            onDrop={handleDrop}
            onClear={clearSlot}
          />
        ))}
      </div>

      <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.45, marginTop: 10, lineHeight: 1.6 }}>
        Upload one or all views. BaseBoard extracts identity fields automatically from every uploaded image.
        A single primary portrait is enough to get started.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal slot card component
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: { key: RefSlot; label: string; hint: string }
  value: string | null
  large?: boolean
  loading: boolean
  inputRef: (el: HTMLInputElement | null) => void
  onTrigger: () => void
  onFileSelect: (slot: RefSlot, file: File) => void
  onDrop: (slot: RefSlot, e: React.DragEvent) => void
  onClear: (slot: RefSlot) => void
}

function SlotCard({ slot, value, large = false, loading, inputRef, onTrigger, onFileSelect, onDrop, onClear }: SlotCardProps) {
  const height = large ? 160 : 100

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(slot.key, file)
          e.target.value = ''
        }}
      />
      <div
        onClick={() => !loading && onTrigger()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => !loading && onDrop(slot.key, e)}
        style={{
          height,
          borderRadius: 6,
          border: `1px dashed ${value ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`,
          background: value ? 'transparent' : 'var(--bg-raised)',
          cursor: loading ? 'default' : 'pointer',
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? (
          <img
            src={value}
            alt={slot.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '0 8px' }}>
            <p style={{ fontSize: large ? 18 : 14, color: 'var(--border)', marginBottom: 4 }}>+</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.08em' }}>{slot.label}</p>
            <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, marginTop: 2 }}>{slot.hint}</p>
          </div>
        )}

        {/* Clear button */}
        {value && (
          <button
            onClick={e => { e.stopPropagation(); onClear(slot.key) }}
            style={{
              position: 'absolute', top: 4, right: 4,
              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 3,
              color: '#fff', fontSize: 9, cursor: 'pointer', padding: '2px 5px',
              lineHeight: 1, opacity: 0.7,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Slot label below card */}
      <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.45, marginTop: 3, textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {slot.label}
        {value && <span style={{ color: 'var(--gold)', marginLeft: 4, opacity: 0.7 }}>✓</span>}
      </p>
    </div>
  )
}
