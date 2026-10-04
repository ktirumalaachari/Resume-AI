import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { clsx } from 'clsx'

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={clsx(
        'group relative flex size-9 items-center justify-center rounded-xl border transition-all duration-200',
        'border-slate-200 bg-white/80 text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600 hover:shadow-md active:scale-95',
        'dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400',
        className
      )}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-400" />
    </button>
  )
}
