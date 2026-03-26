import { create } from "zustand"

interface OverlaySessionState {
  overlaysEnabled: boolean
  overlayEnabledStates: Record<string, boolean>
  editMode: boolean
  
  // Actions
  setOverlaysEnabled: (enabled: boolean) => void
  setOverlayEnabled: (id: string, enabled: boolean) => void
  setEditMode: (enabled: boolean) => void
  toggleEditMode: () => void
  toggleOverlaysEnabled: () => void
  initializeOverlayStates: (overlayIds: string[], enabledStates: Record<string, boolean>) => void
  reset: () => void
}

export const useOverlaySessionStore = create<OverlaySessionState>((set) => ({
  overlaysEnabled: false,
  overlayEnabledStates: {},
  editMode: false,
  
  setOverlaysEnabled: (enabled) => {
    set({ overlaysEnabled: enabled })
  },
  
  setOverlayEnabled: (id, enabled) => {
    set((state) => ({
      overlayEnabledStates: {
        ...state.overlayEnabledStates,
        [id]: enabled,
      },
    }))
  },
  
  setEditMode: (enabled) => {
    set({ editMode: enabled })
  },
  
  toggleEditMode: () => {
    set((state) => ({ editMode: !state.editMode }))
  },
  
  toggleOverlaysEnabled: () => {
    set((state) => ({ overlaysEnabled: !state.overlaysEnabled }))
  },
  
  initializeOverlayStates: (overlayIds, enabledStates) => {
    // Only initialize if not already initialized (preserve session state)
    set((state) => {
      const hasExistingState = Object.keys(state.overlayEnabledStates).length > 0
      if (hasExistingState) {
        // Already initialized, don't overwrite
        return state
      }
      
      // Initialize with provided states or defaults
      const initialStates: Record<string, boolean> = {}
      overlayIds.forEach((id) => {
        initialStates[id] = enabledStates[id] ?? false
      })
      
      return {
        overlayEnabledStates: initialStates,
      }
    })
  },
  
  reset: () => {
    set({
      overlaysEnabled: false,
      overlayEnabledStates: {},
      editMode: false,
    })
  },
}))

