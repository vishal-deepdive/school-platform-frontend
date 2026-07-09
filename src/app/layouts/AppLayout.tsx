import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileTabBar } from "./MobileTabBar";
import { CommandPalette } from "./CommandPalette";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <CommandPalette />
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden" aria-hidden={sidebarOpen ? true : undefined}>
        <Header onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main id="app-main-layout" className="relative flex-1 overflow-y-auto px-4 py-4 md:px-6 md:pt-5 md:pb-3">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        {/* Sits in the flex column (not fixed) so main shrinks to fit and the
            module-shell height math stays correct. Phone-only. */}
        <MobileTabBar onMenuOpen={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}
