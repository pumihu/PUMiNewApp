import { useState } from "react";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function TaskListBlock({ block, onUpdate }: Props) {
  const content = block.content_json as { tasks?: Task[] } | undefined;
  const [tasks, setTasks] = useState<Task[]>(content?.tasks ?? []);
  const [newText, setNewText] = useState("");

  const save = async (updated: Task[]) => {
    const result = await patchBlock(block.id, { content_json: { tasks: updated } });
    onUpdate(result);
  };

  const toggle = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(updated);
    save(updated);
  };

  const addTask = () => {
    if (!newText.trim()) return;
    const updated = [...tasks, { id: crypto.randomUUID(), text: newText.trim(), done: false }];
    setTasks(updated);
    setNewText("");
    save(updated);
  };

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <label key={t.id} className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() => toggle(t.id)}
            className="mt-0.5 accent-white"
          />
          <span className={`text-sm ${t.done ? "line-through text-neutral-500" : "text-neutral-100"}`}>
            {t.text}
          </span>
        </label>
      ))}
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 bg-transparent border-b border-neutral-700 text-sm text-neutral-100 outline-none placeholder-neutral-600 py-0.5"
          placeholder="Add task..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
      </div>
    </div>
  );
}
