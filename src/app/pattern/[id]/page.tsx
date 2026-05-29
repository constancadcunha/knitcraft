"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Pattern, Abbreviation } from "@/types";
import { getQuickReference } from "@/lib/projectGuides";

export default function PatternPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { getPattern, toggleRowCompleted, deletePattern } = useStore();
  const router = useRouter();
  const pattern = getPattern(id);

  if (!pattern) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-xl border-2 border-[#3d2b1f] bg-[#f0e8da] shadow-[5px_5px_0_#3d2b1f]" />
        <h2
          className="text-2xl font-bold text-[#3d2b1f]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Pattern not found
        </h2>
        <p className="text-[#8b6f47]">This pattern may have been deleted or doesn&apos;t exist.</p>
        <Link
          href="/saved"
          className="mt-2 px-5 py-2.5 bg-[#8b6f47] text-white rounded-[10px] font-medium text-sm hover:bg-[#6b5344] transition-colors"
        >
          View My Library
        </Link>
      </div>
    );
  }

  return (
    <PatternView
      pattern={pattern}
      onToggleRow={toggleRowCompleted}
      onDelete={() => {
        deletePattern(id);
        router.push("/saved");
      }}
    />
  );
}

function PatternView({
  pattern,
  onToggleRow,
  onDelete,
}: {
  pattern: Pattern;
  onToggleRow: (pid: string, section: string, row: number) => void;
  onDelete: () => void;
}) {
  const [currentSection, setCurrentSection] = useState(pattern.currentSection ?? 0);
  const [activeAbbr, setActiveAbbr] = useState<Abbreviation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { updatePattern, charts } = useStore();

  const section = pattern.sections[currentSection];

  const totalRows = section?.instructions.length ?? 0;
  const completedRows = Object.values(
    pattern.completedRows[section?.name ?? ""] ?? {}
  ).filter(Boolean).length;
  const progress = totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0;

  const handleToggle = useCallback(
    (rowNum: number) => {
      onToggleRow(pattern.id, section.name, rowNum);
    },
    [pattern.id, section, onToggleRow]
  );

  const goToSection = (idx: number) => {
    setCurrentSection(idx);
    updatePattern(pattern.id, { currentSection: idx });
  };

  const allSectionDone =
    totalRows > 0 &&
    section.instructions.every(
      (ins) => pattern.completedRows[section.name]?.[ins.rowNumber]
    );
  const quickReference = getQuickReference(pattern.craftType, pattern.garmentType);
  const trackerChartId =
    pattern.firstChartId ??
    charts.find((chart) => chart.projectId === pattern.projectId)?.id;

  return (
    <div className="min-h-screen">
      {/* Pattern header */}
      <div className="bg-white border-b border-[#e8ddd0] px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide bg-[#f0e8da] text-[#8b6f47] px-2.5 py-1 rounded-full border border-[#e8ddd0]">
                  {pattern.craftType}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide bg-[#f0e8da] text-[#8b6f47] px-2.5 py-1 rounded-full border border-[#e8ddd0]">
                  {pattern.difficulty}
                </span>
                <span className="text-xs text-[#c4a882]">{pattern.estimatedTime}</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-[#3d2b1f]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                {pattern.name}
              </h1>
              <p className="text-[#8b6f47] text-sm mt-1">
                {pattern.garmentType} / Sizes: {pattern.sizes.join(", ")}
              </p>
            </div>
            <div className="flex gap-2">
              {trackerChartId && (
                <Link
                  href={`/chart/${trackerChartId}`}
                  className="px-4 py-2 rounded-[10px] border border-[#251a1c] bg-[#ffd166] text-sm text-[#251a1c] hover:bg-[#ffe08a] transition-colors font-black"
                >
                  Open tracker
                </Link>
              )}
              <Link
                href="/saved"
                className="px-4 py-2 rounded-[10px] border border-[#e8ddd0] text-sm text-[#8b6f47] hover:bg-[#f0e8da] transition-colors font-medium"
              >
                Library
              </Link>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 rounded-[10px] border border-red-200 text-sm text-red-400 hover:bg-red-50 transition-colors font-medium"
                >
                  Delete
                </button>
              ) : (
                <div className="flex gap-1.5 items-center">
                  <span className="text-xs text-red-500">Sure?</span>
                  <button
                    onClick={onDelete}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#e8ddd0] text-xs text-[#8b6f47] hover:bg-[#f0e8da] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {(pattern.previewImage || pattern.sourceImagePreview) && (
          <div className="comic-panel overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pattern.previewImage || pattern.sourceImagePreview}
              alt="Generated pattern preview"
              className="h-64 w-full object-cover"
            />
          </div>
        )}

        {/* Two-column layout on wider screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Materials */}
            <CollapsibleCard title="Materials" defaultOpen>
              <div className="space-y-3">
                {pattern.materials.yarn.map((y, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-semibold text-[#3d2b1f]">{y.name}</div>
                    <div className="text-[#8b6f47]">
                      {y.color} / {y.weight} / {y.meterage}m per skein
                    </div>
                    <div className="text-xs text-[#c4a882] mt-0.5">
                      {pattern.sizes.map((sz) => `${sz}: ${y.skeins?.[sz] ?? "?"} skein${(y.skeins?.[sz] ?? 1) !== 1 ? "s" : ""}`).join(" / ")}
                    </div>
                  </div>
                ))}
                {pattern.materials.needles?.length > 0 && (
                  <div className="text-sm pt-1 border-t border-[#e8ddd0]">
                    <div className="font-semibold text-[#3d2b1f] mb-1">Needles</div>
                    {pattern.materials.needles.map((n, i) => (
                      <div key={i} className="text-[#8b6f47]">{n}</div>
                    ))}
                  </div>
                )}
                {pattern.materials.notions?.length > 0 && (
                  <div className="text-sm pt-1 border-t border-[#e8ddd0]">
                    <div className="font-semibold text-[#3d2b1f] mb-1">Notions</div>
                    {pattern.materials.notions.map((n, i) => (
                      <div key={i} className="text-[#8b6f47]">{n}</div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleCard>

            {/* Gauge */}
            <CollapsibleCard title="Gauge">
              <div className="text-sm space-y-1">
                <div className="text-[#3d2b1f]">
                  <span className="font-semibold">{pattern.gauge.stitches}</span> sts x{" "}
                  <span className="font-semibold">{pattern.gauge.rows}</span> rows
                </div>
                <div className="text-[#8b6f47]">over {pattern.gauge.swatchSize}</div>
                <div className="text-[#8b6f47]">Needle: {pattern.gauge.needleSize}</div>
                <div className="text-[#8b6f47]">Yarn weight: {pattern.gauge.yarnWeight}</div>
              </div>
            </CollapsibleCard>

            {/* Measurements */}
            {pattern.measurements && Object.keys(pattern.measurements).length > 0 && (
              <CollapsibleCard title="Sizing Chart">
                <div className="overflow-x-auto -mx-1">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-[#c4a882] pb-1.5 pr-2">Size</th>
                        {Object.keys(
                          Object.values(pattern.measurements)[0] ?? {}
                        ).map((k) => (
                          <th key={k} className="text-left text-[#c4a882] pb-1.5 pr-2 capitalize">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pattern.measurements).map(([sz, m]) => (
                        <tr key={sz} className="border-t border-[#e8ddd0]">
                          <td className="py-1 pr-2 font-semibold text-[#3d2b1f]">{sz}</td>
                          {Object.values(m).map((v, i) => (
                            <td key={i} className="py-1 pr-2 text-[#8b6f47]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleCard>
            )}

            {/* Abbreviations */}
            <CollapsibleCard title="Abbreviations">
              <div className="space-y-1.5">
                {pattern.abbreviations.map((a) => (
                  <button
                    key={a.abbr}
                    onClick={() => setActiveAbbr(activeAbbr?.abbr === a.abbr ? null : a)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs font-bold text-[#8b6f47] bg-[#f0e8da] px-1.5 py-0.5 rounded shrink-0">
                        {a.abbr}
                      </span>
                      <span className="text-xs text-[#3d2b1f]">{a.meaning}</span>
                    </div>
                    {activeAbbr?.abbr === a.abbr && (
                      <div className="mt-1.5 ml-1 p-2 bg-[#f0e8da] rounded-lg text-xs text-[#8b6f47]">
                        <p className="mb-1.5">{a.meaning}</p>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(a.videoKeywords)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#d4907a] hover:underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Watch tutorial on YouTube
                        </a>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CollapsibleCard>

            <CollapsibleCard title="Quick Reference">
              <div className="space-y-3">
                {quickReference.map((group) => (
                  <div key={group.title}>
                    <h4 className="text-xs font-bold text-[#3d2b1f] mb-1">{group.title}</h4>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <div key={item.title} className="text-xs">
                          <span className="font-bold text-[#8b6f47]">{item.title}: </span>
                          <span className="text-[#6b5d52]">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleCard>

            {pattern.notes && (
              <CollapsibleCard title="Pattern Notes">
                <p className="text-sm text-[#8b6f47] leading-relaxed">{pattern.notes}</p>
              </CollapsibleCard>
            )}
          </div>

          {/* Right: Section navigator + instructions */}
          <div className="space-y-4">
            {/* Section tabs */}
            <div>
              <p className="text-xs text-[#c4a882] uppercase tracking-wide font-semibold mb-2">
                Sections
              </p>
              <div className="flex flex-wrap gap-2">
                {pattern.sections.map((sec, idx) => {
                  const secRows = sec.instructions.length;
                  const secDone = sec.instructions.filter(
                    (ins) => pattern.completedRows[sec.name]?.[ins.rowNumber]
                  ).length;
                  const isDone = secRows > 0 && secDone === secRows;
                  return (
                    <button
                      key={idx}
                      onClick={() => goToSection(idx)}
                      className={`px-3.5 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                        currentSection === idx
                          ? "bg-[#8b6f47] border-[#8b6f47] text-white"
                          : isDone
                          ? "bg-[#7a9e7e]/10 border-[#7a9e7e] text-[#7a9e7e]"
                          : "border-[#e8ddd0] text-[#8b6f47] hover:bg-[#f0e8da]"
                      }`}
                    >
                      {sec.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current section */}
            {section && (
              <div className="bg-white rounded-[16px] border border-[#e8ddd0] overflow-hidden">
                {/* Section header */}
                <div className="px-5 py-4 border-b border-[#e8ddd0] flex items-center justify-between gap-3">
                  <div>
                    <h2
                      className="text-xl font-bold text-[#3d2b1f]"
                      style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                      {section.name}
                    </h2>
                    {section.description && (
                      <p className="text-xs text-[#8b6f47] mt-0.5">{section.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-[#3d2b1f]">{progress}%</div>
                    <div className="text-xs text-[#c4a882]">{completedRows}/{totalRows} rows</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[#e8ddd0]">
                  <div
                    className="h-full bg-[#7a9e7e] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {allSectionDone && (
                  <div className="bg-[#7a9e7e]/10 border-b border-[#7a9e7e]/20 px-5 py-3 text-sm text-[#7a9e7e] font-medium text-center">
                    Section complete.{" "}
                    {currentSection < pattern.sections.length - 1 && (
                      <button
                        onClick={() => goToSection(currentSection + 1)}
                        className="underline font-semibold"
                      >
                        Continue to {pattern.sections[currentSection + 1].name}
                      </button>
                    )}
                  </div>
                )}

                {/* Instructions */}
                <div className="divide-y divide-[#e8ddd0]">
                  {section.instructions.map((ins) => {
                    const done = !!pattern.completedRows[section.name]?.[ins.rowNumber];
                    return (
                      <label
                        key={ins.rowNumber}
                        className={`flex items-start gap-3.5 px-5 py-3.5 cursor-pointer transition-colors group ${
                          done ? "bg-[#f0e8da]/50" : "hover:bg-[#faf7f2]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="stitch-check mt-0.5"
                          checked={done}
                          onChange={() => handleToggle(ins.rowNumber)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#c4a882] mr-2 shrink-0">
                            Row {ins.rowNumber}
                          </span>
                          <span
                            className={`text-sm leading-relaxed ${
                              done ? "line-through text-[#c4a882]" : "text-[#3d2b1f]"
                            }`}
                          >
                            {ins.text}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Section nav footer */}
                <div className="px-5 py-3 border-t border-[#e8ddd0] flex justify-between">
                  <button
                    onClick={() => goToSection(currentSection - 1)}
                    disabled={currentSection === 0}
                    className="text-sm text-[#8b6f47] hover:text-[#3d2b1f] disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {currentSection > 0 ? pattern.sections[currentSection - 1].name : ""}
                  </button>
                  <button
                    onClick={() => goToSection(currentSection + 1)}
                    disabled={currentSection >= pattern.sections.length - 1}
                    className="text-sm text-[#8b6f47] hover:text-[#3d2b1f] disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {currentSection < pattern.sections.length - 1
                      ? pattern.sections[currentSection + 1].name
                      : ""}{" "}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-[16px] border border-[#e8ddd0] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#faf7f2] transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-sm text-[#3d2b1f]">
          {title}
        </span>
        <span className={`text-[#c4a882] text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          v
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
