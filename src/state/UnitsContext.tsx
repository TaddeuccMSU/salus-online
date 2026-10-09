/**
 * UnitsContext.tsx — the user's Metric / US customary choice, shared app-wide.
 *
 * `useUnits()` → `{ units, setUnits }`. One global setting (not per chart) so
 * a page never mixes units. Remembered in this browser
 * (localStorage `salus-online.units.v1`); the default is DEFAULT_UNITS
 * in theme/units.ts (metric).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_UNITS, type UnitSystem } from '../theme/units';

const KEY = 'salus-online.units.v1';

interface UnitsApi {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
}

const UnitsContext = createContext<UnitsApi | null>(null);

function initial(): UnitSystem {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'metric' || v === 'us') return v;
  } catch {
    /* storage blocked */
  }
  return DEFAULT_UNITS;
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitSystem>(initial);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, units);
    } catch {
      /* ignore */
    }
  }, [units]);
  const api = useMemo(() => ({ units, setUnits }), [units]);
  return <UnitsContext.Provider value={api}>{children}</UnitsContext.Provider>;
}

/** Hook: current unit system + setter. Must be inside <UnitsProvider>. */
export function useUnits(): UnitsApi {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used inside <UnitsProvider>');
  return ctx;
}
