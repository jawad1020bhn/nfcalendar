// Basic markdown rendering for notes — supports bold, italic, links, and line breaks
// Escapes HTML first to prevent XSS, then applies markdown transformations.

export function renderNoteMarkdown(text: string): string {
  if (!text) return ''

  // 1. Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Links [text](url) — only allow http/https
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-ink underline underline-offset-2 hover:text-gold">$1</a>',
  )

  // 3. Bold **text** or __text__
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold text-ink">$1</strong>')

  // 4. Italic *text* or _text_ (single, not part of bold)
  html = html.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>')
  html = html.replace(/(?<!_)_(?!_)([^_\n]+?)_(?!_)/g, '<em class="italic">$1</em>')

  // 5. Inline code `code`
  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="rounded bg-hairline/50 px-1 py-0.5 text-[0.85em] font-mono">$1</code>',
  )

  // 6. Tags #tag → styled span
  html = html.replace(
    /(^|\s)(#[A-Za-z0-9_-]+)/g,
    '$1<span class="text-gold/80">$2</span>',
  )

  // 7. Line breaks
  html = html.replace(/\n/g, '<br/>')

  return html
}
