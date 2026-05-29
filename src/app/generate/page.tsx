"use client";

import React, { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { CraftType, Difficulty, WizardConfig } from "@/types";
import { GARMENT_TYPES, AVAILABLE_SIZES } from "@/types";
import type { Pattern } from "@/types";
import { GARMENT_OPTIONS, getStitchGraph } from "@/lib/craftKnowledge";
import { createProjectChartsFromPattern } from "@/lib/chartFactory";
import { inferChartPalette, designTextFromParts } from "@/lib/designIntent";
import { imagePreviewToChart, type ImportedChart } from "@/lib/imageChart";
import { Check, Sparkles, Upload, PenLine, Camera, Plus, Trash2, Grid2X2 } from "lucide-react";

function GarmentIcon({ type, className = "w-10 h-10" }: { type: string; className?: string }) {
  const c = "currentColor";
  const sw = "1.8";
  const fill = "currentColor";
  const fo = "0.13";
  switch (type) {
    case "Sweater": case "Pullover":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M28 10 Q30 22 40 22 Q50 22 52 10 L65 15 L74 42 L60 42 L60 68 L20 68 L20 42 L6 42 L15 15 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M28 10 Q30 22 40 22 Q50 22 52 10" stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round"/></svg>;
    case "Cardigan":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M28 10 L15 15 L6 42 L20 42 L20 68 L39 68 L39 22" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M52 10 L65 15 L74 42 L60 42 L60 68 L41 68 L41 22" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M28 10 Q30 22 40 22 Q50 22 52 10" stroke={c} strokeWidth={sw} fill="none"/><line x1="40" y1="22" x2="40" y2="68" stroke={c} strokeWidth="1.5" strokeDasharray="3 2"/></svg>;
    case "Hat / Beanie":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M18 54 C18 32 62 32 62 54 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><rect x="14" y="52" width="52" height="10" rx="5" fill={fill} fillOpacity="0.2" stroke={c} strokeWidth={sw}/><path d="M24 54 L24 62 M32 54 L32 62 M40 54 L40 62 M48 54 L48 62 M56 54 L56 62" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>;
    case "Scarf":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="28" y="6" width="24" height="60" rx="12" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><line x1="28" y1="20" x2="52" y2="20" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="28" y1="32" x2="52" y2="32" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="28" y1="44" x2="52" y2="44" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="28" y1="56" x2="52" y2="56" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/></svg>;
    case "Cowl":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><ellipse cx="40" cy="36" rx="28" ry="22" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><ellipse cx="40" cy="36" rx="16" ry="12" fill="white" stroke={c} strokeWidth={sw}/></svg>;
    case "Mittens":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M20 60 L20 28 Q20 14 30 14 Q40 14 40 28 L40 60 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M40 34 Q44 26 50 28 Q56 30 50 38 L40 42" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><line x1="52" y1="14" x2="60" y2="14" stroke="none"/><path d="M46 60 L46 28 Q46 14 56 14 Q66 14 66 28 L66 60 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Gloves":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M22 64 L22 36 Q22 26 28 26 Q30 26 31 30 L31 14 Q31 10 34 10 Q37 10 37 14 L37 24 Q38 20 41 20 Q44 20 44 24 L44 26 Q45 22 48 22 Q51 22 51 26 L51 36 Q56 30 58 32 Q62 38 56 44 L51 52 L51 64 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Socks":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M30 8 L30 44 Q30 60 50 60 Q66 60 66 46 Q66 38 54 38 L50 38 L50 8 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><line x1="30" y1="18" x2="50" y2="18" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/></svg>;
    case "Shawl":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M40 12 L8 62 L72 62 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><line x1="40" y1="12" x2="40" y2="62" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><path d="M22 44 Q40 52 58 44" fill="none" stroke={c} strokeWidth="1.2"/></svg>;
    case "Vest":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M26 10 Q28 20 40 20 Q52 20 54 10 L64 20 L60 68 L20 68 L16 20 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/><path d="M26 10 Q28 20 40 20 Q52 20 54 10" stroke={c} strokeWidth={sw} fill="none"/></svg>;
    case "Tank Top":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M28 8 L20 20 L26 20 L26 68 L54 68 L54 20 L60 20 L52 8 Q50 18 40 18 Q30 18 28 8 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "Tote Bag":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="14" y="24" width="52" height="44" rx="4" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><path d="M28 24 Q28 10 40 10 Q52 10 52 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "Dishcloth":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="10" y="10" width="60" height="52" rx="4" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><line x1="10" y1="23" x2="70" y2="23" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="10" y1="36" x2="70" y2="36" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="10" y1="49" x2="70" y2="49" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/></svg>;
    case "Baby Blanket": case "Throw Blanket":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="8" y="8" width="64" height="56" rx="6" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><path d="M8 20 L72 20 M8 32 L72 32 M8 44 L72 44 M8 56 L72 56" stroke={c} strokeWidth="1" strokeDasharray="4 3"/><path d="M20 8 L20 64 M32 8 L32 64 M44 8 L44 64 M56 8 L56 64" stroke={c} strokeWidth="1" strokeDasharray="4 3"/></svg>;
    case "Headband":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M14 28 Q14 12 40 12 Q66 12 66 28 L66 44 Q66 60 40 60 Q14 60 14 44 Z" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><path d="M14 28 Q14 44 40 44 Q66 44 66 28" fill="white" stroke={c} strokeWidth={sw}/></svg>;
    case "Leg Warmers":
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="12" y="8" width="24" height="56" rx="12" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><rect x="44" y="8" width="24" height="56" rx="12" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw}/><line x1="12" y1="20" x2="36" y2="20" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/><line x1="44" y1="20" x2="68" y2="20" stroke={c} strokeWidth="1.2" strokeDasharray="3 2"/></svg>;
    default:
      return <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><rect x="14" y="14" width="52" height="44" rx="8" fill={fill} fillOpacity={fo} stroke={c} strokeWidth={sw} strokeDasharray="5 3"/><text x="40" y="42" textAnchor="middle" fontSize="22" fill={c} fontFamily="serif">?</text></svg>;
  }
}

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Simple stitches, minimal shaping" },
  { value: "intermediate", label: "Intermediate", desc: "Some shaping and technique variety" },
  { value: "advanced", label: "Advanced", desc: "Complex techniques and construction" },
  { value: "expert", label: "Expert", desc: "Intricate lace, cables, or colourwork" },
];

