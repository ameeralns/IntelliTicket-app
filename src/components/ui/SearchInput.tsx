'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  delay?: number
}

export function SearchInput({
  className,
  onSearch,
  delay = 300,
  ...props
}: SearchInputProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay, onSearch])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          'pl-9 pr-4 h-10 w-full bg-white dark:bg-gray-900',
          className
        )}
      />
    </div>
  )
} 