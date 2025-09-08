'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'ライト' },
    { value: 'dark' as const, icon: Moon, label: 'ダーク' },
    { value: 'system' as const, icon: Monitor, label: 'システム' }
  ]

  return (
    <div className="flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex flex-col items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 min-w-[80px] ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
          title={label}
        >
          <Icon className="w-5 h-5 mb-1" />
          <span className="text-xs">{label}</span>
        </button>
      ))}
    </div>
  )
}