const DEFAULT_PALETTE = [
  "#f5ede0", "#8b6347", "#c9785c", "#6a9470",
  "#9e7a8a", "#2e1f14", "#c4a07e", "#6e88a8",
  "#e8c46a", "#ffffff",
];

const initialConfig: WizardConfig = {
  startingPoint: null,
  imageFile: null,
  imagePreview: null,
  textDescription: "",
  craftType: "knitting",
  garmentType: "Sweater",
  sizes: ["M"],
  difficulty: "intermediate",
  extraNotes: "",
  includeRibbing: false,
  styleOption: "crew-neck pullover",
  stitchPreference: "knit",
  selectedColors: [...DEFAULT_PALETTE],
};

function designTextForConfig(config: WizardConfig): string {
  return designTextFromParts([
    config.textDescription,
    config.extraNotes,
    config.styleOption,
    config.garmentType,
    config.stitchPreference,
  ]);
}

export default function GeneratePage() {
  const router = useRouter();
  const { savePattern, saveChart } = useStore();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setConfig((c) => ({
        ...c,
        imageFile: file,
        imagePreview: preview,
        startingPoint: c.startingPoint === "chart" ? "chart" : "image",
      }));
      imagePreviewToChart(preview, { maxWidth: 36, maxHeight: 48, maxColors: 8 })
        .then((chart) => {
          setConfig((c) => c.imagePreview === preview ? { ...c, selectedColors: chart.colors } : c);
        })
        .catch(() => {
          // Keep the existing palette if the browser cannot decode this image.
        });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      let imageBase64: string | undefined;
      let importedChart: ImportedChart | undefined;
      if (config.imagePreview && (config.startingPoint === "image" || config.startingPoint === "chart")) {
        const chartFromImage = await imagePreviewToChart(config.imagePreview, {
          maxWidth: config.startingPoint === "chart" ? 90 : 72,
          maxHeight: config.startingPoint === "chart" ? 120 : 96,
          maxColors: Math.max(1, config.selectedColors.length || 8),
        });
        importedChart = {
          ...chartFromImage,
          colors: config.selectedColors.length ? config.selectedColors : chartFromImage.colors,
        };
      }
      if (config.startingPoint === "image" && config.imageFile && config.imagePreview) {
        imageBase64 = config.imagePreview.split(",")[1];
      }

      const res = await fetch("/api/generate-pattern", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craftType: config.craftType,
          garmentType: config.garmentType,
          sizes: config.sizes,
          difficulty: config.difficulty,
          extraNotes: [
            config.extraNotes,
            config.styleOption ? `Style option: ${config.styleOption}.` : "",
            config.stitchPreference ? `Preferred main stitch or fabric: ${config.stitchPreference}. Explain how this changes the finished fabric.` : "",
            config.includeRibbing
              ? "Include ribbing where structurally useful, such as hems, cuffs, collars, button bands, and pocket tops."
              : "Skip decorative ribbing unless the construction truly requires it.",
          ].filter(Boolean).join(" "),
          imageBase64,
          textDescription: config.textDescription || (config.startingPoint === "chart" ? `Imported chart for ${config.garmentType}` : undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");

      const pattern = data.pattern as Pattern;
      pattern.sourceDescription = [
        pattern.sourceDescription,
        config.textDescription,
        config.styleOption,
        config.stitchPreference,
        config.extraNotes,
      ].filter(Boolean).join(" ");
      if (config.imagePreview) {
        pattern.sourceImagePreview = config.imagePreview;
      }
      const generatedCharts = createProjectChartsFromPattern(pattern, {
        includeRibbing: config.includeRibbing,
        colors: config.selectedColors,
        importedChart,
      });
      pattern.projectId = generatedCharts[0]?.projectId;
      const firstActualChart = generatedCharts.find((c) => c.sectionRole === "chart");
      pattern.firstChartId = generatedCharts[0]?.id;
      pattern.previewImage = firstActualChart?.thumbnail ?? pattern.previewImage;
      savePattern(pattern);
      generatedCharts.forEach(saveChart);
      router.push(pattern.firstChartId ? `/chart/${pattern.firstChartId}` : `/pattern/${pattern.id}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Generation timed out after 35 seconds. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
    }
  }, [config, savePattern, saveChart, router]);

  const canProceedStep1 =
    config.startingPoint === "image" || config.startingPoint === "chart"
      ? !!config.imageFile
      : config.textDescription.trim().length > 10;

  const canProceedStep2 = !!config.garmentType;
  const canProceedStep3 = config.sizes.length > 0;

  const TOTAL_STEPS = 6;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold text-[#3d2b1f] mb-2"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Create Your Pattern
          </h1>
          <p className="text-[#8b6f47]">
            Answer a few questions and we&rsquo;ll generate a complete pattern just for you.
          </p>
        </div>

        {/* Step progress */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        <div className="bg-white rounded-[16px] border border-[#e8ddd0] shadow-sm p-6 sm:p-8 mt-6 fade-in">
          {step === 1 && (
            <Step1
              config={config}
              setConfig={setConfig}
              fileInputRef={fileInputRef}
              handleImageUpload={handleImageUpload}
            />
          )}
          {step === 2 && (
            <Step2 config={config} setConfig={setConfig} />
          )}
          {step === 3 && (
            <Step3 config={config} setConfig={setConfig} />
          )}
          {step === 4 && (
            <Step4 config={config} setConfig={setConfig} />
          )}
          {step === 5 && (
            <Step5Colors config={config} setConfig={setConfig} />
          )}
          {step === 6 && (
            <Step6Generate config={config} loading={loading} error={error} />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#e8ddd0]">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={`px-5 py-2.5 rounded-[10px] border border-[#e8ddd0] text-[#8b6f47] font-medium text-sm hover:bg-[#f0e8da] transition-colors ${
                step === 1 ? "invisible" : ""
              }`}
            >
              Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => {
                  if (step === 4) {
                    setConfig((c) => c.startingPoint === "text"
                      ? { ...c, selectedColors: inferChartPalette(designTextForConfig(c)) }
                      : c
                    );
                  }
                  setStep((s) => s + 1);
                }}
                disabled={step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : step === 3 ? !canProceedStep3 : false}
                className="px-6 py-2.5 rounded-[10px] bg-[#8b6f47] hover:bg-[#6b5344] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2.5 rounded-[10px] bg-[#8b6f47] hover:bg-[#6b5344] disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingDots /> Generating...
                  </>
                ) : (
                  <><Sparkles size={14} /> Generate Pattern</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Start", "Garment", "Fabric", "Details", "Colours", "Generate"];
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-[#7a9e7e] text-white"
                    : active
                    ? "bg-[#8b6f47] text-white"
                    : "bg-[#e8ddd0] text-[#c4a882]"
                }`}
              >
                {done ? <Check size={15} /> : n}
              </div>
              <span className={`text-xs hidden sm:block ${active ? "text-[#8b6f47] font-semibold" : "text-[#c4a882]"}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-4 ${done ? "bg-[#7a9e7e]" : "bg-[#e8ddd0]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1({
  config,
  setConfig,
  fileInputRef,
  handleImageUpload,
}: {
  config: WizardConfig;
  setConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <h2
        className="text-2xl font-bold text-[#3d2b1f] mb-1"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        What&rsquo;s your starting point?
      </h2>
      <p className="text-sm text-[#8b6f47] mb-6">
        Upload a photo, import an existing chart, or tell us in your own words.
      </p>

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <OptionCard
          selected={config.startingPoint === "image"}
          onClick={() => setConfig((c) => ({ ...c, startingPoint: "image" }))}
          icon={<Camera size={22} />}
          title="Image to chart"
          desc="Turn a photo or sketch into chart cells"
        />
        <OptionCard
          selected={config.startingPoint === "chart"}
          onClick={() => setConfig((c) => ({ ...c, startingPoint: "chart" }))}
          icon={<Grid2X2 size={22} />}
          title="Import chart"
          desc="Upload your own chart and track it"
        />
        <OptionCard
          selected={config.startingPoint === "text"}
          onClick={() => setConfig((c) => ({ ...c, startingPoint: "text", imageFile: null, imagePreview: null }))}
          icon={<PenLine size={22} />}
          title="Describe it"
          desc="Tell us what you want in plain language"
        />
      </div>

      {/* Image upload */}
      {(config.startingPoint === "image" || config.startingPoint === "chart") && (
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {config.imagePreview ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.imagePreview}
                alt={config.startingPoint === "chart" ? "Imported chart" : "Uploaded inspiration"}
                className="w-full max-h-56 object-cover rounded-xl border border-[#e8ddd0]"
              />
              <button
                onClick={() => {
                  setConfig((c) => ({ ...c, imageFile: null, imagePreview: null }));
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white text-[#8b6f47] rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow transition-colors"
              >
                x
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#c4a882] rounded-xl p-8 text-center hover:bg-[#f0e8da] transition-colors group"
            >
              <div className="flex justify-center mb-2 text-[#c4a882]"><Upload size={28} /></div>
              <p className="text-[#8b6f47] font-medium text-sm">
                {config.startingPoint === "chart" ? "Click to import a chart image" : "Click to upload a photo"}
              </p>
              <p className="text-[#c4a882] text-xs mt-1">JPG, PNG, WEBP up to 10MB</p>
            </button>
          )}
          <p className="mt-2 text-xs text-[#8b6f47]">
            {config.startingPoint === "chart"
              ? "The uploaded chart is converted locally into stitches, colours, shopping list, and tracker steps."
              : "The uploaded image is converted locally into chart stitches, then fitted onto the garment sections."}
          </p>
        </div>
      )}

      {/* Text description */}
      {config.startingPoint === "text" && (
        <div>
          <textarea
            value={config.textDescription}
            onChange={(e) => setConfig((c) => ({ ...c, textDescription: e.target.value }))}
            placeholder="e.g. A cosy oversized ribbed sweater with a relaxed neckline, slightly cropped, in a warm neutral colour. Perfect for autumn days..."
            rows={5}
            className="w-full border border-[#e8ddd0] rounded-xl px-4 py-3 text-sm text-[#3d2b1f] placeholder:text-[#c4a882] focus:outline-none focus:border-[#8b6f47] resize-none bg-[#faf7f2]"
          />
          <p className="text-xs text-[#c4a882] mt-1.5">
            {config.textDescription.length < 10
              ? `${10 - config.textDescription.length} more characters needed`
              : "Looking good."}
          </p>
        </div>
      )}
    </div>
  );
}

function Step2({
  config,
  setConfig,
}: {
  config: WizardConfig;
  setConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
}) {
  const styleOptions = GARMENT_OPTIONS[config.garmentType] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-[#3d2b1f] mb-1"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Choose the garment
        </h2>
        <p className="text-sm text-[#8b6f47]">Pick the craft, garment family, and construction style first.</p>
      </div>

      {/* Craft type */}
      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Craft Type</label>
        <div className="flex gap-3">
          {(["knitting", "crocheting"] as CraftType[]).map((ct) => (
            <button
              key={ct}
              onClick={() => setConfig((c) => ({ ...c, craftType: ct, stitchPreference: getStitchGraph(ct)[0]?.id ?? "" }))}
              className={`flex-1 py-2.5 rounded-[10px] border text-sm font-medium capitalize transition-colors ${
                config.craftType === ct
                  ? "bg-[#8b6f47] border-[#8b6f47] text-white"
                  : "border-[#e8ddd0] text-[#8b6f47] hover:bg-[#f0e8da]"
              }`}
            >
              {ct === "knitting" ? "Knitting" : "Crocheting"}
            </button>
          ))}
        </div>
      </div>

      {/* Garment type */}
      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Garment Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {GARMENT_TYPES.map((g) => (
            <button
              key={g}
              onClick={() => setConfig((c) => ({ ...c, garmentType: g, styleOption: GARMENT_OPTIONS[g]?.[0] ?? "" }))}
              className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 text-center transition-all ${
                config.garmentType === g
                  ? "border-[#8b6f47] bg-[#f0e8da]"
                  : "border-[#e8ddd0] hover:border-[#c4a882] hover:bg-[#faf7f2]"
              }`}
            >
              <div className={`${config.garmentType === g ? "text-[#8b6f47]" : "text-[#c4a882]"}`}>
                <GarmentIcon type={g} className="w-9 h-9" />
              </div>
              <span className="text-[10px] font-semibold text-[#3d2b1f] leading-tight">{g}</span>
            </button>
          ))}
        </div>
      </div>

      {styleOptions.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Garment style</label>
          <p className="text-xs text-[#8b6f47] mb-2">Choose the silhouette and construction for your {config.garmentType.toLowerCase()}.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {styleOptions.map((option) => (
              <button
                key={option}
                onClick={() => setConfig((c) => ({ ...c, styleOption: option }))}
                className={`text-left px-3 py-2.5 rounded-[10px] border-2 transition-colors ${
                  config.styleOption === option
                    ? "bg-[#fff0bf] border-[#8b6f47] text-[#251a1c]"
                    : "border-[#e8ddd0] text-[#8b6f47] hover:bg-[#f0e8da] hover:border-[#c4a882]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 border-2 ${config.styleOption === option ? "bg-[#8b6f47] border-[#8b6f47]" : "border-[#c4a882]"}`} />
                  <span className="text-xs font-semibold leading-snug">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step3({
  config,
  setConfig,
}: {
  config: WizardConfig;
  setConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
}) {
  const stitchGraph = getStitchGraph(config.craftType);

  const toggleSize = (size: string) => {
    setConfig((c) => ({
      ...c,
      sizes: c.sizes.includes(size)
        ? c.sizes.filter((s) => s !== size)
        : [...c.sizes, size],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-[#3d2b1f] mb-1"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Size and fabric
        </h2>
        <p className="text-sm text-[#8b6f47]">Choose sizing, skill level, stitch feel, and ribbing.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">
          Sizes <span className="font-normal text-[#8b6f47]">(select all you need)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SIZES.map((sz) => (
            <button
              key={sz}
              onClick={() => toggleSize(sz)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                config.sizes.includes(sz)
                  ? "bg-[#8b6f47] border-[#8b6f47] text-white"
                  : "border-[#e8ddd0] text-[#8b6f47] hover:bg-[#f0e8da]"
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
        {config.sizes.length === 0 && (
          <p className="text-xs text-[#d4907a] mt-1.5">Please select at least one size.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Difficulty</label>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setConfig((c) => ({ ...c, difficulty: d.value }))}
              className={`text-left px-4 py-3 rounded-[10px] border transition-colors ${
                config.difficulty === d.value
                  ? "border-[#8b6f47] bg-[#f0e8da]"
                  : "border-[#e8ddd0] hover:bg-[#f0e8da]"
              }`}
            >
              <div className="text-sm font-semibold text-[#3d2b1f]">{d.label}</div>
              <div className="text-xs text-[#8b6f47] mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Main stitch feel</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stitchGraph.slice(0, 6).map((stitch) => (
            <button
              key={stitch.id}
              onClick={() => setConfig((c) => ({ ...c, stitchPreference: stitch.id }))}
              className={`text-left overflow-hidden rounded-[10px] border transition-colors ${
                config.stitchPreference === stitch.id
                  ? "bg-[#fff0bf] border-[#251a1c]"
                  : "border-[#e8ddd0] hover:bg-[#f0e8da]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stitch.imageUrl} alt={stitch.name} className="h-24 w-full object-contain bg-[#fffaf0] p-2" />
              <span className="block px-3 py-2">
                <span className="block text-xs font-bold text-[#3d2b1f]">{stitch.name}</span>
                <span className="block text-[10px] leading-snug text-[#8b6f47]">{stitch.appearance}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e8ddd0] bg-[#f0e8da] px-4 py-3 cursor-pointer">
        <div>
          <div className="text-sm font-semibold text-[#3d2b1f]">Add ribbing where it belongs</div>
          <div className="text-xs text-[#8b6f47]">Hems, cuffs, collars, button bands, brim edges, and pocket tops when applicable.</div>
        </div>
        <input
          type="checkbox"
          checked={config.includeRibbing}
          onChange={(e) => setConfig((c) => ({ ...c, includeRibbing: e.target.checked }))}
          className="h-5 w-5 shrink-0 accent-[#4fae68]"
        />
      </label>
    </div>
  );
}

function Step4({
  config,
  setConfig,
}: {
  config: WizardConfig;
  setConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-[#3d2b1f] mb-1"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Design details
        </h2>
        <p className="text-sm text-[#8b6f47]">Tell the chart maker what should appear on the project.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">
          Extra notes for the chart and pattern <span className="font-normal text-[#8b6f47]">(optional)</span>
        </label>
        <textarea
          value={config.extraNotes}
          onChange={(e) => setConfig((c) => ({ ...c, extraNotes: e.target.value }))}
          placeholder="e.g. large red heart on the back, blue checker sleeves, flower pockets, shawl collar, no ribbing on the hem..."
          rows={6}
          className="w-full border border-[#e8ddd0] rounded-xl px-4 py-3 text-sm text-[#3d2b1f] placeholder:text-[#c4a882] focus:outline-none focus:border-[#8b6f47] resize-none bg-[#faf7f2]"
        />
        <p className="text-xs text-[#8b6f47] mt-2">
          Words like stripes, flowers, hearts, stars, checker, waves, red, blue, green, cream, pockets, collar, and buttons now affect the generated chart.
        </p>
      </div>
    </div>
  );
}

function Step5Colors({
  config,
  setConfig,
}: {
  config: WizardConfig;
  setConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
}) {
  const updateColor = (idx: number, value: string) => {
    setConfig((c) => {
      const next = [...c.selectedColors];
      next[idx] = value;
      return { ...c, selectedColors: next };
    });
  };

  const addColor = () => {
    setConfig((c) => ({ ...c, selectedColors: [...c.selectedColors, "#ffffff"].slice(0, 10) }));
  };

  const deleteColor = (idx: number) => {
    setConfig((c) => {
      if (c.selectedColors.length <= 1) return c;
      return { ...c, selectedColors: c.selectedColors.filter((_, index) => index !== idx) };
    });
  };

  const colorLabels = [
    "Background / main colour",
    "Primary contrast",
    "Second contrast",
    "Third contrast",
    "Fourth contrast",
    "Dark accent",
    "Light neutral",
    "Cool accent",
    "Warm accent",
    "Light accent",
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-2xl font-bold text-[#3d2b1f] mb-1"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Choose your colours
        </h2>
        <p className="text-sm text-[#8b6f47]">
          These were suggested from your description. Colour 1 is the background; the rest are used for the chart motifs. Change, add, or delete colours before generating.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {config.selectedColors.map((color, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#e8ddd0] hover:border-[#c4a882] transition-colors"
          >
            <label className="cursor-pointer shrink-0">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(idx, e.target.value)}
                className="sr-only"
              />
              <div
                className="w-10 h-10 rounded-lg border-2 border-[#251a1c]/20 shadow-sm"
                style={{ backgroundColor: color }}
              />
            </label>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#3d2b1f]">{colorLabels[idx] ?? `Colour ${idx + 1}`}</div>
              <div className="text-[11px] font-mono text-[#8b6f47] mt-0.5">{color}</div>
            </div>
            <button
              type="button"
              onClick={() => deleteColor(idx)}
              disabled={config.selectedColors.length <= 1}
              className="ml-auto rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] p-1.5 text-[#8b6f47] disabled:opacity-30"
              aria-label={`Delete colour ${idx + 1}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addColor}
        disabled={config.selectedColors.length >= 10}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-[#251a1c] bg-[#fffaf0] px-4 py-2 text-xs font-black text-[#251a1c] disabled:opacity-40"
      >
        <Plus size={14} /> Add colour
      </button>

      <p className="text-xs text-[#8b6f47] bg-[#f0e8da] rounded-xl px-4 py-3">
        These colours replace the default palette in every chart section of your project. You can always repaint individual cells in the chart editor afterward.
      </p>
    </div>
  );
}

function Step6Generate({
  config,
  loading,
  error,
}: {
  config: WizardConfig;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h2
        className="text-2xl font-bold text-[#3d2b1f] mb-1"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Ready to generate!
      </h2>
      <p className="text-sm text-[#8b6f47] mb-6">Here&rsquo;s what we&rsquo;re working with:</p>

      {/* Summary */}
      <div className="bg-[#f0e8da] rounded-xl p-5 space-y-2.5 mb-6">
        <SummaryRow
          label="Starting point"
          value={
            config.startingPoint === "image"
              ? "Uploaded image"
              : config.startingPoint === "chart"
                ? "Imported chart"
                : `"${config.textDescription.slice(0, 60)}${config.textDescription.length > 60 ? "..." : ""}"`
          }
        />
        <SummaryRow label="Craft" value={config.craftType === "knitting" ? "Knitting" : "Crocheting"} />
        <SummaryRow label="Garment" value={config.garmentType} />
        {config.styleOption && <SummaryRow label="Style" value={config.styleOption} />}
        <SummaryRow label="Sizes" value={config.sizes.join(", ")} />
        <SummaryRow label="Difficulty" value={config.difficulty} />
        <SummaryRow label="Ribbing" value={config.includeRibbing ? "Add where useful" : "Skip unless required"} />
        {config.stitchPreference && <SummaryRow label="Main stitch" value={config.stitchPreference} />}
        {config.extraNotes && <SummaryRow label="Notes" value={config.extraNotes} />}
        <div className="flex items-start gap-3">
          <span className="text-xs text-[#c4a882] font-semibold w-24 shrink-0 pt-1 uppercase tracking-wide">Colours</span>
          <div className="flex gap-1.5 flex-wrap">
            {config.selectedColors.map((col, i) => (
              <div key={i} className="w-5 h-5 rounded border border-[#251a1c]/20" style={{ backgroundColor: col }} title={col} />
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="flex justify-center gap-2 mb-4">
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
          </div>
          <p className="text-[#8b6f47] font-medium">Crafting your pattern...</p>
          <p className="text-xs text-[#c4a882] mt-1">This usually takes 10-25 seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <p className="text-sm text-[#8b6f47] text-center">
          Click <strong>Generate Pattern</strong> below and we will build a complete pattern for you.
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-[#c4a882] font-semibold w-24 shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-[#3d2b1f]">{value}</span>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-xl border-2 transition-all ${
        selected
          ? "border-[#8b6f47] bg-[#f0e8da]"
          : "border-[#e8ddd0] hover:border-[#c4a882] hover:bg-[#faf7f2]"
      }`}
    >
      <div className="mb-2 text-[#8b6f47]">{icon}</div>
      <div className="font-semibold text-[#3d2b1f] text-sm">{title}</div>
      <div className="text-xs text-[#8b6f47] mt-0.5">{desc}</div>
    </button>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-0.5">
      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
    </span>
  );
}
