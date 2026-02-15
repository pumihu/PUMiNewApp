// src/types/syllabus.ts
// Syllabus types for structured daily plans

export type SyllabusBlockType =
  | "lesson"
  | "lightning"
  | "roleplay"
  | "flashcards"
  | "translation"
  | "quiz"
  | "writing"
  | "recap_mix";

export interface SyllabusBlock {
  block_id: string;
  block_type: SyllabusBlockType;
  title_hu: string;
  topic_seed: string;
  grammar_focus?: string;
  vocab_hint?: string[];
  estimated_minutes: number;
}

export interface SyllabusDay {
  day: number;
  theme_hu: string;
  theme_en?: string;
  grammar_focus: string;
  key_vocab: string[];
  blocks: SyllabusBlock[];
}

export interface WeekPlan {
  language: string;
  level: string;
  goal: string;
  days: SyllabusDay[];
}

/** Main task rotation per day (Day 1-7)
 * Days 1-3: simpler practice (flashcards, translation, quiz) — vocabulary building
 * Days 4+: more complex practice (roleplay, writing) — active production
 */
export const MAIN_TASK_ROTATION: SyllabusBlockType[] = [
  "flashcards",    // Day 1: learn vocabulary with cards
  "translation",   // Day 2: practice translating sentences
  "quiz",          // Day 3: test knowledge
  "roleplay",      // Day 4: first conversation practice
  "writing",       // Day 5: writing practice
  "roleplay",      // Day 6: more conversation
  "recap_mix",     // Day 7: mixed review
];

/** Maps syllabus block types to backend item type + practiceType */
export const BLOCK_TYPE_TO_ITEM_TYPE: Record<SyllabusBlockType, { type: string; practiceType?: string }> = {
  lesson:      { type: "lesson" },
  lightning:   { type: "quiz" },
  roleplay:    { type: "roleplay" },
  flashcards:  { type: "flashcard" },
  translation: { type: "translation" },
  quiz:        { type: "quiz" },
  writing:     { type: "writing" },
  recap_mix:   { type: "quiz" },
};
