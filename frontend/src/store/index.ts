import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

import uiReducer from './slices/uiSlice';

// ── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

// ── Type exports ─────────────────────────────────────────────────────────────

/** The full Redux state tree shape. */
export type RootState = ReturnType<typeof store.getState>;

/** The store's dispatch type (includes thunk support automatically). */
export type AppDispatch = typeof store.dispatch;
