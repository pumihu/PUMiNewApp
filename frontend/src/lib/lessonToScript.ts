// src/lib/lessonToScript.ts
// Converts StrictFocusItem content into a plain-text lesson script
// for the ElevenLabs Conversational Agent to teach.

import type { StrictFocusItem, LessonContent, SmartLessonContent } from "@/types/focusItem";

/**
 * Convert a lesson or smart_lesson StrictFocusItem into a markdown script
 * that the ElevenLabs agent can follow to teach the content.
 */
export function lessonToScript(item: StrictFocusItem): string {
  if (item.content.kind === "lesson") {
    return lessonContentToScript(item.content.data, item.title);
  }
  if (item.content.kind === "smart_lesson") {
    return smartLessonToScript(item.content.data, item.title);
  }
  // Fallback: use instructions_md
  return item.instructions_md || item.title;
}

function lessonContentToScript(data: LessonContent, title: string): string {
  const parts: string[] = [];

  parts.push(`# ${data.title || title}`);

  if (data.introduction) {
    parts.push(`\n## Bevezető\n${data.introduction}`);
  } else if (data.summary) {
    parts.push(`\n## Összefoglaló\n${data.summary}`);
  }

  // Vocabulary
  if (data.vocabulary_table?.length) {
    parts.push("\n## Szókincs");
    for (const v of data.vocabulary_table) {
      const pron = v.pronunciation ? ` (${v.pronunciation})` : "";
      parts.push(`- **${v.word}**${pron} = ${v.translation}`);
      if (v.example_sentence) {
        parts.push(`  Példa: "${v.example_sentence}" — ${v.example_translation}`);
      }
    }
  }

  // Grammar
  if (data.grammar_explanation) {
    const g = data.grammar_explanation;
    parts.push(`\n## Nyelvtan: ${g.rule_title}`);
    parts.push(g.explanation);
    if (g.formation_pattern) {
      parts.push(`Képzési minta: ${g.formation_pattern}`);
    }
    if (g.examples?.length) {
      parts.push("Példák:");
      for (const ex of g.examples) {
        parts.push(`- ${ex.target} — ${ex.hungarian}${ex.note ? ` (${ex.note})` : ""}`);
      }
    }
  }

  // Dialogues
  if (data.dialogues?.length) {
    for (const d of data.dialogues) {
      parts.push(`\n## Párbeszéd: ${d.title}`);
      if (d.context) parts.push(d.context);
      for (const line of d.lines) {
        parts.push(`**${line.speaker}:** ${line.text} (${line.translation})`);
      }
    }
  }

  // Key points
  if (data.key_points?.length) {
    parts.push("\n## Kulcspontok");
    for (const p of data.key_points) {
      parts.push(`- ${p}`);
    }
  }

  // Cultural note
  if (data.cultural_note) {
    parts.push(`\n## Kulturális megjegyzés\n${data.cultural_note}`);
  }

  // Non-Latin lesson flow
  if (data.lesson_flow?.length) {
    for (const block of data.lesson_flow) {
      parts.push(`\n## ${block.title_hu}`);
      parts.push(block.body_md);
      if (block.letters?.length) {
        for (const l of block.letters) {
          parts.push(`- ${l.glyph} (${l.latin_hint}) — ${l.sound_hint_hu}`);
        }
      }
    }
  }

  return parts.join("\n");
}

function smartLessonToScript(data: SmartLessonContent, title: string): string {
  const parts: string[] = [];

  parts.push(`# ${title}`);
  parts.push(`\n## Bevezető gondolat\n${data.hook}`);

  if (data.micro_task_1) {
    parts.push(`\n## 1. feladat\n${data.micro_task_1.instruction}`);
    if (data.micro_task_1.options?.length) {
      for (let i = 0; i < data.micro_task_1.options.length; i++) {
        const marker = i === data.micro_task_1.correct_index ? " ✓" : "";
        parts.push(`  ${String.fromCharCode(65 + i)}) ${data.micro_task_1.options[i]}${marker}`);
      }
    }
    if (data.micro_task_1.explanation) {
      parts.push(`Magyarázat: ${data.micro_task_1.explanation}`);
    }
  }

  if (data.micro_task_2) {
    parts.push(`\n## 2. feladat\n${data.micro_task_2.instruction}`);
    if (data.micro_task_2.options?.length) {
      for (let i = 0; i < data.micro_task_2.options.length; i++) {
        const marker = i === data.micro_task_2.correct_index ? " ✓" : "";
        parts.push(`  ${String.fromCharCode(65 + i)}) ${data.micro_task_2.options[i]}${marker}`);
      }
    }
    if (data.micro_task_2.explanation) {
      parts.push(`Magyarázat: ${data.micro_task_2.explanation}`);
    }
  }

  parts.push(`\n## Összefoglaló\n${data.insight}`);

  return parts.join("\n");
}
