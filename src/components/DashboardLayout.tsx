import { useState, type ReactNode } from "react";
import { AppSidebar, type NavItem } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";

interface DashboardLayoutProps {
  items: NavItem[];
  title: string;
  children: ReactNode;
}

export function DashboardLayout({ items, title, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar items={items} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
