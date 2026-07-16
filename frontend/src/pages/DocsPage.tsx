export default function DocsPage() {
  const templates = [
    {
      title: 'Basic Scene',
      description: 'Standard INT./EXT. scene with dialogue exchange',
      template: `INT. LOCATION - NIGHT

CHARACTER
Dialogue line here.

ACTION: Character does something.`,
    },
    {
      title: 'Action Sequence',
      description: 'High-paced action beat with multiple movements',
      template: `EXT. ALLEYWAY - DAWN

ACTION: Character sprints through rain-soaked streets.
A figure emerges from the shadows.

CHARACTER
(breathless)
You found me.`,
    },
    {
      title: 'Dramatic Close-up',
      description: 'Monologue beat that triggers a Close-up frame',
      template: `INT. OFFICE - GOLDEN HOUR

CHARACTER
(measured, quiet)
Everything we built ends tonight.

BEAT. Character turns to the window.`,
    },
  ]

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#F5F5F7] dark:bg-[#0d0b14]">
      <h2 className="text-lg font-bold text-[#2D1B69] dark:text-[#e2d9f3] mb-2 tracking-tight">Documentation</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Script template shortcuts to get the most out of the pipeline.
      </p>

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.title} className="rounded-2xl bg-white dark:bg-[#16102a] border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-3">
            <div>
              <h3 className="font-semibold text-[#2D1B69] dark:text-[#e2d9f3] text-sm">{t.title}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.description}</p>
            </div>
            <pre className="text-xs font-mono bg-slate-50 dark:bg-[#0d0b14] border border-slate-100 dark:border-slate-700 rounded-lg p-3 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {t.template}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-[#2D1B69]/5 dark:bg-[#2D1B69]/20 border border-[#2D1B69]/10 dark:border-[#2D1B69]/30 p-5 space-y-2">
        <h3 className="text-sm font-bold text-[#2D1B69] dark:text-[#e2d9f3]">Pipeline Tips</h3>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">INT.</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">EXT.</code> sluglines to define scene boundaries</li>
          <li>The more detailed your character notes, the more consistent the character bible</li>
          <li><strong>B&W Sketch</strong> mode works best for storyboard previsualization</li>
          <li>Upload a reference image in the Inspector panel to steer the art style</li>
          <li>Lock favourite frames with ☆ then export the Locked Cut as a ZIP</li>
        </ul>
      </div>
    </div>
  )
}
