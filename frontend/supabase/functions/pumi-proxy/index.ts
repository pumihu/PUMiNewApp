// Supabase Edge Function - pumi-proxy
// Uses RAILWAY_TOKEN for upstream auth and X-User-ID for user identification

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const BACKEND_BASE = (Deno.env.get("PUMI_BACKEND_URL")?.trim() ?? "https://api.emoria.life").replace(/\/+$/, "");

type ForwardMethod = "GET" | "POST" | "PATCH" | "DELETE";

function normalizeRequestedMethod(raw: unknown): ForwardMethod {
  const value = String(raw ?? "POST").toUpperCase();
  if (value === "GET" || value === "POST" || value === "PATCH" || value === "DELETE") {
    return value;
  }
  return "POST";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = req.headers.get("authorization");
  if (!auth) {
    return json(401, { ok: false, error: "Missing Authorization" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[pumi-proxy] JWT validation failed:", authError?.message);
    return json(401, { ok: false, error: "Invalid token" });
  }

  const railwayToken = Deno.env.get("RAILWAY_TOKEN");
  if (!railwayToken) {
    console.error("[pumi-proxy] RAILWAY_TOKEN not configured");
    return json(500, { ok: false, error: "Server configuration error" });
  }

  let payload: Record<string, unknown> | null = null;
  let targetPath = "";
  let method: ForwardMethod = "POST";

  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  targetPath = String(payload?._path ?? "");
  method = normalizeRequestedMethod(payload?._method);

  delete (payload as Record<string, unknown>)._path;
  delete (payload as Record<string, unknown>)._method;

  if (method === "GET" || method === "DELETE") {
    payload = null;
  }

  const normalizedPath = ("/" + targetPath).replace(/\/+/g, "/");
  const url = `${BACKEND_BASE}${normalizedPath}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${railwayToken}`,
      "X-User-ID": user.id,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 58000);

  try {
    const upstream = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const isTimeout = e instanceof DOMException && e.name === "AbortError";
    console.error(`[pumi-proxy] ${isTimeout ? "Timeout" : "Upstream error"}:`, e);

    return json(isTimeout ? 504 : 500, {
      ok: false,
      error: isTimeout ? "timeout" : String(e),
      detail: isTimeout ? "Upstream request timed out" : undefined,
    });
  }
});
