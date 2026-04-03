import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'rituals', `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const raw = fs.readFileSync(filePath, 'utf-8').trim()

  // Extract emoji and title from first heading line
  const firstLine = raw.split('\n')[0].replace(/^#+\s*/, '').trim()
  const emojiMatch = firstLine.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)/u)
  const emoji = emojiMatch?.[1] ?? '📄'
  const title = firstLine.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()

  return NextResponse.json({ slug, title, emoji, content: raw })
}
