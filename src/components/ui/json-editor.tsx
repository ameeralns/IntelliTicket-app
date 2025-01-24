"use client"

import { useState, useEffect, ChangeEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface JsonEditorProps {
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  placeholder?: Record<string, any>
}

export function JsonEditor({ value, onChange, placeholder }: JsonEditorProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setText(JSON.stringify(value, null, 2))
    } catch (e) {
      setText('')
    }
  }, [value])

  const handleChange = (newText: string) => {
    setText(newText)
    try {
      const parsed = JSON.parse(newText)
      onChange(parsed)
      setError(null)
    } catch (e) {
      setError('Invalid JSON')
    }
  }

  return (
    <div className="relative">
      <Textarea
        value={text}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange(e.target.value)}
        placeholder={placeholder ? JSON.stringify(placeholder, null, 2) : undefined}
        className="font-mono h-32"
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 