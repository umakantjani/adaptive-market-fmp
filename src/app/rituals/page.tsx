import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'

interface RitualMeta {
  slug: string
  title: string
  emoji: string
  preview: string
}

function getRituals(): RitualMeta[] {
  const dir = path.join(process.cwd(), 'rituals')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()

  return files.map(file => {
    const slug = file.replace('.md', '')
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8').trim()

    // Extract emoji + title from first heading (strip markdown # prefix)
    const firstLine = raw.split('\n')[0].replace(/^#+\s*/, '').trim()
    const emojiMatch = firstLine.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)/u)
    const emoji = emojiMatch?.[1] ?? '📄'
    const title = firstLine.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()

    // Use first non-heading, non-empty paragraph as preview
    const lines = raw.split('\n')
    const previewLine = lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')) ?? ''
    const preview = previewLine.replace(/[*_`]/g, '').slice(0, 160).trim() + (previewLine.length > 160 ? '…' : '')

    return { slug, title, emoji, preview }
  })
}

export default function RitualsPage() {
  const rituals = getRituals()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      {/* Mobile header */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 52, padding: '0 16px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <BookOpen size={15} color="var(--md-primary)" />
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>Rituals</h1>
      </header>

      {/* Desktop page header */}
      <div style={{ padding: '28px 24px 0', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <BookOpen size={18} color="var(--md-primary)" />
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Trader Rituals
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', margin: '0 0 24px' }}>
          Knowledge base — theories, frameworks, and disciplines for systematic trading.
        </p>

        {/* Ritual cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rituals.map(r => (
            <Link
              key={r.slug}
              href={`/rituals/${r.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 18px',
                borderRadius: 10,
                background: 'var(--md-surface-container)',
                border: '1px solid var(--md-outline-variant)',
                textDecoration: 'none',
                transition: 'border-color 120ms',
              }}
            >
              <span style={{ fontSize: 26, flexShrink: 0 }}>{r.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 4 }}>
                  {r.title}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.5,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.preview}
                </div>
              </div>
              <ArrowRight size={16} color="var(--md-outline)" style={{ flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {rituals.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <BookOpen size={40} style={{ color: 'var(--md-outline)', opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
              No rituals found. Add .md files to the /rituals folder.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
