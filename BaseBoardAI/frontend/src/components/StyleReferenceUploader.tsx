interface Props {
  onReferenceChange: (dataUrl: string | null) => void
}

export default function StyleReferenceUploader({ onReferenceChange }: Props) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onReferenceChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] tracking-[0.25em] text-[var(--gold)]/50 uppercase">Style Reference Image</p>
      <label className="block cursor-pointer rounded border border-dashed border-[var(--border)] hover:border-[var(--gold)]/40 p-3 text-center transition-all">
        <span className="text-[10px] text-[var(--text-base)]/25 tracking-wider">Upload inspiration image (optional)</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
    </div>
  )
}
