import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ── Types ────────────────────────────────────────────────────────────────────

/** Non-sensitive user identity stored in Redux. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;            // e.g. "SuperAdmin", "Admin", "Teacher", "Student", "Parent", "Cashier"
  scopeType?: string;      // e.g. "SchoolAdmin", "BranchAdmin", "LevelAdmin", "Cashier"
  branchId?: string | null;
  levelId?: string | null;
  schoolId?: string | null;
}

export interface AuthState {
  /** The authenticated user identity, or null when logged out. */
  user: AuthUser | null;
  /** True while the initial auth check (e.g. reading localStorage) is in progress. */
  isLoading: boolean;
  /** Convenience flag derived from `user !== null`. */
  isAuthenticated: boolean;
}

// ── Initial state ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  isLoading: true,   // starts true until hydration completes
  isAuthenticated: false,
};

// ── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after a successful login or when restoring a session from
     * localStorage on app startup.
     */
    setCredentials(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },

    /**
     * Called on logout — clears the user from the store.
     * The actual httpOnly cookie clearing and API call remain in AuthContext
     * until the full migration.
     */
    clearCredentials(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },

    /**
     * Marks the initial hydration as complete without changing the user.
     * Useful when localStorage has no stored user.
     */
    setAuthLoaded(state) {
      state.isLoading = false;
    },

    /**
     * Updates specific fields on the user object.
     */
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

export const { setCredentials, clearCredentials, setAuthLoaded, updateUser } = authSlice.actions;
export default authSlice.reducer;
