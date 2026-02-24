"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === "dark"

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={pressed => setTheme(pressed ? "dark" : "light")}
      aria-label="Toggle dark mode"
      className="cursor-pointer"
    >
      {isDark ?
        <Moon className="size-4" />
      : <Sun className="size-4" />}
    </Toggle>
  )
}
