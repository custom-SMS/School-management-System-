import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// ── Typed hooks ──────────────────────────────────────────────────────────────
// Use these throughout the app instead of plain `useDispatch` / `useSelector`.
// They carry the correct RootState and AppDispatch types automatically,
// so you get full autocomplete and type-checking in every component.

/** Dispatch actions with the correct AppDispatch type. */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Select state with the correct RootState type. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
