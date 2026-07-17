/**
 * Render Upgrade — type catalogue for the style upgrade pipeline.
 *
 * Style presets are grouped into four tiers matching the production pipeline:
 *   Storyboard → Color → Concept Art → Cinematic
 *
 * Each preset maps to a backend STYLE_PREFIXES key.
 */

// ---------------------------------------------------------------------------
// API response shapes (mirror backend UpgradeStyleResponse / SceneUpgradeResponse)
// ---------------------------------------------------------------------------

export interface FrameUpgradeResult {
  frame_number: number
  generated_image_url: string | null
  target_style: string
}

export interface SceneUpgradeResult {
  scene_number: number
  frames: FrameUpgradeResult[]
  total: number
  succeeded: number
}

// ---------------------------------------------------------------------------
// Style preset catalogue
// ---------------------------------------------------------------------------

export interface StylePreset {
  key: string
  label: string
  description: string
  tier: 'storyboard' | 'color' | 'concept' | 'cinematic'
  /** Emoji/icon shown in the menu */
  icon: string
}

export const STYLE_PRESETS: StylePreset[] = [
  // ── Storyboard tier ──────────────────────────────────────────────────────
  { key: 'bw_sketch',        label: 'B&W Sketch',         description: 'Loose gestural pencil lines, white background',                tier: 'storyboard', icon: '✏️' },
  { key: 'pencil_rough',     label: 'Pencil Rough',        description: 'Rough pencil with construction lines visible',                 tier: 'storyboard', icon: '📝' },
  { key: 'ink_clean',        label: 'Clean Ink',           description: 'Precise professional inking, no fill',                         tier: 'storyboard', icon: '🖊' },
  { key: 'bw_detailed',      label: 'Detailed Ink',        description: 'Crosshatch shading, comic book inking',                        tier: 'storyboard', icon: '🗒' },
  { key: 'marker_grey',      label: 'Marker Grey',         description: 'Grey marker board, slight texture, warm tones',                tier: 'storyboard', icon: '🖋' },

  // ── Color tier ────────────────────────────────────────────────────────────
  { key: 'flat_color',       label: 'Flat Color',          description: 'Clean vector fills, Ghibli-style cel animation',               tier: 'color',      icon: '🎨' },
  { key: 'flat_animation',   label: 'Flat Animation',      description: 'Bold flat colors, black outlines, cartoon Saturday morning',  tier: 'color',      icon: '📺' },
  { key: 'cell_shaded',      label: 'Cell Shaded',         description: 'Two-tone shading, anime style, vivid colors',                  tier: 'color',      icon: '🌈' },
  { key: 'anime_style',      label: 'Anime',               description: 'Japanese anime cel animation, dramatic lighting',              tier: 'color',      icon: '⛩' },
  { key: 'comic_book',       label: 'Comic Book',          description: 'American comics, halftone dots, Ben-Day dots',                 tier: 'color',      icon: '💥' },
  { key: 'ghibli_style',     label: 'Ghibli',              description: 'Soft watercolor, lush environments, hand-painted',             tier: 'color',      icon: '🌿' },
  { key: 'pixar_style',      label: 'Pixar Style',         description: 'Soft CGI cartoon render, subsurface lighting',                 tier: 'color',      icon: '🎬' },

  // ── Concept art tier ─────────────────────────────────────────────────────
  { key: 'concept_art',      label: 'Concept Art',         description: 'Production design quality, cinematic lighting, painterly',    tier: 'concept',    icon: '🖼' },
  { key: 'digital_painting', label: 'Digital Painting',    description: 'Digital oil, soft blending, gallery quality',                  tier: 'concept',    icon: '🎭' },
  { key: 'watercolor',       label: 'Watercolor',          description: 'Wet-on-wet technique, transparent washes, paper texture',      tier: 'concept',    icon: '💧' },
  { key: 'oil_painting',     label: 'Oil Painting',        description: 'Impasto texture, chiaroscuro, old master technique',           tier: 'concept',    icon: '🏛' },

  // ── Cinematic tier ────────────────────────────────────────────────────────
  { key: 'full_shaded',      label: 'Full Shaded',         description: 'Animated film frame, volumetric lighting',                     tier: 'cinematic',  icon: '🎞' },
  { key: 'cinematic',        label: 'Cinematic',           description: 'Anamorphic lens flare, color graded, 35mm film',               tier: 'cinematic',  icon: '📽' },
  { key: 'hyperrealistic',   label: 'Hyperrealistic',      description: 'Photorealistic 8K render, physically based lighting',          tier: 'cinematic',  icon: '📸' },
  { key: 'noir',             label: 'Film Noir',           description: 'High contrast B&W, deep shadows, vintage moody',               tier: 'cinematic',  icon: '🎩' },
  { key: 'neon_cyberpunk',   label: 'Cyberpunk',           description: 'Neon-lit, rain-soaked streets, blade runner aesthetic',        tier: 'cinematic',  icon: '🌆' },
]

export const TIER_ORDER: StylePreset['tier'][] = ['storyboard', 'color', 'concept', 'cinematic']

export const TIER_LABELS: Record<StylePreset['tier'], string> = {
  storyboard: 'Storyboard',
  color:      'Color',
  concept:    'Concept Art',
  cinematic:  'Cinematic',
}

/** The standard progressive pipeline (bw_sketch → cinematic) */
export const UPGRADE_PIPELINE: string[] = [
  'bw_sketch', 'ink_clean', 'flat_color', 'cell_shaded', 'concept_art', 'cinematic',
]

export function getPreset(key: string): StylePreset | undefined {
  return STYLE_PRESETS.find(p => p.key === key)
}

export function presetsForTier(tier: StylePreset['tier']): StylePreset[] {
  return STYLE_PRESETS.filter(p => p.tier === tier)
}
