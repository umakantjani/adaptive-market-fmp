'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, MessageCircle, Trash2, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'

const ExportButtons = dynamic(() => import('@/components/ExportButtons'), { ssr: false })

interface Comment { id: number; content: string; createdAt: string }
interface Report {
  id: number
  generatedAt: string
  period: string
  reportText: string
  likes: number
  modelUsed: string
  ticker: { symbol: string; name: string }
  comments: Comment[]
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.json())
      .then(d => {
        setReport(d)
        setLikes(d.likes ?? 0)
        setComments(d.comments ?? [])
        const likedSet = JSON.parse(localStorage.getItem('am_liked_reports') || '[]') as number[]
        setLiked(likedSet.includes(Number(id)))
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleLike() {
    if (liked) return
    setLiked(true)
    setLikes(l => l + 1)
    const likedSet = JSON.parse(localStorage.getItem('am_liked_reports') || '[]') as number[]
    localStorage.setItem('am_liked_reports', JSON.stringify([...likedSet, Number(id)]))
    await fetch(`/api/reports/${id}/like`, { method: 'POST' })
  }

  async function handleComment() {
    if (!newComment.trim() || posting) return
    setPosting(true)
    const res = await fetch(`/api/reports/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment.trim() }),
    })
    const created = await res.json()
    setComments(prev => [...prev, created])
    setNewComment('')
    setPosting(false)
  }

  async function handleDeleteComment(commentId: number) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await fetch(`/api/reports/${id}/comment/${commentId}`, { method: 'DELETE' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      {/* Top App Bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 64, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <button onClick={() => router.push('/reports')} className="md-ripple"
          style={{ padding: 12, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--md-on-surface-variant)" />
        </button>
        {report && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)' }}>{report.ticker.symbol}</span>
            <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>Research Report</span>
          </div>
        )}
        <button onClick={handleLike} disabled={liked} className="md-ripple"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            borderRadius: 20,
            background: liked ? 'rgba(207,102,121,0.12)' : 'var(--md-surface-container)',
            color: liked ? '#CF6679' : 'var(--md-on-surface-variant)',
            border: 'none', cursor: liked ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 500,
          }}>
          <Heart size={14} fill={liked ? '#CF6679' : 'none'} />
          {likes}
        </button>
      </header>

      <main style={{ maxWidth: 672, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading && <div className="animate-pulse" style={{ height: 384, borderRadius: 28, background: 'var(--md-surface-container)' }} />}

        {report && (
          <>
            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 16,
                background: 'rgba(124,185,244,0.12)', color: 'var(--md-primary)',
              }}>
                {report.period.toUpperCase()}
              </span>
              <time style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
                {new Date(report.generatedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </time>
              <span style={{ fontSize: 12, color: 'var(--md-outline)' }}>{report.modelUsed}</span>
            </div>

            {/* Export */}
            <ExportButtons
              type="ta"
              symbol={report.ticker.symbol}
              companyName={report.ticker.name}
              period={report.period}
              generatedAt={report.generatedAt}
              reportText={report.reportText}
              modelUsed={report.modelUsed}
            />

            {/* Report body */}
            <div style={{ background: 'var(--md-surface-container)', borderRadius: 28, padding: 24 }}>
              <div className="report-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.reportText}</ReactMarkdown>
              </div>
            </div>

            {/* Comments */}
            <div style={{ background: 'var(--md-surface-container)', borderRadius: 28, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <MessageCircle size={16} color="var(--md-on-surface-variant)" />
                <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0 }}>Notes &amp; Comments</h3>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                  background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface-variant)',
                }}>
                  {comments.length}
                </span>
              </div>

              {comments.length === 0 && (
                <p style={{ fontSize: 14, color: 'var(--md-outline)', marginBottom: 16 }}>
                  No notes yet. Add your analysis or observations below.
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {comments.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', gap: 12,
                    background: 'var(--md-surface-container-high)', borderRadius: 16, padding: 16,
                  }}
                    className="group">
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--md-on-surface)', margin: 0 }}>{c.content}</p>
                      <time style={{ fontSize: 11, color: 'var(--md-outline)', display: 'block', marginTop: 6 }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <button onClick={() => handleDeleteComment(c.id)} className="md-ripple"
                      style={{ padding: 8, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer', color: '#CF6679', flexShrink: 0, alignSelf: 'flex-start' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add comment */}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment() }}
                  placeholder="Add your notes… (Cmd/Ctrl + Enter to submit)"
                  rows={2}
                  maxLength={1000}
                  style={{
                    flex: 1, resize: 'none',
                    background: 'var(--md-surface-container-high)',
                    border: 'none',
                    borderRadius: 16, padding: '12px 16px',
                    fontSize: 14, color: 'var(--md-on-surface)',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button onClick={handleComment} disabled={!newComment.trim() || posting} className="md-ripple"
                  style={{
                    padding: '0 16px',
                    borderRadius: 16,
                    background: newComment.trim() ? 'var(--md-primary)' : 'var(--md-surface-container-high)',
                    color: newComment.trim() ? 'var(--md-on-primary)' : 'var(--md-outline)',
                    border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                    alignSelf: 'flex-end', height: 44,
                  }}>
                  <Send size={15} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--md-outline)', marginTop: 6 }}>{newComment.length}/1000</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
