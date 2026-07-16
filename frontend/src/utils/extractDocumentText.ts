/**
 * Client-side document text extraction.
 * Supports: PDF (via pdfjs-dist), DOCX (via mammoth), TXT / FDX / MD (plain text).
 */

export type SupportedFormat = 'pdf' | 'docx' | 'txt' | 'fdx' | 'md' | 'unknown'

export function detectFormat(file: File): SupportedFormat {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf'))  return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.txt'))  return 'txt'
  if (name.endsWith('.fdx'))  return 'fdx'
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  return 'unknown'
}

async function extractPdf(file: File): Promise<string> {
  // Dynamic import so pdfjs-dist is code-split
  const pdfjsLib = await import('pdfjs-dist')
  // Use local worker bundled with pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const buffer = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise
  const parts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line    = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(line)
  }
  return parts.join('\n')
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const buffer  = await file.arrayBuffer()
  const result  = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}

async function extractPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Extract readable text from a supported document file.
 * Returns raw string — may be long; the pipeline prompt handles it.
 */
export async function extractDocumentText(file: File): Promise<string> {
  const fmt = detectFormat(file)
  switch (fmt) {
    case 'pdf':  return extractPdf(file)
    case 'docx': return extractDocx(file)
    case 'txt':
    case 'fdx':
    case 'md':   return extractPlainText(file)
    default:
      throw new Error(
        `Unsupported file type "${file.name}". Please upload PDF, DOCX, TXT, FDX, or Markdown.`
      )
  }
}

/**
 * Derive a project title from the file name (strip extension, title-case).
 */
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')        // remove extension
    .replace(/[-_]/g, ' ')          // dashes/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    .trim()
}
