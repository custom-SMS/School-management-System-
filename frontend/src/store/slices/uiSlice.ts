import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UIState {
  selectedBranchId: string | null;
  selectedLevelId: string | null;
  sidebarOpen: boolean;
  currentView: string | null;
}

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: UIState = {
  selectedBranchId: localStorage.getItem('selectedBranchId') || null,
  selectedLevelId: null,
  sidebarOpen: false,
  currentView: null,
};

// ── Slice ────────────────────────────────────────────────────────────────────

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedBranch(state, action: PayloadAction<string | null>) {
      state.selectedBranchId = action.payload;
      if (action.payload) {
        localStorage.setItem('selectedBranchId', action.payload);
      } else {
        localStorage.removeItem('selectedBranchId');
      }
    },
    setSelectedLevel(state, action: PayloadAction<string | null>) {
      state.selectedLevelId = action.payload;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setCurrentView(state, action: PayloadAction<string | null>) {
      state.currentView = action.payload;
    },
    resetUI(state) {
      state.selectedBranchId = null;
      state.selectedLevelId = null;
      state.sidebarOpen = false;
      state.currentView = null;
      localStorage.removeItem('selectedBranchId');
    },
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

export const {
  setSelectedBranch,
  setSelectedLevel,
  setSidebarOpen,
  setCurrentView,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
