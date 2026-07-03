import { Outlet } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

interface TabContainerProps {
  className?: string;
}

/**
 * Route-driven content shell rendered above an <Outlet/>. Used by module
 * layout pages so every module (Attendance, Recording, RAG, Survey) shares
 * the same page structure. Navigation itself lives in navConfig.tsx (the
 * sidebar), not here.
 */
export function TabContainer({ className }: TabContainerProps) {
  return (
    <div className={cn("w-full min-h-0 flex-1", className)}>
      <Outlet />
    </div>
  );
}
