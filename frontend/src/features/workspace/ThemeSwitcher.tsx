import { useShellTheme, type ShellTheme } from "@/context/ShellThemeContext";
import { useTranslation } from "@/hooks/useTranslation";

const THEMES: { id: ShellTheme; labelEn: string; labelHu: string; swatch: string }[] = [
  { id: "cloud", labelEn: "Cloud", labelHu: "Felhő", swatch: "linear-gradient(120deg,#f7f0f5,#d8daf7)" },
  { id: "graphite", labelEn: "Graphite", labelHu: "Grafit", swatch: "linear-gradient(120deg,#1a1d29,#2f3450)" },
  { id: "olive", labelEn: "Olive Studio", labelHu: "Olive Studio", swatch: "linear-gradient(120deg,#242a21,#6e7757)" },
];

interface Props {
  compact?: boolean;
}

export function ThemeSwitcher({ compact = false }: Props) {
  const { theme, setTheme } = useShellTheme();
  const { lang } = useTranslation();
  const label = lang === "hu" ? "Téma" : "Theme";

  return (
    <div className="space-y-2">
      {!compact && <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--shell-muted)]">{label}</p>}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1.5">
        {THEMES.map((item) => (
          <button
            key={item.id}
            onClick={() => setTheme(item.id)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition shell-interactive ${
              theme === item.id
                ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-[var(--shell-muted)] hover:text-[var(--shell-text)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ background: item.swatch }} />
              {lang === "hu" ? item.labelHu : item.labelEn}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

