import ThemeToggle from "./theme-toggle"

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full h-14 z-50 flex items-center px-4 bg-background">
      <span className="text-lg font-semibold">tables</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
