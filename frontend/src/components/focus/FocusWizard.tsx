// src/components/focus/FocusWizard.tsx
// 3-step guided wizard for creating a new Focus plan

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, BookOpen, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { WizardData, DEFAULT_WIZARD_DATA, FocusType, Tone, Difficulty, Pacing, LanguageTrack, LanguageLevel, isLanguageStep2 } from "@/types/focusWizard";

interface FocusWizardProps {
  onComplete: (data: WizardData) => Promise<void>;
  onCancel: () => void;
  isGenerating: boolean;
}

const FOCUS_TYPES = [
  { type: "language" as FocusType, icon: BookOpen, label: "Nyelvtanulás", desc: "Új nyelv elsajátítása" },
  { type: "project" as FocusType, icon: Briefcase, label: "Projekt / munka", desc: "Feladat vagy projekt" },
];

const LANGUAGES = [
  { value: "english", label: "Angol" },
  { value: "german", label: "Német" },
  { value: "spanish", label: "Spanyol" },
  { value: "italian", label: "Olasz" },
  { value: "french", label: "Francia" },
  { value: "greek", label: "Görög" },
  { value: "portuguese", label: "Portugál" },
  { value: "korean", label: "Koreai" },
  { value: "japanese", label: "Japán" },
];

const LANGUAGE_LEVELS: Array<{ value: LanguageLevel; label: string }> = [
  { value: "beginner", label: "Teljesen kezdő" },
  { value: "basic", label: "Alap szint" },
  { value: "intermediate", label: "Közép szint" },
];

const TRACKS: Array<{ value: LanguageTrack; label: string; desc: string }> = [
  { value: "foundations_language", label: "Felfedező / Alapozó", desc: "Abc, alapszókincs, első mondatok" },
  { value: "career_language", label: "Karrier", desc: "B1+ email, meeting, interjú" },
];

const MINUTES_OPTIONS = [
  { value: 10, label: "10 perc" },
  { value: 20, label: "20 perc" },
  { value: 45, label: "45 perc" },
];

const DURATIONS = [
  { days: 7, label: "7 nap" },
  { days: 14, label: "14 nap" },
  { days: 21, label: "21 nap" },
  { days: 30, label: "30 nap" },
];

const TONES = [
  { value: "casual" as Tone, label: "Laza", desc: "Barátságos, könnyed" },
  { value: "neutral" as Tone, label: "Tárgyilagos", desc: "Semleges, informatív" },
  { value: "strict" as Tone, label: "Szigorú", desc: "Határozott, követelő" },
];

const DIFFICULTIES = [
  { value: "easy" as Difficulty, label: "Könnyű" },
  { value: "normal" as Difficulty, label: "Normál" },
  { value: "hard" as Difficulty, label: "Kemény" },
];

const PACINGS = [
  { value: "small_steps" as Pacing, label: "Kicsi lépések", desc: "Rövid, gyakori feladatok" },
  { value: "big_blocks" as Pacing, label: "Nagyobb blokkok", desc: "Hosszabb, mélyebb munka" },
];

// Auto-generate goal title from language wizard selections
export const LANG_LABELS: Record<string, string> = {
  english: "Angol", german: "Német", spanish: "Spanyol", italian: "Olasz",
  french: "Francia", greek: "Görög", portuguese: "Portugál", korean: "Koreai", japanese: "Japán",
};

const TRACK_LABELS: Record<string, string> = {
  foundations_language: "Alapozó", career_language: "Karrier",
};

