import { createContext, useContext } from "react";

/** Portal targets inside TabContainer's module toolbar. */
export interface ModuleHeaderSlots {
  /** Left side, after the (optional) page title: view switchers, breadcrumbs. */
  leading: HTMLElement | null;
  /** Right edge: primary CTAs and page-level actions. */
  trailing: HTMLElement | null;
}

export const ModuleHeaderSlotsContext = createContext<ModuleHeaderSlots>({
  leading: null,
  trailing: null,
});

export function useModuleHeaderSlots(): ModuleHeaderSlots {
  return useContext(ModuleHeaderSlotsContext);
}
