"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Pattern, SavedChart } from "@/types";
import { isActiveChartCell } from "@/lib/shapes";
import {
  BookMarked, LayoutGrid, ArrowRight, Pencil, CheckSquare,
  Trash2, Sparkles,
} from "lucide-react";

type Tab = "patterns" | "charts";

export default function SavedPage() {
  const [tab, setTab] = useState<Tab>("patterns");
  const { patterns, charts, deletePattern, deleteChart } = useStore();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-7 fade-in">
          <h1 className="text-3xl font-bold text-[#2e1f14] mb-1" style={{ fontFamily: "var(--font-playfair), serif" }}>
            My Library
          </h1>
          <p className="text-[#8b6347] text-sm">All your saved patterns and colourwork charts.</p>
        </div>

        <div className="flex gap-1 mb-6 glass rounded-2xl p-1.5 w-fit shadow-md border border-white/60 fade-in-1">
          <TabButton active={tab === "patterns"} onClick={() => setTab("patterns")} icon={<BookMarked size={13} />}>
            Patterns ({patterns.length})
          </TabButton>
          <TabButton active={tab === "charts"} onClick={() => setTab("charts")} icon={<LayoutGrid size={13} />}>
            Charts ({charts.length})
          </TabButton>
        </div>

        {tab === "patterns" && <PatternsTab patterns={patterns} onDelete={deletePattern} />}
        {tab === "charts" && <ChartsTab charts={charts} onDelete={deleteChart} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children, icon }: {
  active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
        active ? "bg-white text-[#2e1f14] shadow-sm" : "text-[#8b6347] hover:text-[#2e1f14]"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function PatternsTab({ patterns, onDelete }: { patterns: Pattern[]; onDelete: (id: string) => void }) {
  const router = useRouter();

  if (patterns.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={28} color="white" strokeWidth={1.8} />}
        iconBg="icon-rose"
        title="No patterns yet"
        desc="Generate your first pattern and it will appear here."
        cta="Generate a Pattern"
        href="/generate"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {patterns.map((p) => (
        <PatternCard key={p.id} pattern={p} onOpen={() => router.push(`/pattern/${p.id}`)} onDelete={() => onDelete(p.id)} />
      ))}
    </div>
  );
}

function PatternCard({ pattern, onOpen, onDelete }: { pattern: Pattern; onOpen: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalRows = pattern.sections.reduce((acc, s) => acc + s.instructions.length, 0);
  const completedRowsCount = Object.values(pattern.completedRows).reduce(
    (acc, sectionRows) => acc + Object.values(sectionRows).filter(Boolean).length, 0
  );
  const progress = totalRows > 0 ? Math.round((completedRowsCount / totalRows) * 100) : 0;
  const currentSection = pattern.sections[pattern.currentSection ?? 0];

  return (
    <div className="glass rounded-2xl border border-white/60 shadow-md overflow-hidden card-lift flex flex-col">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #c9785c, #8b6347, #6a9470)" }} />
      {(pattern.previewImage || pattern.sourceImagePreview) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pattern.previewImage || pattern.sourceImagePreview} alt="Pattern preview" className="w-full h-28 object-cover" />
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-[#2e1f14] leading-snug flex-1" style={{ fontFamily: "var(--font-playfair), serif" }}>
            {pattern.name}
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#ecdccb] text-[#8b6347] px-2 py-0.5 rounded-full shrink-0">
            {pattern.craftType}
          </span>
        </div>
        <div className="text-xs text-[#8b6347] mb-3 space-y-0.5">
          <div>{pattern.garmentType} / {pattern.difficulty}</div>
          <div className="text-[#c4a07e]">Sizes: {pattern.sizes.join(", ")}</div>
          {currentSection && <div className="text-[#c4a07e]">Current: {currentSection.name}</div>}
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-[#c4a07e] mb-1.5">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#ecdccb] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6a9470, #96c49c)" }} />
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <button onClick={onOpen} className="flex-1 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-1"
            style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}>
            Continue <ArrowRight size={12} />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 border border-[#e2d0bb]/60 rounded-xl text-xs text-[#c4a07e] hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors">
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={onDelete} className="px-2 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 border border-[#e2d0bb]/60 text-[#8b6347] text-xs rounded-lg hover:bg-white/60 transition-colors">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartsTab({ charts, onDelete }: { charts: SavedChart[]; onDelete: (id: string) => void }) {
  const router = useRouter();

  if (charts.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid size={28} color="white" strokeWidth={1.8} />}
        iconBg="icon-slate"
        title="No charts yet"
        desc="Create your first colourwork chart and save it here."
        cta="Open Chart Editor"
        href="/chart-editor"
      />
    );
  }

  const projectGroups = Array.from(
    charts
      .filter((chart) => chart.projectId)
      .reduce((groups, chart) => {
        const key = chart.projectId!;
        const existing = groups.get(key) ?? [];
        existing.push(chart);
        groups.set(key, existing);
        return groups;
      }, new Map<string, SavedChart[]>())
      .values()
  ).map((group) => group.sort((a, b) => (a.sectionIndex ?? 999) - (b.sectionIndex ?? 999)));
  const projectChartIds = new Set(projectGroups.flat().map((chart) => chart.id));
  const looseCharts = charts.filter((chart) => !projectChartIds.has(chart.id));

  return (
    <div className="space-y-5">
      {projectGroups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectGroups.map((group) => (
            <ChartProjectCard
              key={group[0].projectId}
              charts={group}
              onOpen={() => router.push(`/chart/${group[0].id}`)}
              onEdit={() => router.push(`/chart-editor?load=${group[0].id}`)}
              onDelete={() => group.forEach((chart) => onDelete(chart.id))}
            />
          ))}
        </div>
      )}

      {looseCharts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {looseCharts.map((chart) => (
            <ChartCard key={chart.id} chart={chart}
              onEdit={() => router.push(`/chart-editor?load=${chart.id}`)}
              onDelete={() => onDelete(chart.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartProjectCard({
  charts,
  onOpen,
  onEdit,
  onDelete,
}: {
  charts: SavedChart[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const first = charts[0];
  const completed = charts.reduce((sum, chart) => sum + countCompletedActive(chart), 0);
  const total = charts.reduce((sum, chart) => sum + countActive(chart), 0);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl border border-white/60 shadow-md overflow-hidden card-lift flex flex-col">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #c9785c, #8b6347, #6a9470)" }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-[#2e1f14] leading-snug" style={{ fontFamily: "var(--font-playfair), serif" }}>
              {first.projectName ?? first.name}
            </h3>
            <p className="text-xs text-[#8b6347] mt-0.5">
              {first.craftType ?? "knitting"} / {first.garmentType ?? "Garment"} / {first.garmentSize ?? "M"}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#ecdccb] text-[#8b6347] px-2 py-0.5 rounded-full shrink-0">
            {charts.length} sections
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {charts.slice(0, 8).map((chart) => (
            <div key={chart.id} className="rounded-lg border border-[#e2d0bb]/60 bg-white/60 overflow-hidden">
              {chart.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chart.thumbnail} alt={chart.name} className="w-full aspect-square object-cover" style={{ imageRendering: "pixelated" }} />
              ) : (
                <div className="w-full aspect-square" style={{ background: `linear-gradient(135deg, ${chart.colors.slice(0, 4).join(", ")})` }} />
              )}
              <div className="px-1 py-0.5 text-[9px] text-[#8b6347] truncate">{chart.sectionName}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-[#c4a07e] mb-1.5">
            <span>Project progress</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#ecdccb] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6a9470, #96c49c)" }} />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onOpen} className="flex-1 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-1"
            style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}>
            Track Project <ArrowRight size={12} />
          </button>
          <button onClick={onEdit}
            className="px-3 py-2 glass border border-[#e2d0bb]/60 text-[#8b6347] text-xs font-semibold rounded-xl transition-all hover:bg-white/60">
            <Pencil size={13} />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 border border-[#e2d0bb]/60 rounded-xl text-xs text-[#c4a07e] hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors">
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={onDelete} className="px-2 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 border border-[#e2d0bb]/60 text-[#8b6347] text-xs rounded-lg hover:bg-white/60 transition-colors">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ chart, onEdit, onDelete }: { chart: SavedChart; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const completedCount = countCompletedActive(chart);
  const total = countActive(chart);
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl border border-white/60 shadow-md overflow-hidden card-lift flex flex-col">
      {chart.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chart.thumbnail} alt={chart.name} className="w-full aspect-square object-cover" style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="w-full aspect-square" style={{ background: `linear-gradient(135deg, ${chart.colors.slice(0, 4).join(", ")})` }} />
      )}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-xs font-bold text-[#2e1f14] mb-0.5 truncate" style={{ fontFamily: "var(--font-playfair), serif" }}>
          {chart.name}
        </h3>
        <p className="text-[10px] text-[#c4a07e] mb-2">{chart.width} by {chart.height}</p>

        {progress > 0 && (
          <div className="mb-2">
            <div className="h-1 bg-[#ecdccb] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6a9470, #96c49c)" }} />
            </div>
            <p className="text-[9px] text-[#c4a07e] mt-0.5">{progress}% worked</p>
          </div>
        )}

        <div className="flex gap-1 mb-2">
          {chart.colors.slice(0, 8).map((c, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded border border-[#e2d0bb]/50" style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="flex gap-1 mt-auto">
          <button onClick={onEdit}
            className="flex-1 py-1.5 glass border border-[#e2d0bb]/60 text-[#8b6347] text-xs font-semibold rounded-lg transition-all hover:bg-white/60 flex items-center justify-center gap-1">
            <Pencil size={10} /> Edit
          </button>
          <Link href={`/chart/${chart.id}`}
            className="flex-1 py-1.5 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #6a9470, #4e7a54)" }}>
            <CheckSquare size={10} /> Track
          </Link>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="px-2 py-1.5 border border-[#e2d0bb]/60 rounded-lg text-[#c4a07e] hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors">
              <Trash2 size={11} />
            </button>
          ) : (
            <div className="flex gap-0.5">
              <button onClick={onDelete} className="px-1.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-1.5 py-1 border border-[#e2d0bb]/60 text-[#8b6347] text-[10px] rounded-lg">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function countActive(chart: SavedChart): number {
  let total = 0;
  for (let row = 0; row < chart.height; row++) {
    for (let col = 0; col < chart.width; col++) {
      if (isActiveChartCell(chart.shapeKey, chart.rowShaping, row, col, chart.width, chart.height)) total++;
    }
  }
  return total;
}

function countCompletedActive(chart: SavedChart): number {
  let total = 0;
  for (let row = 0; row < chart.height; row++) {
    for (let col = 0; col < chart.width; col++) {
      if (
        isActiveChartCell(chart.shapeKey, chart.rowShaping, row, col, chart.width, chart.height) &&
        chart.completedCells?.[`${row},${col}`]
      ) {
        total++;
      }
    }
  }
  return total;
}

function EmptyState({ icon, iconBg, title, desc, cta, href }: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string; cta: string; href: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5 shadow-lg`}>{icon}</div>
      <h3 className="text-xl font-bold text-[#2e1f14] mb-2" style={{ fontFamily: "var(--font-playfair), serif" }}>{title}</h3>
      <p className="text-[#8b6347] text-sm mb-6 max-w-xs">{desc}</p>
      <Link href={href} className="inline-flex items-center gap-2 px-6 py-2.5 text-white rounded-2xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #8b6347, #6e4e38)" }}>
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
