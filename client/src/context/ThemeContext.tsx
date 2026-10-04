import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const initial = getInitialTheme()
    if (initial === 'dark') return true
    if (initial === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      const activeIsDark =
        theme === 'dark' || (theme === 'system' && media.matches)

      setIsDark(activeIsDark)
      if (activeIsDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    function onMediaChange() {
      if (theme === 'system') {
        applyTheme()
      }
    }

    media.addEventListener('change', onMediaChange)
    return () => media.removeEventListener('change', onMediaChange)
  }, [theme])

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    try {
      localStorage.setItem('theme', newTheme)
    } catch {
      // Storage unavailable
    }
  }

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
