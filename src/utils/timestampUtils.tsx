import React from 'react'
import Markdown from 'react-markdown'

/**
 * Render markdown with clickable timestamp links
 * Timestamps in format [MM:SS] or [HH:MM:SS]
 */
export function parseTimestampLinks(text: string, videoId: string): React.ReactNode {
  return (
    <Markdown
      components={{
        // Handle paragraphs - render timestamps inside them
        p: ({ children }) => <p>{processChildren(children, videoId)}</p>,
        // Handle list items
        li: ({ children }) => <li>{processChildren(children, videoId)}</li>,
        // Handle strong/bold
        strong: ({ children }) => <strong>{processChildren(children, videoId)}</strong>,
        // Handle emphasis/italic
        em: ({ children }) => <em>{processChildren(children, videoId)}</em>,
      }}
    >
      {text}
    </Markdown>
  )
}

function processChildren(children: React.ReactNode, videoId: string): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return parseTimestampsInText(child, videoId)
    }
    return child
  })
}

function parseTimestampsInText(text: string, videoId: string): React.ReactNode {
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = timestampRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    const fullMatch = match[0]
    const hours = match[3] ? parseInt(match[1]) : 0
    const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1])
    const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2])
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    parts.push(
      <a
        key={match.index}
        href={`https://www.youtube.com/watch?v=${videoId}&t=${totalSeconds}s`}
        onClick={(e) => {
          e.preventDefault()
          seekToTimestamp(totalSeconds)
        }}
        className="vc-timestamp-link"
      >
        {fullMatch}
      </a>
    )
    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
}

/**
 * Seek to a specific timestamp in the YouTube video
 */
function seekToTimestamp(seconds: number) {
  // Send message to content script to seek the video
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'seekVideo',
        payload: { seconds },
      })
    }
  })
}

/**
 * Format seconds to timestamp string
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

