// src/lib/pumiInvoke.ts
// Unified API wrapper - all backend calls go through this function.

import { supabase } from "@/integrations/supabase/client";

export type PumiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function pumiInvoke<T>(
  path: string,
  body: Record<string, unknown> = {},
  method: PumiMethod = "POST",
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("pumi-proxy", {
    body: {
      _path: path,
      _method: method,
      ...body,
    },
  });

  if (error) {
    throw new Error(`API error (${path}): ${error.message}`);
  }

  return data as T;
}
