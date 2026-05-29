"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Pattern, SavedChart } from "@/types";
import { isActiveChartCell } from "@/lib/shapes";
import { generateId } from "@/lib/id";

interface StoreState {
  patterns: Pattern[];
  charts: SavedChart[];
  savePattern: (pattern: Pattern) => void;
  updatePattern: (id: string, updates: Partial<Pattern>) => void;
  deletePattern: (id: string) => void;
  saveChart: (chart: SavedChart) => void;
  updateChart: (id: string, updates: Partial<SavedChart>) => void;
  deleteChart: (id: string) => void;
  getPattern: (id: string) => Pattern | undefined;
  getChart: (id: string) => SavedChart | undefined;
  toggleRowCompleted: (patternId: string, sectionName: string, rowNumber: number) => void;
  /** Toggle all cells in a row on/off. If every cell in the row is done, clears them; otherwise marks all. */
  toggleChartRowCompleted: (chartId: string, rowNumber: number, rowWidth?: number) => void;
  /** Toggle a single stitch cell. */
  toggleChartCellCompleted: (chartId: string, row: number, col: number) => void;
}

const StoreContext = createContext<StoreState | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded: silently ignore.
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPatterns(loadFromStorage<Pattern[]>("kc_patterns", []));
    setCharts(loadFromStorage<SavedChart[]>("kc_charts", []));
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) saveToStorage("kc_patterns", patterns);
  }, [patterns, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage("kc_charts", charts);
  }, [charts, hydrated]);

  const savePattern = useCallback((pattern: Pattern) => {
    setPatterns((prev) => {
      const exists = prev.find((p) => p.id === pattern.id);
      if (exists) return prev.map((p) => (p.id === pattern.id ? pattern : p));
      return [pattern, ...prev];
    });
  }, []);

  const updatePattern = useCallback((id: string, updates: Partial<Pattern>) => {
    setPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePattern = useCallback((id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const saveChart = useCallback((chart: SavedChart) => {
    setCharts((prev) => {
      const exists = prev.find((c) => c.id === chart.id);
      if (exists) return prev.map((c) => (c.id === chart.id ? chart : c));
      return [chart, ...prev];
    });
  }, []);

  const updateChart = useCallback((id: string, updates: Partial<SavedChart>) => {
    setCharts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getPattern = useCallback(
    (id: string) => patterns.find((p) => p.id === id),
    [patterns]
  );

  const getChart = useCallback(
    (id: string) => charts.find((c) => c.id === id),
    [charts]
  );

  const toggleRowCompleted = useCallback(
    (patternId: string, sectionName: string, rowNumber: number) => {
      setPatterns((prev) =>
        prev.map((p) => {
          if (p.id !== patternId) return p;
          const sectionRows = p.completedRows[sectionName] ?? {};
          return {
            ...p,
            completedRows: {
              ...p.completedRows,
              [sectionName]: {
                ...sectionRows,
                [rowNumber]: !sectionRows[rowNumber],
              },
            },
          };
        })
      );
    },
    []
  );

  const toggleChartRowCompleted = useCallback(
    (chartId: string, rowNumber: number, rowWidth?: number) => {
      setCharts((prev) =>
        prev.map((c) => {
          if (c.id !== chartId) return c;
          const cells = c.completedCells ?? {};
          const width = rowWidth ?? c.width;
          const activeCols = Array.from({ length: width }, (_, col) => col).filter((col) =>
            isActiveChartCell(c.shapeKey, c.rowShaping, rowNumber, col, c.width, c.height)
          );
          const allDone = activeCols.length > 0 && activeCols.every((col) => cells[`${rowNumber},${col}`]);
          const next = { ...cells };
          for (const col of activeCols) {
            const key = `${rowNumber},${col}`;
            if (allDone) {
              delete next[key];
            } else {
              next[key] = true;
            }
          }
          return { ...c, completedCells: next };
        })
      );
    },
    []
  );

  const toggleChartCellCompleted = useCallback(
    (chartId: string, row: number, col: number) => {
      setCharts((prev) =>
        prev.map((c) => {
          if (c.id !== chartId) return c;
          const key = `${row},${col}`;
          const cells = c.completedCells ?? {};
          const next = { ...cells };
          if (next[key]) {
            delete next[key];
          } else {
            next[key] = true;
          }
          return { ...c, completedCells: next };
        })
      );
    },
    []
  );

  return (
    <StoreContext.Provider
      value={{
        patterns,
        charts,
        savePattern,
        updatePattern,
        deletePattern,
        saveChart,
        updateChart,
        deleteChart,
        getPattern,
        getChart,
        toggleRowCompleted,
        toggleChartRowCompleted,
        toggleChartCellCompleted,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export { generateId };
