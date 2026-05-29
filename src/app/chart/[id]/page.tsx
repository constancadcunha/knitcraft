"use client";

import { use, useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { isActiveChartCell } from "@/lib/shapes";
import { ArrowLeft, PenLine, RotateCcw, CheckCheck, ChevronDown, ChevronRight, Check, BookOpen } from "lucide-react";

const CELL_SIZE = 22;
const ROW_CELL_SIZE = 28;

export default function ChartTrackerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { charts, getChart, updateChart } = useStore();
  const chart = getChart(id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rowCanvasRef = useRef<HTMLCanvasElement>(null);
  const rowPanelRef = useRef<HTMLDivElement>(null);
  const rowScrollerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [isPainting, setIsPainting] = useState(false);
  const [isRowPainting, setIsRowPainting] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const paintModeRef = useRef<boolean>(true);
  const rowPaintModeRef = useRef<boolean>(true);
  const completedRef = useRef<Record<string, boolean>>({});
  const visitedCellsRef = useRef<Set<string>>(new Set());
  const visitedRowCellsRef = useRef<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    completedRef.current = chart?.completedCells ?? {};
  }, [chart?.completedCells]);

  const isChartActive = useCallback(
    (row: number, col: number) =>
      chart ? isActiveChartCell(chart.shapeKey, chart.rowShaping, row, col, chart.width, chart.height) : false,
    [chart]
  );

  const drawTracker = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = chart.width * CELL_SIZE;
    canvas.height = chart.height * CELL_SIZE;

    const completed = completedRef.current;

    for (let row = 0; row < chart.height; row++) {
      for (let col = 0; col < chart.width; col++) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        const active = isChartActive(row, col);

        if (!active) {
          ctx.fillStyle = "#ece6df";
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = "rgba(139,99,71,0.06)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = "#ddd8d0";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
          ctx.moveTo(x + CELL_SIZE - 3, y + 3);
          ctx.lineTo(x + 3, y + CELL_SIZE - 3);
          ctx.stroke();
          continue;
        }

        const colorIdx = chart.cells[row]?.[col]?.colorIndex ?? 0;
        ctx.fillStyle = chart.colors[colorIdx] ?? "#f5ede0";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = "rgba(139,99,71,0.12)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        if (completed[`${row},${col}`]) {
          ctx.fillStyle = "rgba(110,110,110,0.62)";
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(x + 4, y + CELL_SIZE / 2);
          ctx.lineTo(x + CELL_SIZE / 2 - 1, y + CELL_SIZE - 5);
          ctx.lineTo(x + CELL_SIZE - 4, y + 4);
          ctx.stroke();
        }
      }
    }
  }, [chart, isChartActive]);

  const drawRowView = useCallback(() => {
    const canvas = rowCanvasRef.current;
    if (!canvas || !chart || selectedRow === null) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = chart.width * ROW_CELL_SIZE;
    canvas.height = ROW_CELL_SIZE;

    const completed = completedRef.current;
    const row = selectedRow;

    for (let col = 0; col < chart.width; col++) {
      const x = col * ROW_CELL_SIZE;
      const y = 0;
      const active = isChartActive(row, col);

      if (!active) {
        ctx.fillStyle = "#ece6df";
        ctx.fillRect(x, y, ROW_CELL_SIZE, ROW_CELL_SIZE);
        ctx.strokeStyle = "#ddd8d0";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + ROW_CELL_SIZE - 4, y + ROW_CELL_SIZE - 4);
        ctx.moveTo(x + ROW_CELL_SIZE - 4, y + 4);
        ctx.lineTo(x + 4, y + ROW_CELL_SIZE - 4);
        ctx.stroke();
        continue;
      }

      const colorIdx = chart.cells[row]?.[col]?.colorIndex ?? 0;
      ctx.fillStyle = chart.colors[colorIdx] ?? "#f5ede0";
      ctx.fillRect(x, y, ROW_CELL_SIZE, ROW_CELL_SIZE);

      ctx.strokeStyle = "rgba(139,99,71,0.12)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, ROW_CELL_SIZE, ROW_CELL_SIZE);

      if (completed[`${row},${col}`]) {
        ctx.fillStyle = "rgba(110,110,110,0.62)";
        ctx.fillRect(x, y, ROW_CELL_SIZE, ROW_CELL_SIZE);

        ctx.strokeStyle = "rgba(255,255,255,0.80)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x + 5, y + ROW_CELL_SIZE / 2);
        ctx.lineTo(x + ROW_CELL_SIZE / 2 - 1, y + ROW_CELL_SIZE - 6);
        ctx.lineTo(x + ROW_CELL_SIZE - 5, y + 5);
        ctx.stroke();
      }
    }
  }, [chart, selectedRow, isChartActive]);

  useEffect(() => { drawTracker(); }, [drawTracker]);
  useEffect(() => { drawRowView(); }, [drawRowView]);

  // Scroll the main canvas container so the selected stitch is centred in view.
  useEffect(() => {
    if (selectedRow === null || !canvasContainerRef.current || !canvasRef.current) return;
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleY = rect.height / Math.max(1, canvas.height);
    const scaleX = rect.width / Math.max(1, canvas.width);
    const bottomReserve = rowPanelRef.current?.offsetHeight ?? 0;
    const visibleHeight = Math.max(80, container.clientHeight - bottomReserve);
    const rowY = selectedRow * CELL_SIZE * scaleY;
    const colX =
      (selectedCell?.row === selectedRow ? selectedCell.col : Math.floor((chart?.width ?? 1) / 2)) *
      CELL_SIZE *
      scaleX;
    const targetTop = rowY - visibleHeight / 2 + (CELL_SIZE * scaleY) / 2;
    const targetLeft = colX - container.clientWidth / 2 + (CELL_SIZE * scaleX) / 2;
    container.scrollTop = Math.max(0, targetTop);
    container.scrollLeft = Math.max(0, targetLeft);
  }, [selectedRow, selectedCell, chart?.width]);

  // Keep the zoomed row scroller aligned to the stitch the user last touched.
  useEffect(() => {
    if (!selectedCell || selectedRow !== selectedCell.row || !rowScrollerRef.current) return;
    const scroller = rowScrollerRef.current;
    const targetLeft = selectedCell.col * ROW_CELL_SIZE - scroller.clientWidth / 2 + ROW_CELL_SIZE / 2;
    scroller.scrollLeft = Math.max(0, targetLeft);
  }, [selectedCell, selectedRow]);

  // Scroll the sidebar to the selected row item
  useEffect(() => {
    if (selectedRow === null) return;
    const el = rowRefs.current[selectedRow];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedRow]);

  const getCellAt = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let cx: number, cy: number;
      if ("touches" in e) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = (e as React.MouseEvent).clientX;
        cy = (e as React.MouseEvent).clientY;
      }
      const col = Math.floor(((cx - rect.left) * scaleX) / CELL_SIZE);
      const row = Math.floor(((cy - rect.top) * scaleY) / CELL_SIZE);
      if (!chart) return null;
      if (col >= 0 && col < chart.width && row >= 0 && row < chart.height) {
        if (!isChartActive(row, col)) return null;
        return { row, col };
      }
      return null;
    },
    [chart, isChartActive]
  );

  const commitCompletedCells = useCallback(
    (next: Record<string, boolean>) => {
      if (!chart) return;
      completedRef.current = next;
      updateChart(chart.id, { completedCells: next });
      let total = 0;
      let done = 0;
      for (let row = 0; row < chart.height; row++) {
        for (let col = 0; col < chart.width; col++) {
          if (!isActiveChartCell(chart.shapeKey, chart.rowShaping, row, col, chart.width, chart.height)) continue;
          total++;
          if (next[`${row},${col}`]) done++;
        }
      }
      if (total > 0 && done === total) setShowCelebration(true);
      requestAnimationFrame(() => {
        drawTracker();
        drawRowView();
      });
    },
    [chart, updateChart, drawTracker, drawRowView]
  );

  const setCellDone = useCallback(
    (row: number, col: number, done: boolean) => {
      if (!chart) return;
      if (!isChartActive(row, col)) return;
      const key = `${row},${col}`;
      const next = { ...completedRef.current };
      if (done) {
        next[key] = true;
      } else {
        delete next[key];
      }
      commitCompletedCells(next);
    },
    [chart, commitCompletedCells, isChartActive]
  );

  const applyCell = useCallback(
    (row: number, col: number) => {
      const key = `${row},${col}`;
      if (visitedCellsRef.current.has(key)) return;
      visitedCellsRef.current.add(key);
      setCellDone(row, col, paintModeRef.current);
    },
    [setCellDone]
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e) (e as React.TouchEvent).preventDefault();
      const pos = getCellAt(e);
      if (!pos || !chart) return;
      const key = `${pos.row},${pos.col}`;
      paintModeRef.current = !completedRef.current[key];
      visitedCellsRef.current = new Set([key]);
      setIsPainting(true);
      setSelectedRow(pos.row);
      setSelectedCell(pos);
      setCellDone(pos.row, pos.col, paintModeRef.current);
    },
    [getCellAt, chart, setCellDone]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isPainting) return;
      if ("touches" in e) (e as React.TouchEvent).preventDefault();
      const pos = getCellAt(e);
      if (pos) {
        setSelectedCell(pos);
        applyCell(pos.row, pos.col);
      }
    },
    [isPainting, getCellAt, applyCell]
  );

  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    visitedCellsRef.current.clear();
  }, []);

  const getRowColAt = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): number | null => {
      if (!chart || selectedRow === null) return null;
      const canvas = rowCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const col = Math.floor(((clientX - rect.left) * scaleX) / ROW_CELL_SIZE);
      if (col >= 0 && col < chart.width) {
        if (!isChartActive(selectedRow, col)) return null;
        return col;
      }
      return null;
    },
    [chart, selectedRow, isChartActive]
  );

  const applyRowCell = useCallback(
    (col: number) => {
      if (selectedRow === null) return;
      const key = `${selectedRow},${col}`;
      if (visitedRowCellsRef.current.has(key)) return;
      visitedRowCellsRef.current.add(key);
      setCellDone(selectedRow, col, rowPaintModeRef.current);
    },
    [selectedRow, setCellDone]
  );

  const handleRowPointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if ("touches" in e) e.preventDefault();
      if (selectedRow === null) return;
      const col = getRowColAt(e);
      if (col === null) return;
      const key = `${selectedRow},${col}`;
      rowPaintModeRef.current = !completedRef.current[key];
      visitedRowCellsRef.current = new Set([key]);
      setIsRowPainting(true);
      setSelectedCell({ row: selectedRow, col });
      setCellDone(selectedRow, col, rowPaintModeRef.current);
    },
    [getRowColAt, selectedRow, setCellDone]
  );

  const handleRowPointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isRowPainting) return;
      if ("touches" in e) e.preventDefault();
      const col = getRowColAt(e);
      if (col !== null) {
        if (selectedRow !== null) setSelectedCell({ row: selectedRow, col });
        applyRowCell(col);
      }
    },
    [isRowPainting, getRowColAt, applyRowCell, selectedRow]
  );

  const handleRowPointerUp = useCallback(() => {
    setIsRowPainting(false);
    visitedRowCellsRef.current.clear();
  }, []);

  const toggleChartRow = useCallback(
    (rowIdx: number) => {
      if (!chart) return;
      const activeCols = Array.from({ length: chart.width }, (_, col) => col).filter((col) =>
        isChartActive(rowIdx, col)
      );
      const allDone = activeCols.length > 0 && activeCols.every((col) => completedRef.current[`${rowIdx},${col}`]);
      const next = { ...completedRef.current };
      for (const col of activeCols) {
        const key = `${rowIdx},${col}`;
        if (allDone) {
          delete next[key];
        } else {
          next[key] = true;
        }
      }
      commitCompletedCells(next);
      setSelectedRow(rowIdx);
      setSelectedCell({ row: rowIdx, col: activeCols[Math.floor(activeCols.length / 2)] ?? 0 });
      setExpandedRow(rowIdx);
    },
    [chart, commitCompletedCells, isChartActive]
  );

  if (!chart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl icon-rose flex items-center justify-center shadow-lg">
          <LayoutGridIcon />
        </div>
        <h2 className="text-2xl font-bold text-[#4a3f35]" style={{ fontFamily: "var(--font-lora), serif" }}>
          Chart not found
        </h2>
        <p className="text-[#8b7968]">This chart may have been deleted.</p>
        <Link href="/saved" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#c89b7e] text-white rounded-xl font-medium text-sm hover:bg-[#a07860] transition-all shadow-md">
          <ArrowLeft size={14} /> View My Library
        </Link>
      </div>
    );
  }

  const completed = chart.completedCells ?? {};
  const isGuideSection = chart.sectionRole === "materials" || chart.sectionRole === "prep" || chart.sectionRole === "finish";
  const guideGroups = chart.guideGroups ?? [];
  const guideItems = guideGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupTitle: group.title }))
  );

  // Count only active cells
  let totalActiveCells = 0;
  let completedCount = 0;
  for (let r = 0; r < chart.height; r++) {
    for (let c = 0; c < chart.width; c++) {
      if (isChartActive(r, c)) {
        totalActiveCells++;
        if (completed[`${r},${c}`]) completedCount++;
      }
    }
  }
  const progress = totalActiveCells > 0 ? Math.round((completedCount / totalActiveCells) * 100) : 0;

  const isRowDone = (rowIdx: number) => {
    let active = 0;
    for (let c = 0; c < chart.width; c++) {
      if (!isChartActive(rowIdx, c)) continue;
      active++;
      if (!completed[`${rowIdx},${c}`]) return false;
    }
    return active > 0;
  };

  const rowActiveCount = (rowIdx: number) => {
    let count = 0;
    for (let c = 0; c < chart.width; c++) {
      if (isChartActive(rowIdx, c)) count++;
    }
    return count;
  };

  const rowDoneCount = (rowIdx: number) =>
    Array.from({ length: chart.width }, (_, col) =>
      isChartActive(rowIdx, col) && !!completed[`${rowIdx},${col}`]
    ).filter(Boolean).length;

  const markAll = (done: boolean) => {
    const next: Record<string, boolean> = {};
    if (done) {
      for (let r = 0; r < chart.height; r++)
        for (let c = 0; c < chart.width; c++)
          if (isChartActive(r, c))
            next[`${r},${c}`] = true;
    }
    commitCompletedCells(next);
  };

  // Selected row stats
  const selActiveCount = selectedRow !== null ? rowActiveCount(selectedRow) : 0;
  const selDoneCount = selectedRow !== null ? rowDoneCount(selectedRow) : 0;
  const workingRowNumber = (rowIdx: number) => isGuideSection ? rowIdx + 1 : chart.height - rowIdx;
  const projectCharts = chart.projectId
    ? charts
        .filter((c) => c.projectId === chart.projectId)
        .sort((a, b) => (a.sectionIndex ?? 999) - (b.sectionIndex ?? 999))
    : [chart];
  const projectIndex = projectCharts.findIndex((c) => c.id === chart.id);
  const chartProgress = (target: typeof chart) => {
    let total = 0;
    let done = 0;
    for (let r = 0; r < target.height; r++) {
      for (let c = 0; c < target.width; c++) {
        if (!isActiveChartCell(target.shapeKey, target.rowShaping, r, c, target.width, target.height)) continue;
        total++;
        if (target.completedCells?.[`${r},${c}`]) done++;
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };
  const displayColorIndex = (colorIndex: number) => (colorIndex === 6 || colorIndex === 9 ? 0 : colorIndex);
  const usedColorIndexes = Array.from(
    new Set(
      Array.from({ length: chart.height }).flatMap((_, row) =>
        Array.from({ length: chart.width })
          .map((__, col) => {
            if (!isChartActive(row, col)) return null;
            return displayColorIndex(chart.cells[row]?.[col]?.colorIndex ?? 0);
          })
          .filter((value): value is number => value !== null)
      )
    )
  ).sort((a, b) => a - b);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md border-b border-[#d4c4b0]/30 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/saved" className="p-2 rounded-xl bg-white border border-[#e8ddd0] text-[#8b7968] hover:bg-[#f5ede6] transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#4a3f35]" style={{ fontFamily: "var(--font-lora), serif" }}>
                {chart.projectName ?? chart.name}
              </h1>
              <p className="text-xs text-[#8b7968] mt-0.5">
                {chart.sectionName ? `${chart.sectionName} - ` : ""}{chart.width} by {chart.height}. Click or drag to mark stitches.
              </p>
            </div>
          </div>
          {!isGuideSection && (
            <Link href={`/chart-editor?load=${chart.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#e8ddd0] text-sm text-[#8b7968] hover:bg-[#f5ede6] transition-all font-medium">
              <PenLine size={14} /> Edit Chart
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {projectCharts.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#e8ddd0] px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-[#4a3f35]" style={{ fontFamily: "var(--font-lora), serif" }}>
                  Project steps
                </h2>
                <p className="text-xs text-[#8b7968]">
                  Step {projectIndex + 1} of {projectCharts.length}. Shop, start, work each chart section, then finish.
                </p>
              </div>
              <div className="flex gap-2">
                {projectCharts[projectIndex - 1] && (
                  <Link href={`/chart/${projectCharts[projectIndex - 1].id}`} className="px-3 py-1.5 rounded-lg border border-[#e8ddd0] text-xs font-semibold text-[#8b7968] hover:bg-[#f5ede6]">
                    Previous
                  </Link>
                )}
                {projectCharts[projectIndex + 1] && (
                  <Link href={`/chart/${projectCharts[projectIndex + 1].id}`} className="px-3 py-1.5 rounded-lg border border-[#e8ddd0] text-xs font-semibold text-[#8b7968] hover:bg-[#f5ede6]">
                    Next
                  </Link>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {projectCharts.map((sectionChart) => {
                const sectionProgress = chartProgress(sectionChart);
                const active = sectionChart.id === chart.id;
                return (
                  <Link
                    key={sectionChart.id}
                    href={`/chart/${sectionChart.id}`}
                    className={`rounded-xl border px-3 py-2 transition-all ${
                      active
                        ? "border-[#4a3f35] bg-[#f5ede6] shadow-sm"
                        : "border-[#e8ddd0] bg-white hover:bg-[#f8f4f0]"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#4a3f35] truncate">
                      {sectionChart.sectionName ?? sectionChart.name}
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#e8ddd0] overflow-hidden">
                      <div className="h-full bg-[#6a9470]" style={{ width: `${sectionProgress}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-[#8b7968]">{sectionProgress}%</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e8ddd0] px-5 py-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <span className="text-sm font-bold text-[#4a3f35]">
                {completedCount} of {totalActiveCells} {isGuideSection ? "steps complete" : "stitches worked"}
              </span>
              <span className="text-xs text-[#8b7968] ml-2">{progress}% complete</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => markAll(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e8ddd0] text-xs text-[#8b7968] hover:bg-[#f5ede6] transition-all font-medium"
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={() => markAll(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6a9470]/50 text-xs text-[#6a9470] hover:bg-[#6a9470]/10 transition-all font-medium"
              >
                <CheckCheck size={12} /> Mark all done
              </button>
            </div>
          </div>
          <div className="h-2.5 bg-[#f5ede6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6a9470, #96c49c)" }}
            />
          </div>
        </div>

        {isGuideSection ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="bg-white rounded-2xl shadow-lg border border-[#e8ddd0] p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-[#4a3f35]" style={{ fontFamily: "var(--font-lora), serif" }}>
                    {chart.sectionName}
                  </h2>
                  <p className="text-xs text-[#8b7968]">
                    Work these like tracker rows. Check each step when it is done, then move to the next project section.
                  </p>
                </div>
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#251a1c] bg-[#ffd166] px-3 py-2 text-xs font-black text-[#251a1c]"
                >
                  <BookOpen size={14} /> Quick Learn
                </Link>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, index) => {
                  const done = !!completed[`${index},0`];
                  return (
                    <div
                      key={`${item.groupTitle}-${item.title}-${index}`}
                      className={`w-full rounded-xl border p-4 transition-all ${
                        done
                          ? "border-[#6a9470] bg-[#6a9470]/10"
                          : "border-[#e8ddd0] bg-[#fffaf0] hover:border-[#251a1c]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCellDone(index, 0, !done)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          done ? "bg-[#6a9470] border-[#6a9470] text-white" : "border-[#c4a07e] bg-white text-transparent"
                        }`}>
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-black uppercase tracking-wide text-[#8b6f47]">
                            {item.groupTitle} / Step {index + 1}
                          </span>
                          <span className="mt-1 flex items-center gap-2 text-sm font-black text-[#251a1c]">
                            {item.colorHex && (
                              <span
                                className="h-5 w-5 shrink-0 rounded border-2 border-[#251a1c]"
                                style={{ backgroundColor: item.colorHex }}
                                aria-hidden
                              />
                            )}
                            <span>{item.title}</span>
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-[#6b5d52]">{item.detail}</span>
                        </span>
                        </div>
                      </button>
                      {(item.imageUrl || item.sourceUrl) && (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={`${item.title} diagram`}
                              className="h-24 w-full max-w-[220px] rounded-lg border border-[#e8ddd0] bg-white object-contain p-2"
                              loading="lazy"
                            />
                          )}
                          <Link
                            href={item.sourceUrl ?? guideLearnHref(item.title)}
                            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#251a1c] bg-[#fff0bf] px-3 py-2 text-xs font-black text-[#251a1c]"
                          >
                            <BookOpen size={13} /> Open matching lesson
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-[#e8ddd0] p-4 h-fit">
              <h3 className="text-sm font-bold text-[#4a3f35] mb-2" style={{ fontFamily: "var(--font-lora), serif" }}>
                What this step is for
              </h3>
              <div className="space-y-2 text-xs leading-relaxed text-[#6b5d52]">
                <p>
                  Shopping list gathers yarn, tools, and notions before you begin.
                </p>
                <p>
                  Start here explains the cast-on or foundation row, gauge, chart direction, and ribbing when selected.
                </p>
                <p>
                  Finish off gives assembly and blocking in order after the chart sections are worked.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#fff0bf] rounded-2xl shadow-lg border border-[#e8ddd0] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-[#4a3f35] font-semibold">
                Row 1 is the bottom edge. For flat knitting, right-side rows are usually read right to left as knit-facing stitches; wrong-side rows are usually left to right as purl-facing equivalents.
              </p>
              <Link href="/learn" className="inline-flex items-center gap-1.5 text-xs font-black text-[#251a1c] underline">
                <BookOpen size={13} /> Open Quick Learn
              </Link>
            </div>

            {/* Main split layout */}
            <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 500 }}>

          {/* Canvas panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-[#e8ddd0] p-4 flex flex-col" style={{ maxHeight: "calc(100vh - 200px)", minHeight: 400 }}>
            <p className="text-xs text-[#8b7968] mb-3 font-medium">
              Click a stitch to mark it worked. Drag to mark multiple at once.
            </p>
            <div ref={canvasContainerRef} className="flex-1 overflow-auto">
              <canvas
                ref={canvasRef}
                style={{ maxWidth: "100%", imageRendering: "pixelated", cursor: "crosshair" }}
                className="border border-[#e8ddd0] rounded-lg touch-none select-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
            </div>

            {/* Selected row canvas */}
            {selectedRow !== null && (
              <div ref={rowPanelRef} className="mt-3 pt-3 border-t border-[#e8ddd0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#4a3f35]">
                    Row {workingRowNumber(selectedRow)} - click or drag individual stitches
                  </span>
                  <span className="text-xs text-[#8b7968]">
                    {selDoneCount}/{selActiveCount} worked
                  </span>
                </div>
                <div ref={rowScrollerRef} className="overflow-x-auto">
                  <canvas
                    ref={rowCanvasRef}
                    style={{ imageRendering: "pixelated", cursor: "pointer", height: ROW_CELL_SIZE, maxWidth: "none" }}
                    className="border border-[#e8ddd0] rounded-lg touch-none select-none"
                    onMouseDown={handleRowPointerDown}
                    onMouseMove={handleRowPointerMove}
                    onMouseUp={handleRowPointerUp}
                    onMouseLeave={handleRowPointerUp}
                    onTouchStart={handleRowPointerDown}
                    onTouchMove={handleRowPointerMove}
                    onTouchEnd={handleRowPointerUp}
                  />
                </div>
              </div>
            )}

            {/* Colour legend */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#e8ddd0]">
              {usedColorIndexes.map((i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded border border-[#e8ddd0]" style={{ backgroundColor: chart.colors[i] ?? "#f5ede0" }} />
                  <span className="text-[10px] text-[#8b7968]">{i + 1}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded border border-[#e8ddd0] bg-gray-400 opacity-70" />
                <span className="text-[10px] text-[#8b7968]">Worked</span>
              </div>
            </div>
          </div>

          {/* Row sidebar */}
          <div className="lg:w-72 shrink-0 bg-white rounded-2xl shadow-lg border border-[#e8ddd0] flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 200px)", minHeight: 300 }}>
            <div className="px-4 py-3 border-b border-[#e8ddd0] shrink-0">
              <h2 className="font-bold text-sm text-[#4a3f35]" style={{ fontFamily: "var(--font-lora), serif" }}>
                Row Tracker
              </h2>
              <p className="text-[10px] text-[#8b7968] mt-0.5">Click a row to view it. Check to mark done.</p>
            </div>
            <div ref={sidebarRef} className="flex-1 overflow-y-auto divide-y divide-[#e8ddd0]">
              {Array.from({ length: chart.height }, (_, displayIdx) => {
                const rowIdx = chart.height - 1 - displayIdx;
                const done = isRowDone(rowIdx);
                const doneInRow = rowDoneCount(rowIdx);
                const activeInRow = rowActiveCount(rowIdx);
                const partial = doneInRow > 0 && !done;
                const isExpanded = expandedRow === rowIdx;
                const isSelected = selectedRow === rowIdx;

                return (
                  <div key={rowIdx} ref={(el) => { rowRefs.current[rowIdx] = el; }}>
                    {/* Row header */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors select-none ${
                        isSelected ? "bg-[#c89b7e]/10" : done ? "bg-[#6a9470]/5" : isExpanded ? "bg-[#f5ede6]/60" : "hover:bg-[#f5ede6]/40"
                      }`}
                    >
                      {/* Checkbox to mark whole row */}
                      <button
                        type="button"
                        aria-label={`Toggle row ${workingRowNumber(rowIdx)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChartRow(rowIdx);
                        }}
                        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          done
                            ? "bg-[#6a9470] border-[#6a9470] text-white"
                            : partial
                            ? "bg-[#fff0bf] border-[#8b6f47] text-[#8b6f47]"
                            : "bg-white border-[#c4a07e] hover:border-[#6a9470]"
                        }`}
                      >
                        {(done || partial) && <Check size={13} strokeWidth={3} />}
                      </button>
                      {/* Row label + expand/select toggle */}
                      <button
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                        onClick={() => {
                          setSelectedRow(isSelected ? null : rowIdx);
                          setSelectedCell(isSelected ? null : { row: rowIdx, col: Math.floor(chart.width / 2) });
                          setExpandedRow(isExpanded ? null : rowIdx);
                        }}
                      >
                        <span className={`text-xs font-bold w-8 shrink-0 ${done ? "text-[#8b7968]/60" : "text-[#8b7968]"}`}>
                          R{workingRowNumber(rowIdx)}
                        </span>
                        {/* Mini colour strip */}
                        <div className="flex flex-1 h-3.5 overflow-hidden rounded gap-px">
                          {Array.from({ length: Math.min(chart.width, 24) }, (_, col) => {
                            const ci = chart.cells[rowIdx]?.[col]?.colorIndex ?? 0;
                            const active = isChartActive(rowIdx, col);
                            return (
                              <div
                                key={col}
                                className="flex-1 h-full"
                                style={{ backgroundColor: active ? (chart.colors[ci] ?? "#f5ede0") : "#ece6df", opacity: done ? 0.4 : 1 }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-[#8b7968]/70 shrink-0 w-12 text-right">
                          {doneInRow}/{activeInRow}
                        </span>
                        <span className="text-[#c89b7e] shrink-0">
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                      </button>
                    </div>

                    {/* Expanded stitch grid */}
                    {isExpanded && (
                      <div className="px-3 py-2 bg-[#fdf9f5] border-t border-[#e8ddd0]">
                        <p className="text-[9px] text-[#8b7968] mb-1.5 font-medium uppercase tracking-wide">
                          Tap stitches to toggle
                        </p>
                        <div className="flex flex-wrap gap-[3px]">
                          {Array.from({ length: chart.width }, (_, col) => {
                            const active = isChartActive(rowIdx, col);
                            if (!active) return (
                              <div
                                key={col}
                                style={{ backgroundColor: "#ece6df" }}
                                className="w-[18px] h-[18px] rounded-[3px] border border-black/5 shrink-0 opacity-40"
                              />
                            );
                            const ci = chart.cells[rowIdx]?.[col]?.colorIndex ?? 0;
                            const cellColor = chart.colors[ci] ?? "#f5ede0";
                            const isDone = !!completed[`${rowIdx},${col}`];
                            return (
                              <button
                                key={col}
                                onClick={() => {
                                  setSelectedRow(rowIdx);
                                  setSelectedCell({ row: rowIdx, col });
                                  setCellDone(rowIdx, col, !completed[`${rowIdx},${col}`]);
                                }}
                                title={`R${workingRowNumber(rowIdx)} S${col + 1}`}
                                style={{ backgroundColor: isDone ? "#888" : cellColor }}
                                className="w-[18px] h-[18px] rounded-[3px] border border-black/10 transition-all hover:scale-110 hover:border-[#c89b7e]/40 active:scale-95 shrink-0"
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          </>
        )}
      </div>
      {showCelebration && (
        <div className="fixed inset-0 z-[70] bg-[#251a1c]/45 px-4 flex items-center justify-center">
          <div className="relative max-w-sm w-full bg-[#fffaf0] border-[3px] border-[#251a1c] rounded-lg shadow-[8px_8px_0_#251a1c] p-6 text-center overflow-hidden">
            <div className="confetti-strip" aria-hidden>
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${index * 0.06}s` }} />
              ))}
            </div>
            <h2 className="text-2xl font-black text-[#251a1c] mb-2" style={{ fontFamily: "var(--font-lora), serif" }}>
              Panel complete!
            </h2>
            <p className="text-sm text-[#6b5d52] leading-relaxed mb-5">
              That whole chart is worked. Block it, admire it, and decide what masterpiece gets cast on next.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowCelebration(false)}
                className="px-4 py-2 rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] text-xs font-black text-[#251a1c]"
              >
                Stay here
              </button>
              <Link
                href="/chart-editor"
                className="px-4 py-2 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] text-xs font-black text-[#251a1c]"
              >
                New project
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutGridIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}

function guideLearnHref(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `/learn#learn-${slug}` : "/learn";
}
