"use client";

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, generateId } from "@/lib/store";
import type { CraftType, SavedChart } from "@/types";
import { GARMENT_TEMPLATES } from "@/types";
import { getShapeKey, isActiveChartCell, type RowShaping } from "@/lib/shapes";
import { getAssemblyInstructions, getQuickReference } from "@/lib/projectGuides";
import { buildGaugeTemplate, GARMENT_SIZES, type GarmentSize, gaugeForCraft, SIZE_H_SCALE, SIZE_W_SCALE } from "@/lib/craftKnowledge";
import { buildStarterGrid, createProjectGuideCharts, DEFAULT_CHART_COLORS, makeGrid } from "@/lib/chartFactory";
import {
  Pencil, Eraser, PaintBucket, Undo2, Trash2, Download, Save,
  ArrowLeft, ChevronRight, Check, Play, Plus, X, LayoutGrid,
} from "lucide-react";

function GarmentIconSmall({ type, active }: { type: string; active: boolean }) {
  const c = active ? "#8b6347" : "#c4a07e";
  const fo = active ? "0.18" : "0.1";
  const sw = "1.8";
  switch (type) {
    case "Sweater":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M14 5 Q15 11 20 11 Q25 11 26 5 L32 7.5 L37 21 L30 21 L30 34 L10 34 L10 21 L3 21 L8 7.5 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Cardigan":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M14 5 L8 7.5 L3 21 L10 21 L10 34 L19.5 34 L19.5 11" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M26 5 L32 7.5 L37 21 L30 21 L30 34 L20.5 34 L20.5 11" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><line x1="20" y1="11" x2="20" y2="34" stroke={c} strokeWidth="1" strokeDasharray="2 1.5"/></svg>;
    case "Hat": case "Hat / Beanie":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M9 27 C9 16 31 16 31 27 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><rect x="7" y="26" width="26" height="5" rx="2.5" fill={c} fillOpacity="0.2" stroke={c} strokeWidth={sw}/></svg>;
    case "Scarf":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><rect x="14" y="3" width="12" height="30" rx="6" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw}/></svg>;
    case "Socks":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M15 4 L15 22 Q15 30 25 30 Q33 30 33 23 Q33 19 27 19 L25 19 L25 4 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Mittens":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M10 30 L10 14 Q10 7 15 7 Q20 7 20 14 L20 30 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M20 17 Q22 13 25 14 Q28 15 25 19 L20 21" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Shawl":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M20 6 L4 31 L36 31 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Baby Blanket": case "Throw Blanket":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><rect x="4" y="4" width="32" height="28" rx="3" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw}/><line x1="4" y1="13" x2="36" y2="13" stroke={c} strokeWidth="0.8" strokeDasharray="3 2"/><line x1="4" y1="22" x2="36" y2="22" stroke={c} strokeWidth="0.8" strokeDasharray="3 2"/></svg>;
    case "Cowl":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><ellipse cx="20" cy="18" rx="14" ry="11" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw}/><ellipse cx="20" cy="18" rx="8" ry="6" fill="white" stroke={c} strokeWidth={sw}/></svg>;
    case "Vest":
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><path d="M13 5 Q14 10 20 10 Q26 10 27 5 L32 10 L30 34 L10 34 L8 10 Z" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    default:
      return <svg viewBox="0 0 40 36" fill="none" className="w-full h-full"><rect x="6" y="6" width="28" height="24" rx="5" fill={c} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeDasharray="4 2"/></svg>;
  }
}

const CELL_SIZE = 16;
const MIN_GRID = 5;
const MAX_GRID = 220;

type Tool = "pen" | "eraser" | "fill";

type SectionDraft = {
  cells: number[][];
  chartId?: string;
};

function normalizeGrid(grid: number[][], w: number, h: number): number[][] {
  return Array.from({ length: h }, (_, row) =>
    Array.from({ length: w }, (_, col) => grid[row]?.[col] ?? 0)
  );
}

function craftLabel(craftType: CraftType): string {
  return craftType === "crocheting" ? "crochet" : "knit";
}

export default function ChartEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-6 px-4">Loading chart editor...</div>}>
      <ChartEditorContent />
    </Suspense>
  );
}

