import { create } from "zustand";

interface HotkeyAction {
  id: string;
  action: () => void | Promise<void>;
}

interface HotkeyState {
  registeredActions: Map<string, HotkeyAction>;
  registerAction: (hotkeyId: string, action: () => void | Promise<void>) => () => void;
  triggerAction: (hotkeyId: string) => void;
}

/**
 * Global hotkey store for managing hotkey actions
 * Actions are registered by hotkey IDs (e.g., "toggle_overlay_edit_mode", "toggle_overlays_enabled")
 */
export const useHotkeyStore = create<HotkeyState>((set, get) => ({
  registeredActions: new Map(),

  registerAction: (hotkeyId: string, action: () => void | Promise<void>) => {
    set((state) => {
      const newActions = new Map(state.registeredActions);
      newActions.set(hotkeyId, { id: hotkeyId, action });
      return { registeredActions: newActions };
    });

    // Return unregister function
    return () => {
      set((state) => {
        const newActions = new Map(state.registeredActions);
        newActions.delete(hotkeyId);
        return { registeredActions: newActions };
      });
    };
  },

  triggerAction: (hotkeyId: string) => {
    const action = get().registeredActions.get(hotkeyId);
    if (action) {
      void action.action();
    } else {
      console.warn(`[HotkeyStore] No action registered for hotkey: ${hotkeyId}`);
    }
  },
}));
