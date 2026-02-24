"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

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
    <Button
      aria-label="Toggle dark mode"
      className="cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      variant="outline"
      size="sm"
    >
      {isDark ?
        <Moon className="size-4" />
      : <Sun className="size-4" />}
    </Button>
  )
}
