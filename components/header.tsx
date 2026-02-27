import Link from "next/link"
import AuthMenu from "./auth-menu"
import ThemeToggle from "./theme-toggle"

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full h-14 z-50 flex items-center px-4 bg-background border-b">
      <Link
        href="/"
        className="text-lg font-semibold cursor-pointer"
      >
        tables
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <AuthMenu />
      </div>
    </header>
  )
}