function ChartEditorContent() {
  const { saveChart, updateChart, charts } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadId = searchParams.get("load");

  const [gridW, setGridW] = useState(20);
  const [gridH, setGridH] = useState(20);
  const [cells, setCells] = useState<number[][]>(() => makeGrid(20, 20));
  const [colors, setColors] = useState<string[]>([...DEFAULT_CHART_COLORS]);
  const [activeColor, setActiveColor] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [painting, setPainting] = useState(false);
  const [chartName, setChartName] = useState("My Colourwork Chart");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<number[][][]>([]);
  const [currentChartId, setCurrentChartId] = useState<string | null>(null);

  // Template state
  const [craftType, setCraftType] = useState<CraftType>("knitting");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("New garment project");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [templateSection, setTemplateSection] = useState(0);
  const [templateSize, setTemplateSize] = useState<GarmentSize>("L");
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);
  const [includeRibbing, setIncludeRibbing] = useState(false);
  const [currentShapeKey, setCurrentShapeKey] = useState<string | undefined>(undefined);
  const [rowShaping, setRowShaping] = useState<RowShaping | undefined>(undefined);
  const [shapingRow, setShapingRow] = useState(0);
  const [sectionDrafts, setSectionDrafts] = useState<Record<number, SectionDraft>>({});

  // Setup wizard state
  const [setupComplete, setSetupComplete] = useState(false);
  const [customSections, setCustomSections] = useState<{ name: string; w: number; h: number }[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSecName, setNewSecName] = useState("");
  const [newSecW, setNewSecW] = useState(30);
  const [newSecH, setNewSecH] = useState(40);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const sectionDraftsRef = useRef(sectionDrafts);

  useEffect(() => {
    sectionDraftsRef.current = sectionDrafts;
  }, [sectionDrafts]);

  const templates = useMemo(() => buildGaugeTemplate(craftType), [craftType]);
  const activeTemplates = useMemo(() => ({ ...GARMENT_TEMPLATES, ...templates }), [templates]);
  const activeGauge = gaugeForCraft(craftType);

  // Sections for the current project including any user-added custom ones
  const projectSections = useMemo(() => {
    const base = templateKey ? (activeTemplates[templateKey]?.sections ?? []) : [];
    const scaled = customSections.map(s => ({ name: s.name, w: s.w, h: s.h }));
    return [...base, ...scaled];
  }, [templateKey, activeTemplates, customSections]);

  const isCellActive = useCallback(
    (row: number, col: number, width = gridW, height = gridH) =>
      isActiveChartCell(currentShapeKey, rowShaping, row, col, width, height),
    [currentShapeKey, rowShaping, gridW, gridH]
  );

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = gridW * CELL_SIZE;
    canvas.height = gridH * CELL_SIZE;

    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < gridW; col++) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        const active = isCellActive(row, col);
        if (!active) {
          ctx.fillStyle = "#ece6df";
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = "rgba(139,99,71,0.06)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          // Draw a subtle X to indicate inactive
          ctx.strokeStyle = "#ddd8d0";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
          ctx.moveTo(x + CELL_SIZE - 3, y + 3);
          ctx.lineTo(x + 3, y + CELL_SIZE - 3);
          ctx.stroke();
        } else {
          const colorIdx = cells[row]?.[col] ?? 0;
          ctx.fillStyle = colors[colorIdx] ?? "#f5ede0";
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = "rgba(139,99,71,0.14)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }, [cells, colors, gridW, gridH, isCellActive]);

  useEffect(() => { drawGrid(); }, [drawGrid]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const col = Math.floor(((clientX - rect.left) * scaleX) / CELL_SIZE);
      const row = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);
      if (col >= 0 && col < gridW && row >= 0 && row < gridH) {
        if (!isCellActive(row, col)) return null;
        return { row, col };
      }
      return null;
    },
    [gridW, gridH, isCellActive]
  );

  const paintCell = useCallback(
    (row: number, col: number) => {
      if (!isCellActive(row, col)) return;
      setCells((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = tool === "eraser" ? 0 : activeColor;
        return next;
      });
    },
    [tool, activeColor, isCellActive]
  );

  const floodFill = useCallback(
    (startRow: number, startCol: number) => {
      if (!isCellActive(startRow, startCol)) return;
      setCells((prev) => {
        const target = prev[startRow][startCol];
        const fill = tool === "eraser" ? 0 : activeColor;
        if (target === fill) return prev;
        const next = prev.map((r) => [...r]);
        const stack = [[startRow, startCol]];
        while (stack.length) {
          const [r, c] = stack.pop()!;
          if (r < 0 || r >= gridH || c < 0 || c >= gridW) continue;
          if (!isCellActive(r, c)) continue;
          if (next[r][c] !== target) continue;
          next[r][c] = fill;
          stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
        }
        return next;
      });
    },
    [tool, activeColor, gridH, gridW, isCellActive]
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), cells.map((r) => [...r])]);
  }, [cells]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCells(prev);
      return h.slice(0, -1);
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCellFromEvent(e);
      if (!pos) return;
      pushHistory();
      setPainting(true);
      if (tool === "fill") { floodFill(pos.row, pos.col); }
      else { paintCell(pos.row, pos.col); }
    },
    [getCellFromEvent, pushHistory, tool, floodFill, paintCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!painting || tool === "fill") return;
      const pos = getCellFromEvent(e);
      if (pos) paintCell(pos.row, pos.col);
    },
    [painting, tool, getCellFromEvent, paintCell]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = getCellFromEvent(e);
      if (!pos) return;
      pushHistory();
      setPainting(true);
      if (tool === "fill") { floodFill(pos.row, pos.col); }
      else { paintCell(pos.row, pos.col); }
    },
    [getCellFromEvent, pushHistory, tool, floodFill, paintCell]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!painting || tool === "fill") return;
      const pos = getCellFromEvent(e);
      if (pos) paintCell(pos.row, pos.col);
    },
    [painting, tool, getCellFromEvent, paintCell]
  );

  const clearCanvas = () => { pushHistory(); setCells(makeGrid(gridW, gridH)); };

  const resizeGrid = (newW: number, newH: number) => {
    const w = Math.max(MIN_GRID, Math.min(MAX_GRID, newW));
    const h = Math.max(MIN_GRID, Math.min(MAX_GRID, newH));
    setCells((prev) =>
      Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => prev[r]?.[c] ?? 0))
    );
    setGridW(w);
    setGridH(h);
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${chartName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const ensureProject = (garmentKey: string | null | undefined = templateKey, size: GarmentSize = templateSize) => {
    if (!garmentKey) return projectId;
    const nextProjectId = projectId ?? generateId();
    if (!projectId) setProjectId(nextProjectId);
    if (projectName === "New garment project") {
      setProjectName(`${size} ${craftLabel(craftType)} ${garmentKey}`);
    }
    return nextProjectId;
  };

  const buildChart = (
    id: string,
    sectionName: string | undefined,
    sectionIndex: number | undefined,
    width: number,
    height: number,
    grid: number[][],
    thumbnail?: string,
    existing?: SavedChart
  ): SavedChart => {
    const garmentKey = templateKey ?? existing?.garmentType;
    const shapeKey = garmentKey && sectionName ? getShapeKey(garmentKey, sectionName) : currentShapeKey;
    const pid = garmentKey ? ensureProject(garmentKey, templateSize) ?? undefined : undefined;
    const nextProjectName = pid && garmentKey
      ? projectName === "New garment project"
        ? `${templateSize} ${craftLabel(craftType)} ${garmentKey}`
        : projectName
      : undefined;
    return {
      id,
      name: sectionName && garmentKey ? `${garmentKey} - ${sectionName} (${templateSize})` : chartName,
      width,
      height,
      cells: grid.map((r) => r.map((c) => ({ colorIndex: c }))),
      colors,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      thumbnail: thumbnail ?? existing?.thumbnail,
      completedCells: existing?.completedCells ?? {},
      shapeKey: shapeKey && shapeKey !== "rect" ? shapeKey : undefined,
      rowShaping,
      projectId: pid,
      projectName: nextProjectName,
      craftType: pid ? craftType : undefined,
      garmentType: garmentKey ?? undefined,
      garmentSize: pid ? templateSize : undefined,
      sectionName,
      sectionIndex,
      sectionCount: garmentKey ? projectSections.length + 3 : undefined,
      assemblyInstructions: garmentKey ? getAssemblyInstructions(garmentKey) : undefined,
      quickReference: garmentKey ? getQuickReference(craftType, garmentKey) : undefined,
      includeRibbing,
    };
  };

  const handleSave = (): string => {
    const canvas = canvasRef.current;
    const thumbnail = canvas?.toDataURL("image/png");
    const sectionName = templateKey ? projectSections[templateSection]?.name : undefined;
    const existingSection = templateKey && projectId && sectionName
      ? charts.find((c) => c.projectId === projectId && c.sectionName === sectionName)
      : undefined;
    const chartId = currentChartId ?? existingSection?.id ?? generateId();
    const chart = buildChart(
      chartId,
      sectionName,
      templateKey ? templateSection + 2 : undefined,
      gridW,
      gridH,
      cells,
      thumbnail,
      currentChartId ? charts.find((c) => c.id === currentChartId) : existingSection
    );
    if (currentChartId) {
      updateChart(currentChartId, chart);
      saveGuideStepsForChart(chart);
      rememberCurrentSection(currentChartId);
      setSavedMsg("Updated!");
      setTimeout(() => setSavedMsg(null), 2500);
      return currentChartId;
    } else {
      saveChart(chart);
      saveGuideStepsForChart(chart);
      setCurrentChartId(chartId);
      rememberCurrentSection(chartId);
      setSavedMsg("Saved to library!");
      setTimeout(() => setSavedMsg(null), 2500);
      return chartId;
    }
  };

  const handleSaveAndTrack = () => {
    if (templateKey) {
      const firstStepId = saveAllSections();
      if (firstStepId) {
        router.push(`/chart/${firstStepId}`);
        return;
      }
    }
    const id = handleSave();
    router.push(`/chart/${id}`);
  };

  const saveGuideStepsForChart = (chart: SavedChart) => {
    if (!chart.projectId || !chart.garmentType || !chart.garmentSize || !templateKey) return;
    const [materialsChart, prepChart, finishChart] = createProjectGuideCharts({
      projectId: chart.projectId,
      projectName: chart.projectName ?? projectName,
      craftType: chart.craftType ?? craftType,
      garmentType: chart.garmentType,
      garmentSize: chart.garmentSize,
      includeRibbing,
      chartSectionCount: projectSections.length || 1,
      chartSections: [
        ...charts.filter((c) => c.projectId === chart.projectId && c.sectionRole === "chart" && c.id !== chart.id),
        chart,
      ],
      existingMaterials: charts.find((c) => c.projectId === chart.projectId && c.sectionRole === "materials"),
      existingPrep: charts.find((c) => c.projectId === chart.projectId && c.sectionRole === "prep"),
      existingFinish: charts.find((c) => c.projectId === chart.projectId && c.sectionRole === "finish"),
    });
    saveChart(materialsChart);
    saveChart(prepChart);
    saveChart(finishChart);
  };

  const loadChart = useCallback((chart: SavedChart) => {
    setGridW(chart.width);
    setGridH(chart.height);
    setCells(chart.cells.map((r) => r.map((c) => c.colorIndex)));
    setColors(chart.colors);
    setChartName(chart.name);
    setCurrentChartId(chart.id);
    setCurrentShapeKey(chart.shapeKey ?? undefined);
    setRowShaping(chart.rowShaping);
    setIncludeRibbing(chart.includeRibbing ?? false);
    setShapingRow(Math.max(0, chart.height - 1));
    setCraftType(chart.craftType ?? "knitting");
    setProjectId(chart.projectId ?? null);
    setProjectName(chart.projectName ?? "New garment project");
    if (chart.garmentType && activeTemplates[chart.garmentType] && chart.sectionRole !== "materials" && chart.sectionRole !== "prep" && chart.sectionRole !== "finish") {
      const idx =
        typeof chart.sectionIndex === "number"
          ? Math.max(0, chart.sectionIndex - 2)
          : activeTemplates[chart.garmentType].sections.findIndex((s) => s.name === chart.sectionName);
      setTemplateKey(chart.garmentType);
      setTemplateSize((chart.garmentSize as GarmentSize | undefined) ?? "L");
      setTemplateSection(Math.max(0, idx));
      setSectionDrafts((prev) => ({
        ...prev,
        [Math.max(0, idx)]: {
          cells: chart.cells.map((r) => r.map((c) => c.colorIndex)),
          chartId: chart.id,
        },
      }));
    }
  }, [activeTemplates]);

  useEffect(() => {
    if (!loadId) return;
    const chart = charts.find((savedChart) => savedChart.id === loadId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chart) { loadChart(chart); setSetupComplete(true); }
  }, [loadId, charts, loadChart]);

  const updateColor = (idx: number, value: string) => {
    setColors((prev) => { const next = [...prev]; next[idx] = value; return next; });
  };

  const selectColor = (idx: number) => { setActiveColor(idx); setTool("pen"); };

  const rememberCurrentSection = (chartId: string | null = currentChartId) => {
    if (!templateKey) return;
    const nextDrafts = {
      ...sectionDraftsRef.current,
      [templateSection]: {
        ...(sectionDraftsRef.current[templateSection] ?? {}),
        cells: cells.map((row) => [...row]),
        chartId: chartId ?? sectionDraftsRef.current[templateSection]?.chartId,
      },
    };
    sectionDraftsRef.current = nextDrafts;
    setSectionDrafts(nextDrafts);
  };

  const startFreehand = () => {
    rememberCurrentSection();
    setTemplateKey(null);
    setProjectId(null);
    setProjectName("Freehand chart");
    setChartName("Freehand stitch chart");
    setGridW(76);
    setGridH(96);
    setCells(makeGrid(76, 96));
    setCurrentChartId(null);
    setCurrentShapeKey(undefined);
    setRowShaping(undefined);
    setShapingRow(95);
    setHistory([]);
  };

  const updateFreehandRow = (row: number, deltaWidth: number) => {
    setRowShaping((prev) => {
      const inheritedWidth = (() => {
        for (let r = row; r < gridH; r++) {
          const shaped = prev?.[String(r)];
          if (shaped) return shaped.width;
        }
        return gridW;
      })();
      const current = prev?.[String(row)] ?? { start: 0, width: inheritedWidth };
      const nextWidth = Math.max(1, Math.min(gridW, current.width + deltaWidth));
      const nextStart = Math.max(0, Math.min(gridW - nextWidth, Math.round((gridW - nextWidth) / 2)));
      const next = { ...(prev ?? {}) };
      for (let r = 0; r <= row; r++) next[String(r)] = { start: nextStart, width: nextWidth };
      return next;
    });
  };

  const setFreehandRowWidth = (row: number, width: number) => {
    const nextWidth = Math.max(1, Math.min(gridW, width));
    const nextStart = Math.max(0, Math.min(gridW - nextWidth, Math.round((gridW - nextWidth) / 2)));
    setRowShaping((prev) => {
      const next = { ...(prev ?? {}) };
      for (let r = 0; r <= row; r++) next[String(r)] = { start: nextStart, width: nextWidth };
      return next;
    });
  };

  const applyTemplate = (key: string, sectionIdx: number, size: GarmentSize = templateSize) => {
    const sectionsForKey = key === templateKey ? projectSections : activeTemplates[key]?.sections;
    if (!sectionsForKey?.length) return;
    rememberCurrentSection();
    const sec = sectionsForKey[sectionIdx];
    if (!sec) return;
    const w = Math.round(sec.w * SIZE_W_SCALE[size]);
    const h = Math.round(sec.h * SIZE_H_SCALE[size]);
    const shapeKey = getShapeKey(key, sec.name);
    const startingNewProject = key !== templateKey || size !== templateSize || !projectId;
    const nextProjectId = startingNewProject ? generateId() : projectId;
    const existingSection = charts.find((c) => c.projectId === nextProjectId && c.sectionName === sec.name);
    const draft = !startingNewProject ? sectionDraftsRef.current[sectionIdx] : undefined;
    const draftCells = draft?.cells ?? existingSection?.cells.map((r) => r.map((c) => c.colorIndex));
    setTemplateKey(key);
    setTemplateSection(sectionIdx);
    setTemplateSize(size);
    setProjectId(nextProjectId);
    if (startingNewProject || projectName === "New garment project") {
      setProjectName(`${size} ${craftLabel(craftType)} ${key}`);
    }
    setCurrentChartId(draft?.chartId ?? existingSection?.id ?? null);
    setChartName(`${key} - ${sec.name} (${size})`);
    setGridW(w);
    setGridH(h);
    setCells(draftCells ? normalizeGrid(draftCells, w, h) : buildStarterGrid(sec.name, w, h, includeRibbing));
    setHistory([]);
    setCurrentShapeKey(shapeKey !== "rect" ? shapeKey : undefined);
    setRowShaping(existingSection?.rowShaping);
    setShapingRow(h - 1);
    if (startingNewProject) setSectionDrafts({});
  };

  const saveAllSections = (): string | null => {
    const garmentKey = templateKey;
    const tpl = garmentKey ? { sections: projectSections } : null;
    if (!tpl || !garmentKey) return null;
    const canvas = canvasRef.current;
    const currentSecName = tpl.sections[templateSection]?.name;
    const pid = ensureProject(garmentKey, templateSize) ?? generateId();
    const nextDrafts: Record<number, SectionDraft> = {
      ...sectionDraftsRef.current,
      [templateSection]: { cells: cells.map((row) => [...row]), chartId: currentChartId ?? undefined },
    };
    const savedSectionCharts: SavedChart[] = [];
    tpl.sections.forEach((sec, idx) => {
      const isCurrentSection = sec.name === currentSecName;
      const w = Math.round(sec.w * SIZE_W_SCALE[templateSize]);
      const h = Math.round(sec.h * SIZE_H_SCALE[templateSize]);
      const existing = charts.find((c) => c.projectId === pid && c.sectionName === sec.name);
      const id = nextDrafts[idx]?.chartId ?? existing?.id ?? generateId();
      const grid = isCurrentSection
        ? cells
        : nextDrafts[idx]?.cells ?? existing?.cells.map((r) => r.map((c) => c.colorIndex)) ?? buildStarterGrid(sec.name, w, h, includeRibbing);
      const chart = buildChart(
        id,
        sec.name,
        idx + 2,
        w,
        h,
        normalizeGrid(grid, w, h),
        isCurrentSection ? canvas?.toDataURL("image/png") : undefined,
        existing
      );
      chart.projectId = pid;
      chart.projectName = projectName === "New garment project" ? `${templateSize} ${craftLabel(craftType)} ${garmentKey}` : projectName;
      chart.includeRibbing = includeRibbing;
      if (!isCurrentSection) chart.rowShaping = existing?.rowShaping;
      saveChart(chart);
      savedSectionCharts.push(chart);
      nextDrafts[idx] = { cells: normalizeGrid(grid, w, h), chartId: id };
      if (isCurrentSection) setCurrentChartId(id);
    });
    const [materialsChart, prepChart, finishChart] = createProjectGuideCharts({
      projectId: pid,
      projectName: projectName === "New garment project" ? `${templateSize} ${craftLabel(craftType)} ${garmentKey}` : projectName,
      craftType,
      garmentType: garmentKey,
      garmentSize: templateSize,
      includeRibbing,
      chartSectionCount: tpl.sections.length,
      chartSections: savedSectionCharts,
      existingMaterials: charts.find((c) => c.projectId === pid && c.sectionRole === "materials"),
      existingPrep: charts.find((c) => c.projectId === pid && c.sectionRole === "prep"),
      existingFinish: charts.find((c) => c.projectId === pid && c.sectionRole === "finish"),
    });
    saveChart(materialsChart);
    saveChart(prepChart);
    saveChart(finishChart);
    setProjectId(pid);
    setSectionDrafts(nextDrafts);
    setTemplateMsg(`${tpl.sections.length} section charts saved to one ${garmentKey} project`);
    setTimeout(() => setTemplateMsg(null), 4000);
    return materialsChart.id;
  };

  const freehandWidthForRow = (row: number) => {
    for (let r = row; r < gridH; r++) {
      const shaped = rowShaping?.[String(r)];
      if (shaped) return shaped.width;
    }
    return gridW;
  };

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: "pen", icon: Pencil, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "fill", icon: PaintBucket, label: "Fill" },
  ];

  // Setup wizard
  if (!setupComplete) {
    const sections = templateKey ? activeTemplates[templateKey]?.sections ?? [] : [];
    const allSections = [...sections.map(s => ({ ...s, custom: false })), ...customSections.map(s => ({ ...s, custom: true }))];

    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/saved" className="p-2 rounded-xl glass border border-white/60 text-[#8b6347] hover:bg-white/80 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#2e1f14]" style={{ fontFamily: "var(--font-playfair), serif" }}>
                New Chart Project
              </h1>
              <p className="text-sm text-[#8b6347]">Set up your project first, then focus on the design.</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Step 1. Craft type */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-5">
              <h2 className="text-[11px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                1. Craft type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(["knitting", "crocheting"] as CraftType[]).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setCraftType(ct)}
                    className={`py-4 rounded-2xl text-sm font-bold capitalize transition-all border-2 flex items-center justify-center gap-2 ${
                      craftType === ct
                        ? "border-[#8b6347] bg-[#8b6347]/10 text-[#2e1f14] shadow-md"
                        : "border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                    }`}
                  >
                    {ct === "knitting" ? (
                      <><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="16" x2="16" y2="4"/><line x1="4" y1="4" x2="16" y2="16"/><circle cx="4" cy="4" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="4" r="2" fill="currentColor" stroke="none"/></svg>Knitting</>
                    ) : (
                      <><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 17 L13 5 Q16 2 17 5 Q18 7 14 9"/></svg>Crochet</>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2. Garment type */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-5">
              <h2 className="text-[11px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                2. What are you making?
              </h2>
              <div className="grid grid-cols-4 gap-2.5 mb-3">
                {Object.entries(activeTemplates).map(([key]) => (
                  <button
                    key={key}
                    onClick={() => setTemplateKey(key)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all ${
                      templateKey === key
                        ? "border-[#8b6347] bg-[#8b6347]/10 shadow-md scale-105"
                        : "border-[#e2d0bb]/60 hover:bg-white/60"
                    }`}
                  >
                    <div className="w-10 h-9">
                      <GarmentIconSmall type={key} active={templateKey === key} />
                    </div>
                    <span className="text-[10px] font-semibold text-[#2e1f14] leading-tight text-center line-clamp-2">
                      {key}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setTemplateKey(null)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all ${
                    templateKey === null
                      ? "border-[#8b6347] bg-[#8b6347]/10 shadow-md scale-105"
                      : "border-[#e2d0bb]/60 hover:bg-white/60"
                  }`}
                >
                  <div className="w-10 h-9 flex items-center justify-center text-[#8b6347]">
                    <LayoutGrid size={24} />
                  </div>
                  <span className="text-[10px] font-semibold text-[#2e1f14] leading-tight text-center">
                    Freehand
                  </span>
                </button>
              </div>
            </div>

            {/* Step 3. Size (garment only) */}
            {templateKey && (
              <div className="glass rounded-2xl border border-white/60 shadow-md p-5">
                <h2 className="text-[11px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                  3. Size
                </h2>
                <div className="flex gap-2">
                  {GARMENT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTemplateSize(sz)}
                      className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                        templateSize === sz
                          ? "border-[#8b6347] bg-[#8b6347] text-white shadow-md"
                          : "border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#c4a07e] mt-2">
                  Baseline gauge: {activeGauge.label}. You can adjust stitch counts after.
                </p>
              </div>
            )}

            {/* Step 4. Ribbing */}
            {templateKey && (
              <div className="glass rounded-2xl border border-white/60 shadow-md p-5">
                <h2 className="text-[11px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                  4. Ribbing
                </h2>
                <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#251a1c] bg-[#fff0bf] px-4 py-3 text-sm font-black text-[#251a1c]">
                  <span>{includeRibbing ? "Add ribbing where the garment needs it" : "No ribbing in the chart"}</span>
                  <input
                    type="checkbox"
                    checked={includeRibbing}
                    onChange={(e) => setIncludeRibbing(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#4fae68]"
                  />
                </label>
                <p className="mt-2 text-[10px] leading-relaxed text-[#c4a07e]">
                  This affects hems, cuffs, collars, button bands, and pocket tops. Blankets, shawls, and scarves stay plain unless you deliberately draw ribbing.
                </p>
              </div>
            )}

            {/* Step 5. Sections */}
            {templateKey && (
              <div className="glass rounded-2xl border border-white/60 shadow-md p-5">
                <h2 className="text-[11px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                  5. Project sections
                </h2>
                <div className="flex flex-col gap-2 mb-3">
                  {allSections.map((sec, idx) => (
                    <div
                      key={sec.name + idx}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/50 border border-[#e2d0bb]/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-[#8b6347]/50" />
                        <span className="text-sm font-medium text-[#2e1f14]">{sec.name}</span>
                        {sec.custom && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#d4907a]/20 text-[#d4907a] uppercase tracking-wide">
                            custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#c4a07e]">
                          {Math.round(sec.w * SIZE_W_SCALE[templateSize])} by {Math.round(sec.h * SIZE_H_SCALE[templateSize])}
                        </span>
                        {sec.custom && (
                          <button
                            onClick={() =>
                              setCustomSections((prev) => prev.filter((_, i) => i !== idx - sections.length))
                            }
                            className="text-[#c4a07e] hover:text-red-400 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {showAddSection ? (
                  <div className="rounded-xl border border-[#8b6347]/30 bg-[#fdf7f0] p-3.5 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold text-[#8b6347] uppercase tracking-widest">Add custom section</p>
                    <input
                      placeholder="Section name (e.g. Hood, Pocket)"
                      value={newSecName}
                      onChange={(e) => setNewSecName(e.target.value)}
                      className="w-full border border-[#e2d0bb]/60 rounded-lg px-3 py-2 text-sm text-[#2e1f14] bg-white/70 focus:outline-none focus:border-[#8b6347] transition-colors"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[9px] text-[#c4a07e] font-semibold">Width (stitches)</label>
                        <input
                          type="number"
                          min={5}
                          max={220}
                          value={newSecW}
                          onChange={(e) => setNewSecW(Number(e.target.value))}
                          className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/70 focus:outline-none focus:border-[#8b6347] mt-0.5"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-[#c4a07e] font-semibold">Height (rows)</label>
                        <input
                          type="number"
                          min={5}
                          max={220}
                          value={newSecH}
                          onChange={(e) => setNewSecH(Number(e.target.value))}
                          className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/70 focus:outline-none focus:border-[#8b6347] mt-0.5"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!newSecName.trim()) return;
                          setCustomSections((prev) => [...prev, { name: newSecName.trim(), w: newSecW, h: newSecH }]);
                          setNewSecName("");
                          setNewSecW(30);
                          setNewSecH(40);
                          setShowAddSection(false);
                        }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
                        style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}
                      >
                        Add Section
                      </button>
                      <button
                        onClick={() => setShowAddSection(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[#8b6347] border border-[#e2d0bb]/60 hover:bg-white/60 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#c4a07e]/60 text-xs font-bold text-[#c4a07e] hover:border-[#8b6347] hover:text-[#8b6347] hover:bg-white/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={13} /> Add another section
                  </button>
                )}
              </div>
            )}

            {/* Start button */}
            <button
              onClick={() => {
                if (templateKey) {
                  applyTemplate(templateKey, 0, templateSize);
                } else {
                  startFreehand();
                }
                setSetupComplete(true);
              }}
              className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}
            >
              Start Designing
            </button>
          </div>
        </div>
      </div>
    );
  }
  // End wizard

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/saved" className="p-2 rounded-xl glass border border-white/60 text-[#8b6347] hover:bg-white/80 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2e1f14]" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Colourwork Chart Editor
            </h1>
            <p className="text-sm text-[#8b6347]">Choose the garment first, then design each shaped section right-side up.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* SIDEBAR */}
          <div className="lg:w-[260px] flex flex-col gap-4 shrink-0">

            {/* Chart name */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
              <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-1.5">
                Chart name
              </label>
              <input
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                className="w-full border border-[#e2d0bb]/60 rounded-xl px-3 py-2 text-sm text-[#2e1f14] bg-white/60 focus:outline-none focus:border-[#8b6347] transition-colors"
              />
              {templateKey && (
                <>
                  <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mt-3 mb-1.5">
                    Project name
                  </label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full border border-[#e2d0bb]/60 rounded-xl px-3 py-2 text-sm text-[#2e1f14] bg-white/60 focus:outline-none focus:border-[#8b6347] transition-colors"
                  />
                </>
              )}
            </div>

            {/* Garment template */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
              <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-3">
                Project setup
              </label>

              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {(["knitting", "crocheting"] as CraftType[]).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => {
                      setCraftType(ct);
                      if (templateKey) setProjectName(`${templateSize} ${craftLabel(ct)} ${templateKey}`);
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold capitalize transition-all ${
                      craftType === ct
                        ? "bg-[#8b6347] text-white shadow-sm"
                        : "bg-[#ecdccb]/60 text-[#8b6347] hover:bg-[#ecdccb]"
                    }`}
                  >
                    {ct === "knitting" ? "Knitting" : "Crochet"}
                  </button>

                ))}
              </div>

              {/* Size selector */}
              <div className="flex gap-1 mb-3">
                {GARMENT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setTemplateSize(sz);
                      if (templateKey) applyTemplate(templateKey, templateSection, sz);
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      templateSize === sz
                        ? "bg-[#8b6347] text-white shadow-sm"
                        : "bg-[#ecdccb]/60 text-[#8b6347] hover:bg-[#ecdccb]"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <p className="mb-3 rounded-lg border border-[#2e1f14] bg-[#fff0bf] px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-[#2e1f14]">
                Baseline gauge: {activeGauge.label}. Size L cardigan back = 76 stitches (42 in finished bust). Swatch first if your yarn behaves differently.
              </p>
              <label
                className={`flex w-full cursor-pointer items-center justify-between gap-3 mb-3 px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                  includeRibbing
                    ? "border-[#251a1c] bg-[#fff0bf] text-[#251a1c]"
                    : "border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                }`}
              >
                <span>{includeRibbing ? "Ribbing included in chart" : "No ribbing in chart"}</span>
                <input
                  type="checkbox"
                  checked={includeRibbing}
                  onChange={(event) => {
                    const target = event.target.checked;
                    setIncludeRibbing(target);
                    if (templateKey) {
                      const sectionName = projectSections[templateSection]?.name;
                      if (sectionName) {
                        pushHistory();
                        setCells(buildStarterGrid(sectionName, gridW, gridH, target));
                      }
                    }
                  }}
                  className="h-4 w-4 shrink-0 accent-[#4fae68]"
                />
              </label>

              {/* Garment grid */}
              <button
                onClick={startFreehand}
                className={`w-full mb-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  !templateKey
                    ? "border-[#8b6347] bg-[#8b6347]/10 text-[#2e1f14]"
                    : "border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                }`}
              >
                Freehand rectangle chart
              </button>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {Object.entries(activeTemplates).map(([key]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key, 0)}
                    title={key}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-center transition-all ${
                      templateKey === key
                        ? "border-[#8b6347] bg-[#8b6347]/10 scale-105 shadow-sm"
                        : "border-[#e2d0bb]/60 hover:bg-white/60 glass"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black ${templateKey === key ? "bg-[#8b6347] text-white" : "bg-[#ecdccb] text-[#8b6347]"}`}>
                      {key.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[8px] font-semibold text-[#8b6347] leading-tight line-clamp-1">
                      {key.replace(" Blanket", "").replace("Baby ", "Baby\n")}
                    </span>
                  </button>
                ))}
              </div>

              {templateKey && projectSections.length > 0 && (
                <>
                  <div className="text-[10px] font-bold text-[#2e1f14] uppercase tracking-widest mb-1.5">Section</div>
                  <div className="flex flex-col gap-1 mb-3">
                    {projectSections.map((sec, idx) => (
                      <button
                        key={`${sec.name}-${idx}`}
                        onClick={() => applyTemplate(templateKey, idx)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          templateSection === idx
                            ? "border-[#8b6347] bg-[#8b6347]/10 text-[#2e1f14] font-bold"
                            : "border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                        }`}
                      >
                        <span>{sec.name}</span>
                        <span className="text-[10px] text-[#c4a07e]">
                          {Math.round(sec.w * SIZE_W_SCALE[templateSize])} by {Math.round(sec.h * SIZE_H_SCALE[templateSize])}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={saveAllSections}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg, #6a9470, #96c49c)" }}
                  >
                    Save Project Sections
                  </button>
                  {templateMsg && (
                    <p className="text-[10px] text-[#6a9470] text-center font-medium mt-2 flex items-center justify-center gap-1">
                      <Check size={11} /> {templateMsg}
                    </p>
                  )}
                </>
              )}
            </div>

            {!templateKey && (
              <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
                <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-2">
                  Freehand row shaping
                </label>
                <div className="text-[10px] text-[#8b6347] mb-2">
                  Row 1 is the bottom cast-on or foundation row. Add stitches for increases, take stitches for decreases or cast-offs.
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[10px] text-[#c4a07e] mb-1">Working row</div>
                    <input
                      type="number"
                      min={1}
                      max={gridH}
                      value={gridH - shapingRow}
                      onChange={(e) => setShapingRow(Math.max(0, Math.min(gridH - 1, gridH - Number(e.target.value))))}
                      className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/60"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#c4a07e] mb-1">Stitches</div>
                    <input
                      type="number"
                      min={1}
                      max={gridW}
                      value={freehandWidthForRow(shapingRow)}
                      onChange={(e) => setFreehandRowWidth(shapingRow, Number(e.target.value))}
                      className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateFreehandRow(shapingRow, 2)} className="py-2 rounded-xl bg-[#ecdccb]/60 text-xs font-bold text-[#8b6347]">
                    Add 2 sts
                  </button>
                  <button onClick={() => updateFreehandRow(shapingRow, -2)} className="py-2 rounded-xl bg-[#ecdccb]/60 text-xs font-bold text-[#8b6347]">
                    Take 2 sts
                  </button>
                </div>
              </div>
            )}

            {/* Grid size */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
              <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-2">
                Grid size
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-[10px] text-[#c4a07e] mb-1">Width</div>
                  <input type="number" min={MIN_GRID} max={MAX_GRID} value={gridW}
                    onChange={(e) => resizeGrid(Number(e.target.value), gridH)}
                    className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/60 focus:outline-none focus:border-[#8b6347]"
                  />
                </div>
                <span className="text-[#c4a07e] mt-3 font-light">by</span>
                <div className="flex-1">
                  <div className="text-[10px] text-[#c4a07e] mb-1">Height</div>
                  <input type="number" min={MIN_GRID} max={MAX_GRID} value={gridH}
                    onChange={(e) => resizeGrid(gridW, Number(e.target.value))}
                    className="w-full border border-[#e2d0bb]/60 rounded-lg px-2 py-1.5 text-sm text-center text-[#2e1f14] bg-white/60 focus:outline-none focus:border-[#8b6347]"
                  />
                </div>
              </div>
            </div>

            {/* Tools */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
              <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-2">
                Tool
              </label>
              <div className="flex gap-2">
                {tools.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTool(id)}
                    title={label}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                      tool === id
                        ? "bg-[#8b6347] text-white shadow-md"
                        : "bg-white/40 border border-[#e2d0bb]/60 text-[#8b6347] hover:bg-white/60"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    <span className="text-[9px] font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colours */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
              <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-2">
                Colours
              </label>
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {colors.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectColor(idx)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${
                      activeColor === idx
                        ? "border-[#2e1f14] scale-110 shadow-lg ring-2 ring-[#8b6347] ring-offset-1"
                        : "border-[#e2d0bb]/60 hover:border-[#c4a07e] hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Colour ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white/40 rounded-xl border border-[#e2d0bb]/50">
                <div className="w-7 h-7 rounded-lg border border-[#e2d0bb]/60 shrink-0 shadow-sm"
                  style={{ backgroundColor: colors[activeColor] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-[#8b6347] font-semibold mb-0.5">Colour {activeColor + 1}</div>
                  <div className="text-[9px] font-mono text-[#2e1f14]">{colors[activeColor]}</div>
                </div>
                <label className="cursor-pointer shrink-0">
                  <span className="text-xs text-[#8b6347] font-semibold hover:text-[#2e1f14] transition-colors">Edit</span>
                  <input ref={colorInputRef} type="color" value={colors[activeColor]}
                    onChange={(e) => updateColor(activeColor, e.target.value)} className="sr-only" />
                </label>
              </div>
              <p className="text-[9px] text-[#c4a07e] mt-1.5">Click swatch to select. Edit to change colour.</p>
            </div>

            {/* Actions */}
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4 space-y-2">
              <button onClick={undo} disabled={history.length === 0}
                className="w-full py-2 rounded-xl border border-[#e2d0bb]/60 text-sm text-[#8b6347] hover:bg-white/60 disabled:opacity-30 transition-all font-medium flex items-center justify-center gap-2">
                <Undo2 size={14} /> Undo
              </button>
              <button onClick={clearCanvas}
                className="w-full py-2 rounded-xl border border-red-200/60 text-sm text-red-400 hover:bg-red-50/60 transition-all font-medium flex items-center justify-center gap-2">
                <Trash2 size={14} /> Clear
              </button>
              <button onClick={downloadPNG}
                className="w-full py-2 rounded-xl bg-white/60 border border-[#e2d0bb]/60 text-sm text-[#8b6347] hover:bg-white/80 transition-all font-medium flex items-center justify-center gap-2">
                <Download size={14} /> Download PNG
              </button>
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${chartName} ${craftLabel(craftType)} chart reference`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-white/60 border border-[#e2d0bb]/60 text-sm text-[#8b6347] hover:bg-white/80 transition-all font-medium flex items-center justify-center gap-2"
              >
                <GoogleMark /> Reference images
              </a>
              <button onClick={() => handleSave()}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}>
                <Save size={14} />
                {currentChartId ? "Save Changes" : "Save to Library"}
              </button>
              <button onClick={handleSaveAndTrack}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #6a9470, #4e7a54)" }}>
                <Play size={14} /> Save &amp; Track Progress
              </button>
              {currentChartId && (
                <button
                  onClick={() => { setCurrentChartId(null); setChartName("My Colourwork Chart"); setCells(makeGrid(20, 20)); setGridW(20); setGridH(20); setColors([...DEFAULT_CHART_COLORS]); setTemplateKey(null); setCurrentShapeKey(undefined); setRowShaping(undefined); setShapingRow(19); setProjectId(null); setProjectName("New garment project"); setSectionDrafts({}); }}
                  className="w-full py-2 rounded-xl border border-[#e2d0bb]/60 text-sm text-[#c4a07e] hover:bg-white/60 transition-all font-medium"
                >
                  New Chart
                </button>
              )}
              {savedMsg && (
                <p className="text-xs text-[#6a9470] text-center font-semibold flex items-center justify-center gap-1">
                  <Check size={12} /> {savedMsg}
                </p>
              )}
            </div>

            {/* Saved charts */}
            {charts.length > 0 && (
              <div className="glass rounded-2xl border border-white/60 shadow-md p-4">
                <label className="block text-[10px] font-bold text-[#8b6347] uppercase tracking-widest mb-2">
                  Load saved chart
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {charts.map((c) => (
                    <button key={c.id} onClick={() => loadChart(c)}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                        currentChartId === c.id
                          ? "border-[#8b6347] bg-[#8b6347]/10"
                          : "border-[#e2d0bb]/60 hover:bg-white/60"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[#2e1f14]">{c.name}</div>
                        <div className="text-[10px] text-[#c4a07e]">{c.width} by {c.height}</div>
                      </div>
                      <ChevronRight size={12} className="text-[#c4a07e]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CANVAS */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="glass rounded-2xl border border-white/60 shadow-md p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#8b6347] font-medium">{gridW} by {gridH}</p>
                {currentChartId && (
                  <span className="text-xs text-[#8b6347] font-semibold">Editing: {chartName}</span>
                )}
              </div>
              {currentShapeKey && (
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#2e1f14]">
                  Top edge and neckline are shown at the top of this chart.
                </div>
              )}
              <div className="flex-1 overflow-auto flex items-start justify-center">
                <canvas
                  ref={canvasRef}
                  className="grid-canvas border border-[#e2d0bb]/50 rounded-lg touch-none"
                  style={{
                    maxWidth: "100%",
                    imageRendering: "pixelated",
                    cursor: tool === "eraser" ? "cell" : "crosshair",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={() => setPainting(false)}
                  onMouseLeave={() => setPainting(false)}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => setPainting(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span aria-hidden className="inline-grid place-items-center w-4 h-4 rounded-full bg-white border border-black/10 text-[11px] font-black">
      <span>
        <span style={{ color: "#4285f4" }}>G</span>
      </span>
    </span>
  );
}
