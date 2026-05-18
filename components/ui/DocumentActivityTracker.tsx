'use client'

import { useEffect, useRef } from 'react'

type Props = {
  documentId?: string
  token?: string
  actor?: string
  source: 'dashboard' | 'signing'
  scrollContainerId?: string
  trackOpen?: boolean
}

export default function DocumentActivityTracker({ documentId, token, actor, source, scrollContainerId, trackOpen = true }: Props) {
  const opened = useRef(false)
  const completed = useRef(false)

  useEffect(() => {
    if (!trackOpen || opened.current) return
    opened.current = true
    postActivity({
      documentId,
      token,
      event: source === 'dashboard' ? 'Document opened in dashboard' : 'Document opened by client',
      metadata: {
        actor,
        source,
        screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : null,
        language: typeof navigator !== 'undefined' ? navigator.language : null,
      },
    })
  }, [actor, documentId, source, token, trackOpen])

  useEffect(() => {
    const target = scrollContainerId ? document.getElementById(scrollContainerId) : null
    const scrollTarget = target || window

    function getProgress() {
      if (target) {
        const max = target.scrollHeight - target.clientHeight
        return max <= 0 ? 1 : target.scrollTop / max
      }
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      return max <= 0 ? 1 : window.scrollY / max
    }

    function onScroll() {
      if (completed.current || getProgress() < 0.85) return
      completed.current = true
      postActivity({
        documentId,
        token,
        event: source === 'dashboard' ? 'Document completed view in dashboard' : 'Document completed view by client',
        metadata: { actor, source, completedView: true },
      })
    }

    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    window.setTimeout(onScroll, 1200)
    return () => scrollTarget.removeEventListener('scroll', onScroll)
  }, [actor, documentId, scrollContainerId, source, token])

  return null
}

function postActivity(input: {
  documentId?: string
  token?: string
  event: string
  metadata: Record<string, unknown>
}) {
  fetch('/api/document-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => undefined)
}
