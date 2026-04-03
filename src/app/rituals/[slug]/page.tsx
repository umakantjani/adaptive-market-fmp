'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MenuButton } from '@/components/Sidebar'

export default function RitualPage() {
  const params = useParams()
  const slug = params.slug as string

  const [content, setContent] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('📄')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/rituals/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setContent(d.content)
        setTitle(d.title)
        setEmoji(d.emoji)
      })
  }, [slug])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--md-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--md-outline)' }}>Ritual not found.</p>
          <Link href="/rituals" style={{ fontSize: 13, color: 'var(--md-primary)' }}>← Back to Rituals</Link>
        </div>
      </div>
    )
  }

  if (content === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse" style={{ height: 20, borderRadius: 4, background: 'var(--md-surface-container)', marginBottom: 12, width: i % 2 === 0 ? '80%' : '100%' }} />
          ))}
        </div>
      </div>
    )
  }

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
        <Link href="/rituals" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <ArrowLeft size={15} color="var(--md-on-surface-variant)" />
          <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>Rituals</span>
        </Link>
        <span style={{ fontSize: 13, color: 'var(--md-outline)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emoji} {title}</span>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Back link — desktop */}
        <Link href="/rituals" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--md-on-surface-variant)',
          textDecoration: 'none', marginBottom: 20,
        }}>
          <ArrowLeft size={13} /> Back to Rituals
        </Link>

        {/* Header card */}
        <div style={{
          padding: '20px', borderRadius: 10,
          background: 'var(--md-surface-container)',
          border: '1px solid var(--md-outline-variant)',
          marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 32, flexShrink: 0 }}>{emoji}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BookOpen size={13} color="var(--md-primary)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--md-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Trader Ritual
              </span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--md-on-surface)', margin: 0 }}>
              {title}
            </h1>
          </div>
        </div>

        {/* Markdown content */}
        <div className="ritual-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      <style>{`
        .ritual-content { color: var(--md-on-surface-variant); font-family: 'Apercu Mono Pro Numeric', 'Galaxie Copernicus', Georgia, serif; }
        .ritual-content h1 { display: none; }
        .ritual-content h2 {
          font-family: 'Gotham SSM', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--md-on-surface);
          margin: 28px 0 10px; padding-bottom: 8px;
          border-bottom: 1px solid var(--md-outline-variant);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ritual-content h3 {
          font-family: 'Gotham SSM', sans-serif;
          font-size: 12px; font-weight: 500; color: var(--md-primary);
          margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ritual-content p {
          font-size: 14px; line-height: 1.75; color: var(--md-on-surface-variant);
          margin: 0 0 14px;
        }
        .ritual-content ul, .ritual-content ol {
          padding-left: 0; margin: 0 0 14px; list-style: none;
        }
        .ritual-content li {
          font-size: 14px; line-height: 1.7; color: var(--md-on-surface-variant);
          margin-bottom: 8px; padding-left: 18px; position: relative;
        }
        .ritual-content ul li::before {
          content: '›'; position: absolute; left: 4px;
          color: var(--md-primary); font-weight: 700;
        }
        .ritual-content ol { counter-reset: list-counter; }
        .ritual-content ol li { counter-increment: list-counter; }
        .ritual-content ol li::before {
          content: counter(list-counter) '.'; position: absolute; left: 0;
          color: var(--md-primary); font-weight: 700; font-size: 12px;
        }
        .ritual-content blockquote {
          border-left: 2px solid var(--md-primary); padding: 10px 16px;
          margin: 16px 0; background: var(--md-surface-container);
          border-radius: 0 6px 6px 0;
        }
        .ritual-content blockquote p {
          margin: 0; font-style: italic; color: var(--md-on-surface); font-size: 14px;
        }
        .ritual-content table {
          width: 100%; border-collapse: collapse; margin: 16px 0;
          font-size: 13px;
        }
        .ritual-content th {
          text-align: left; padding: 8px 14px;
          background: var(--md-surface-container-high);
          color: var(--md-on-surface-variant); font-weight: 600; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 1px solid var(--md-outline-variant);
        }
        .ritual-content td {
          padding: 8px 14px; color: var(--md-on-surface-variant);
          border-bottom: 1px solid var(--md-outline-variant);
        }
        .ritual-content tr:last-child td { border-bottom: none; }
        .ritual-content td:first-child { font-weight: 600; color: var(--md-primary); font-family: monospace; }
        .ritual-content code {
          font-family: 'Apercu Mono Pro', 'JetBrains Mono', monospace; font-size: 13px; color: var(--md-primary);
          background: var(--md-surface-container-high);
          padding: 2px 6px; border-radius: 4px;
        }
        .ritual-content pre {
          background: var(--md-surface-container-high);
          border: 1px solid var(--md-outline-variant);
          border-radius: 8px; padding: 14px 16px; margin: 16px 0;
          overflow-x: auto;
        }
        .ritual-content pre code {
          background: none; padding: 0; color: var(--md-primary);
          font-family: 'Apercu Mono Pro', 'JetBrains Mono', monospace;
          font-size: 13px; line-height: 1.65;
        }
        .ritual-content hr {
          border: none; border-top: 1px solid var(--md-outline-variant);
          margin: 28px 0;
        }
        .ritual-content strong { color: var(--md-on-surface); font-weight: 600; }
        .ritual-content em { color: var(--md-on-surface); font-style: italic; }
        .ritual-content input[type="checkbox"] { accent-color: var(--md-primary); margin-right: 8px; }
      `}</style>
    </div>
  )
}
