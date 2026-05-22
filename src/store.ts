import { create } from 'zustand';
import type { UserPreferences, TravelMood, OptimizedTripPlan, SafetyResult, FoodDiscoveryResult, ActivityResult } from './types';

// ── Auth Store ────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
  },
}));

// ── Theme Store ───────────────────────────────────────────────────────────────

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    return { theme: next };
  }),
  setTheme: (t) => {
    localStorage.setItem('theme', t);
    set({ theme: t });
  },
}));

// ── Preferences Store ─────────────────────────────────────────────────────────

interface PreferencesState {
  preferences: UserPreferences;
  setPreferences: (p: Partial<UserPreferences>) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: {
    defaultMood: 'chill' as TravelMood,
    budgetStyle: 'moderate',
    dietaryPref: [],
    interests: [],
    carbonConscious: false,
    theme: 'dark',
  },
  setPreferences: (p) => set((s) => ({ preferences: { ...s.preferences, ...p } })),
}));

// ── Trip Store (Global — persists across tabs) ────────────────────────────────

interface TripState {
  destination: string;
  days: number;
  mood: string;
  tripPlan: OptimizedTripPlan | null;
  safetyResult: SafetyResult | null;
  foodResult: FoodDiscoveryResult | null;
  activityResult: ActivityResult | null;
  hotelResult: any | null;
  safetyLoading: boolean;
  foodLoading: boolean;
  activityLoading: boolean;
  hotelLoading: boolean;
  setTripPlan: (dest: string, plan: OptimizedTripPlan) => void;
  setSafetyResult: (r: SafetyResult | null) => void;
  setFoodResult: (r: FoodDiscoveryResult | null) => void;
  setActivityResult: (r: ActivityResult | null) => void;
  setHotelResult: (r: any | null) => void;
  fetchAll: (destination: string, days: number, mood: string) => void;
  clear: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  destination: '',
  days: 5,
  mood: 'balanced',
  tripPlan: null,
  safetyResult: null,
  foodResult: null,
  activityResult: null,
  hotelResult: null,
  safetyLoading: false,
  foodLoading: false,
  activityLoading: false,
  hotelLoading: false,
  setTripPlan: (dest, plan) => set({ destination: dest, tripPlan: plan }),
  setSafetyResult: (r) => set({ safetyResult: r }),
  setFoodResult: (r) => set({ foodResult: r }),
  setActivityResult: (r) => set({ activityResult: r }),
  setHotelResult: (r) => set({ hotelResult: r }),
  fetchAll: (destination, days, mood) => {
    set({ destination, days, mood, safetyLoading: true, foodLoading: true, activityLoading: true, hotelLoading: true, safetyResult: null, foodResult: null, activityResult: null, hotelResult: null });

    // Safety
    fetch('/api/safety-score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => set({ safetyResult: data, safetyLoading: false }))
      .catch(() => set({ safetyLoading: false }));

    // Food
    fetch('/api/food-discover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, dietary: '', budget: 'moderate' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => set({ foodResult: data, foodLoading: false }))
      .catch(() => set({ foodLoading: false }));

    // Activities
    fetch('/api/activity-suggest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, days, mood, budget: 50000 }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => set({ activityResult: data, activityLoading: false }))
      .catch(() => set({ activityLoading: false }));

    // Hotels
    fetch('/api/hotel-intelligence', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, days, budget: 50000 }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => set({ hotelResult: data, hotelLoading: false }))
      .catch(() => set({ hotelLoading: false }));
  },
  clear: () => set({
    destination: '', days: 5, mood: 'balanced',
    tripPlan: null, safetyResult: null, foodResult: null, activityResult: null, hotelResult: null,
    safetyLoading: false, foodLoading: false, activityLoading: false, hotelLoading: false,
  }),
}));
