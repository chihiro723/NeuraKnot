'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchInputProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

/**
 * 検索入力コンポーネント - 完璧に統一されたデザインシステム
 */
export function SearchInput({ 
  placeholder = "検索", 
  onSearch,
  className = ""
}: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleClear = () => {
    setSearchQuery('')
    onSearch?.('')
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 lg:w-4 lg:h-4 transition-colors" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full pl-10 pr-10 py-2 lg:py-1.5 lg:text-sm bg-gray-50 text-gray-900 placeholder-gray-500",
          "rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
          "transition-colors border border-gray-300"
        )}
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-500 lg:text-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}