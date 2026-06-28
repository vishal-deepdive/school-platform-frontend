import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/shared/lib/utils";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 flex h-full">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("flex flex-1 flex-col overflow-hidden")}>
        <Header onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className="flex-1 overflow-y-auto px-4 md:pt-4 md:py-2 md:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
