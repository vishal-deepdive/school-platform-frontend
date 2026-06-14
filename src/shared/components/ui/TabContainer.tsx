import { Outlet } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

export interface TabRoute {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to: string;
  end?: boolean;
}

interface TabContainerProps {
  tabs: TabRoute[];
  className?: string;
}

/**
 * Route-driven tab bar rendered above an <Outlet/>. Used by module layout
 * pages so every module (Attendance, Recording, RAG, Survey) shares the
 * same tabbed-page structure.
 */
export function TabContainer({ tabs, className }: TabContainerProps) {
  return (
    <div className={cn("w-full min-h-0 flex-1", className)}>
      <Outlet />
    </div>
  );
}
