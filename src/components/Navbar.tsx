import { Menu, Moon, Sun, Bell, Search } from "lucide-react";
import { useTheme } from "@/lib/themeContext";

interface NavbarProps {
  title: string;
  onMenuClick: () => void;
}

export function Navbar({ title, onMenuClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="p-2 rounded-lg hover:bg-muted transition-colors hidden sm:flex">
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>
        <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="ml-1 sm:ml-2 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          Dr
        </div>
      </div>
    </header>
  );
}
