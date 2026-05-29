"use client";

import React, { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { CraftType, Difficulty, WizardConfig } from "@/types";
import { GARMENT_TYPES, AVAILABLE_SIZES } from "@/types";
import type { Pattern } from "@/types";
import { GARMENT_OPTIONS, getStitchGraph } from "@/lib/craftKnowledge";
import { createProjectChartsFromPattern } from "@/lib/chartFactory";
import { Check, Sparkles, Upload, PenLine, Camera } from "lucide-react";

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Simple stitches, minimal shaping" },
  { value: "intermediate", label: "Intermediate", desc: "Some shaping and technique variety" },
  { value: "advanced", label: "Advanced", desc: "Complex techniques and construction" },
  { value: "expert", label: "Expert", desc: "Intricate lace, cables, or colourwork" },
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
  includeRibbing: true,
  styleOption: "crew-neck pullover",
  stitchPreference: "knit",
};

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
      setConfig((c) => ({
        ...c,
        imageFile: file,
        imagePreview: reader.result as string,
        startingPoint: "image",
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let imageBase64: string | undefined;
      if (config.imageFile && config.imagePreview) {
        // strip data:...;base64, prefix
        imageBase64 = config.imagePreview.split(",")[1];
      }

      const res = await fetch("/api/generate-pattern", {
        method: "POST",
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
          textDescription: config.textDescription || undefined,
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
      const generatedCharts = createProjectChartsFromPattern(pattern, { includeRibbing: config.includeRibbing });
      pattern.projectId = generatedCharts[0]?.projectId;
      pattern.firstChartId = generatedCharts[0]?.id;
      pattern.previewImage = generatedCharts.find((chart) => chart.sectionRole === "chart")?.thumbnail ?? pattern.previewImage;
      savePattern(pattern);
      generatedCharts.forEach(saveChart);
      router.push(pattern.firstChartId ? `/chart/${pattern.firstChartId}` : `/pattern/${pattern.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [config, savePattern, saveChart, router]);

  const canProceedStep1 =
    config.startingPoint === "image"
      ? !!config.imageFile
      : config.textDescription.trim().length > 10;

  const canProceedStep2 = !!config.garmentType;
  const canProceedStep3 = config.sizes.length > 0;

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
        <StepIndicator current={step} total={5} />

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
            <Step5 config={config} loading={loading} error={error} />
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

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
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
  const labels = ["Start", "Garment", "Fabric", "Details", "Generate"];
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
        Upload a photo for inspiration, or tell us in your own words.
      </p>

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <OptionCard
          selected={config.startingPoint === "image"}
          onClick={() => setConfig((c) => ({ ...c, startingPoint: "image" }))}
          icon={<Camera size={22} />}
          title="Upload an image"
          desc="Photo of a garment, sketch, or inspiration"
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
      {config.startingPoint === "image" && (
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
                alt="Uploaded inspiration"
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
                Click to upload a photo
              </p>
              <p className="text-[#c4a882] text-xs mt-1">JPG, PNG, WEBP up to 10MB</p>
            </button>
          )}
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
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all ${
                config.garmentType === g
                  ? "border-[#8b6f47] bg-[#f0e8da]"
                  : "border-[#e8ddd0] hover:border-[#c4a882] hover:bg-[#faf7f2]"
              }`}
            >
              <span className="text-xs font-medium text-[#3d2b1f] leading-tight">{g}</span>
            </button>
          ))}
        </div>
      </div>

      {styleOptions.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-[#3d2b1f] mb-2">Garment style</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {styleOptions.map((option) => (
              <button
                key={option}
                onClick={() => setConfig((c) => ({ ...c, styleOption: option }))}
                className={`text-left px-3 py-2 rounded-[10px] border text-xs font-semibold transition-colors ${
                  config.styleOption === option
                    ? "bg-[#fff0bf] border-[#251a1c] text-[#251a1c]"
                    : "border-[#e8ddd0] text-[#8b6f47] hover:bg-[#f0e8da]"
                }`}
              >
                {option}
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

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e8ddd0] bg-[#f0e8da] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[#3d2b1f]">Add ribbing where it belongs</div>
          <div className="text-xs text-[#8b6f47]">Hems, cuffs, collars, button bands, brim edges, and pocket tops when applicable.</div>
        </div>
        <button
          onClick={() => setConfig((c) => ({ ...c, includeRibbing: !c.includeRibbing }))}
          className={`w-12 h-7 rounded-full border-2 border-[#251a1c] p-0.5 transition-colors ${
            config.includeRibbing ? "bg-[#4fae68]" : "bg-[#fffaf0]"
          }`}
          aria-pressed={config.includeRibbing}
          aria-label="Toggle ribbing"
        >
          <span
            className={`block w-5 h-5 rounded-full bg-[#fffaf0] border-2 border-[#251a1c] transition-transform ${
              config.includeRibbing ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
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

function Step5({
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
        <SummaryRow label="Starting point" value={config.startingPoint === "image" ? "Uploaded image" : `"${config.textDescription.slice(0, 60)}${config.textDescription.length > 60 ? "..." : ""}"`} />
        <SummaryRow label="Craft" value={config.craftType === "knitting" ? "Knitting" : "Crocheting"} />
        <SummaryRow label="Garment" value={config.garmentType} />
        {config.styleOption && <SummaryRow label="Style" value={config.styleOption} />}
        <SummaryRow label="Sizes" value={config.sizes.join(", ")} />
        <SummaryRow label="Difficulty" value={config.difficulty} />
        <SummaryRow label="Ribbing" value={config.includeRibbing ? "Add where useful" : "Skip unless required"} />
        {config.stitchPreference && <SummaryRow label="Main stitch" value={config.stitchPreference} />}
        {config.extraNotes && <SummaryRow label="Notes" value={config.extraNotes} />}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="flex justify-center gap-2 mb-4">
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
            <span className="loading-dot w-3 h-3 rounded-full bg-[#8b6f47]" />
          </div>
          <p className="text-[#8b6f47] font-medium">Crafting your pattern...</p>
          <p className="text-xs text-[#c4a882] mt-1">This can take 15-30 seconds</p>
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