export function FocusWizard({ onComplete, onCancel, isGenerating }: FocusWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);

  // Step 2 language states
  const [targetLanguage, setTargetLanguage] = useState<string>("english");
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel>("beginner");
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>("foundations_language");
  const [minutesPerDay, setMinutesPerDay] = useState<number>(20);
  const [durationDays, setDurationDays] = useState<number>(7);

  // Step 2 generic states
  const [customContext, setCustomContext] = useState<string>("");

  // Step 3 advanced settings toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totalSteps = 3;

  const canProceed = () => {
    switch (step) {
      case 1: return data.step1.focusType !== null;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      // Save step 2 data
      if (data.step1.focusType === "language") {
        setData({
          ...data,
          step2: {
            targetLanguage,
            level: languageLevel,
            track: languageTrack,
            minutesPerDay: minutesPerDay as any,
            durationDays: durationDays as any,
          },
        });
      } else {
        setData({
          ...data,
          step2: {
            context: customContext,
            minutesPerDay: minutesPerDay as any,
            durationDays: durationDays as any,
          },
        });
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const handleComplete = async () => {
    // Ensure step2 data is saved (in case user didn't click next on step 2)
    let finalData = { ...data };
    if (data.step1.focusType === "language") {
      finalData.step2 = {
        targetLanguage,
        level: languageLevel,
        track: languageTrack,
        minutesPerDay: minutesPerDay as any,
        durationDays: durationDays as any,
      };
    } else {
      finalData.step2 = {
        context: customContext,
        minutesPerDay: minutesPerDay as any,
        durationDays: durationDays as any,
      };
    }
    await onComplete(finalData);
  };

  // ============================================================================
  // STEP 1: Focus Type
  // ============================================================================
  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center mb-6">Milyen fókuszt akarsz?</h2>
      <div className="grid gap-3">
        {FOCUS_TYPES.map(({ type, icon: Icon, label, desc }) => (
          <button
            key={type}
            onClick={() => setData({ ...data, step1: { focusType: type } })}
            className={`p-4 rounded-xl border transition-all duration-200 text-left flex items-center gap-4
              ${data.step1.focusType === type
                ? "neon-glow-card bg-secondary/50"
                : "bg-card/30 border-border/50 hover:border-foreground/30"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${data.step1.focusType === type ? "bg-foreground text-background" : "bg-secondary"}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ============================================================================
  // STEP 2: Settings (language or generic)
  // ============================================================================
  const renderStep2 = () => {
    if (data.step1.focusType === "language") {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-center mb-4">Nyelv beállítások</h2>

          {/* Language selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Nyelv</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTargetLanguage(value)}
                  className={`py-2.5 px-3 rounded-lg text-sm transition-all
                    ${targetLanguage === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Szint</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGE_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setLanguageLevel(value);
                    if (value === "intermediate") setLanguageTrack("career_language");
                    else if (value === "beginner") setLanguageTrack("foundations_language");
                  }}
                  className={`py-2.5 px-3 rounded-lg text-sm transition-all
                    ${languageLevel === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Track */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Tanulási mód</label>
            <div className="grid gap-2">
              {TRACKS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setLanguageTrack(value)}
                  className={`p-3 rounded-xl text-left transition-all flex items-center justify-between
                    ${languageTrack === value
                      ? "bg-foreground text-background"
                      : "bg-secondary/50 hover:bg-secondary"}`}
                >
                  <span className="font-medium text-sm">{label}</span>
                  <span className={`text-xs ${languageTrack === value ? "text-background/70" : "text-muted-foreground"}`}>
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Minutes per day + Duration in a row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Napi idő</label>
              <div className="grid gap-1.5">
                {MINUTES_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMinutesPerDay(value)}
                    className={`py-2 px-3 rounded-lg text-sm transition-all
                      ${minutesPerDay === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Időtartam</label>
              <div className="grid gap-1.5">
                {DURATIONS.map(({ days, label }) => (
                  <button
                    key={days}
                    onClick={() => setDurationDays(days)}
                    className={`py-2 px-3 rounded-lg text-sm transition-all
                      ${durationDays === days ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Generic step 2 for other focus types
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-center mb-4">Beállítások</h2>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Kontextus (opcionális)
          </label>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="Pl. már van némi tapasztalatom, de szeretném rendszerezni"
            className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50
                     focus:border-foreground/50 focus:outline-none resize-none
                     text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Napi idő</label>
            <div className="grid gap-1.5">
              {MINUTES_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMinutesPerDay(value)}
                  className={`py-2 px-3 rounded-lg text-sm transition-all
                    ${minutesPerDay === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Időtartam</label>
            <div className="grid gap-1.5">
              {DURATIONS.map(({ days, label }) => (
                <button
                  key={days}
                  onClick={() => setDurationDays(days)}
                  className={`py-2 px-3 rounded-lg text-sm transition-all
                    ${durationDays === days ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // STEP 3: Summary + Advanced settings + Launch
  // ============================================================================
  const renderStep3 = () => {
    const isLanguage = data.step1.focusType === "language";
    const langLabel = LANG_LABELS[targetLanguage] || targetLanguage;
    const levelLabel = LANGUAGE_LEVELS.find(l => l.value === languageLevel)?.label || languageLevel;
    const trackLabel = TRACK_LABELS[languageTrack] || languageTrack;

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-center mb-4">Összefoglaló</h2>

        {/* Summary card */}
        <div className="neon-glow-card bg-card/30 rounded-2xl p-5 space-y-3">
          {isLanguage ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nyelv</span>
                <span className="font-medium">{langLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Szint</span>
                <span className="font-medium">{levelLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mód</span>
                <span className="font-medium">{trackLabel}</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-sm text-muted-foreground">Projekt / munka</span>
              {customContext && (
                <p className="text-sm mt-1">{customContext}</p>
              )}
            </div>
          )}
          <div className="border-t border-border/30 pt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{durationDays} nap</span>
            <span className="text-sm text-muted-foreground">{minutesPerDay} perc/nap</span>
          </div>
        </div>

        {/* Collapsible advanced settings */}
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
          >
            <span className="text-sm text-muted-foreground">Haladó beállítások</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-3 pb-4 space-y-4 border-t border-border/30 pt-3">
              {/* Tone */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Hangnem</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TONES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setData({ ...data, step3: { ...data.step3, tone: value } })}
                      className={`py-2 px-2 rounded-lg text-xs transition-all
                        ${data.step3.tone === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Nehézség</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIFFICULTIES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setData({ ...data, step3: { ...data.step3, difficulty: value } })}
                      className={`py-2 px-2 rounded-lg text-xs transition-all
                        ${data.step3.difficulty === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Tempó</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PACINGS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setData({ ...data, step3: { ...data.step3, pacing: value } })}
                      className={`py-2 px-2 rounded-lg text-xs transition-all
                        ${data.step3.pacing === value ? "bg-foreground text-background font-medium" : "bg-secondary/50 hover:bg-secondary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-[80vh] flex flex-col px-4 md:px-6 animate-fade-in">
      {/* Progress Bar */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">{step} / {totalSteps}</span>
          <div className="w-9" />
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-4">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent">
        {step < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full py-4 px-6 rounded-xl font-semibold
                     bg-foreground text-background
                     hover:bg-foreground/90 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     flex items-center justify-center gap-2"
          >
            Tovább
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isGenerating}
            className="w-full py-4 px-6 rounded-xl font-semibold
                     bg-foreground text-background
                     hover:bg-foreground/90 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Terv generálása...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Terv létrehozása
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
