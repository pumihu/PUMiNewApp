// src/lib/smartPlanGenerator.ts
// Generates lightweight day-title plans for the smart_learning domain.
// Each day gets a short, casual, Gen-Z friendly title — no lesson content.

import type { SmartLearningCategory } from "@/types/focusWizard";
import { pumiInvoke } from "@/lib/pumiInvoke";

// ============================================================================
// Types
// ============================================================================

export interface SmartPlan {
  category: SmartLearningCategory;
  titles: string[]; // one per day
}

// ============================================================================
// Hardcoded fallback templates (21 titles per category)
// ============================================================================

const TEMPLATES: Record<SmartLearningCategory, string[]> = {
  financial_basics: [
    "Mi az a nettó pénz?",
    "20% fejben számolás",
    "Előfizetés csapdák",
    "Spórolás vs. befektetés",
    "Mi az az infláció?",
    "Bankszámla típusok",
    "Hitelkártya 101",
    "Első megtakarítás terv",
    "Adó alapok egyszerűen",
    "Mit jelent a kamatláb?",
    "Impulzusvásárlás hack-ek",
    "50/30/20 szabály",
    "Crypto röviden",
    "Mibe fektess kicsiben?",
    "Biztosítás: kell vagy sem?",
    "Albérlet pénzügyek",
    "Fizetésemelés kérése",
    "Pénzügyi vészhelyzet terv",
    "Online fizetés biztonság",
    "Előfizetés audit nap",
    "Heti pénzügyi rutin",
  ],
  digital_literacy: [
    "Jelszó-higiénia",
    "Phishing felismerés",
    "AI promptolás alapok",
    "VPN: kell vagy hype?",
    "Cookie-k és tracking",
    "Kétfaktoros hitelesítés",
    "Deepfake felismerés",
    "Cloud tárolás okosan",
    "Social media adatvédelem",
    "Google keresés profi szint",
    "Digitális lábnyom audit",
    "Spam vs. scam",
    "Open source eszközök",
    "Screenshot és screen record",
    "Email etikett 2025",
    "Backup stratégia",
    "Browser bővítmények",
    "AI képgenerálás alapok",
    "Digitális minimalizmus",
    "Online reputáció kezelés",
    "Tech news szűrés",
  ],
  communication_social: [
    "Lift pitch 30mp-ben",
    "Aktív hallgatás technika",
    "Nemleges válasz diplomatikusan",
    "Small talk témák",
    "Testbeszéd alapok",
    "Feedback adás-kapás",
    "Konfliktusmegoldás 101",
    "Prezentáció struktúra",
    "Asszertív kommunikáció",
    "Networking tippek",
    "Storytelling ereje",
    "Email: rövid és hatékony",
    "Empátia gyakorlat",
    "Kérdezéstechnika",
    "Csoportdinamika",
    "Online meeting etikett",
    "Határok kommunikálása",
    "Meggyőzés vs. manipuláció",
    "Humor a kommunikációban",
    "Kulturális különbségek",
    "Heti kommunikációs kihívás",
  ],
  study_brain_skills: [
    "Pomodoro technika",
    "Spaced repetition",
    "Flow állapot elérése",
    "Aktív vs. passzív tanulás",
    "Jegyzetelés: Cornell módszer",
    "Memóriapalota technika",
    "Alvás és tanulás kapcsolata",
    "Fókusz-zónák kialakítása",
    "Feynman technika",
    "Digitális detox tanuláshoz",
    "Mind mapping",
    "Multitasking mítosz",
    "Motiváció vs. fegyelem",
    "Vizuális tanulás hack-ek",
    "Olvasási sebesség növelés",
    "Stresszkezelés vizsgák előtt",
    "Tanulási platók áttörése",
    "Chunking módszer",
    "Retrieval practice",
    "Napirend optimalizálás",
    "Heti tanulási retrospektív",
  ],
  knowledge_bites: [
    "Miért kék az ég?",
    "GDP mit mér valójában?",
    "Placebo hatás titka",
    "Hogyan működik a WiFi?",
    "Mi az a kognitív torzítás?",
    "Miért alszunk?",
    "Kvantumfizika 60mp-ben",
    "Évszakok miértje",
    "Hogyan készül a csokoládé?",
    "Mi az a blockchain?",
    "Miért van déjà vu?",
    "Antibiotikum rezisztencia",
    "Miért vagyunk társas lények?",
    "Mesterséges intelligencia röviden",
    "Vulkánok működése",
    "Mi a sötét anyag?",
    "Hogyan tanulnak a gépek?",
    "Miért felejtünk?",
    "Színek pszichológiája",
    "Mi az a CRISPR?",
    "Heti tudáskihívás",
  ],
};

// ============================================================================
// Prompt builder
// ============================================================================

const CATEGORY_PROMPTS: Record<SmartLearningCategory, string> = {
  financial_basics: "pénzügyek, megtakarítás, befektetés, költségvetés, pénzügyi alapfogalmak",
  digital_literacy: "digitális jártasság, online biztonság, AI eszközök, adatvédelem, technológia",
  communication_social: "kommunikáció, prezentáció, tárgyalás, social skillek, networking",
  study_brain_skills: "tanulási technikák, memória, fókusz, hatékony tanulás, agytréning",
  knowledge_bites: "általános műveltség, tudomány, történelem, kultúra, érdekességek",
};

function buildTitlePrompt(category: SmartLearningCategory, count: number): string {
  const topic = CATEGORY_PROMPTS[category];
  return `Generálj ${count} napi címet egy micro-skill tanulási tervhez.

Téma: ${topic}

Szabályok:
1) Minden cím rövid, casual, Gen-Z stílusú
2) Maximum 5-6 szó per cím
3) Kérdés vagy rövid kijelentés formában
4) Progresszív: egyszerűtől a bonyolultabb felé
5) Magyar nyelven
6) NEM kell magyarázat, csak a címek

Válaszolj KIZÁRÓLAG JSON formátumban, markdown nélkül:
{"titles": ["cím1", "cím2", ...]}`;
}

// ============================================================================
// JSON extraction
// ============================================================================

function extractJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.substring(start, end + 1));
  } catch {
    return null;
  }
}

// ============================================================================
// Generate
// ============================================================================

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Smart plan generation timed out")), ms),
  );
  return Promise.race([promise, timeout]);
}

export async function generateSmartTitles(
  category: SmartLearningCategory,
  durationDays: number,
): Promise<SmartPlan> {
  const count = Math.max(1, Math.min(21, durationDays));


  // Try LLM generation
  try {
    const prompt = buildTitlePrompt(category, count);
    const resp = await withTimeout(
      pumiInvoke<{ reply?: string; text?: string; message?: string; type?: string }>("/chat/enhanced", {
        message: prompt,
        lang: "hu",
        mode: "learning",
        json_mode: true,
      }),
      15000,
    );

    const rawText = resp.reply || resp.text || resp.message || "";
    if (rawText) {
      const parsed = extractJson(rawText);
      if (parsed?.titles && Array.isArray(parsed.titles) && parsed.titles.length >= count) {
        return { category, titles: parsed.titles.slice(0, count) };
      }
    }
  } catch (err) {
    console.warn("[SMART] LLM generation failed, using fallback:", err);
  }

  // Fallback to hardcoded templates
  const fallback = TEMPLATES[category].slice(0, count);
  return { category, titles: fallback };
}
