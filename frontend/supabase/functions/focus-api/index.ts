// supabase/functions/focus-api/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // csak server-side
);

serve(async (req) => {
  const auth = req.headers.get("Authorization")!;
  const jwt = auth.replace("Bearer ", "");

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid JWT" }), { status: 401 });
  }
  const user_id = userData.user.id;

  const url = new URL(req.url);
  const path = url.pathname;

  // --- /stats
  if (req.method === "GET" && path === "/stats") {
    const { data, error } = await supabase
      .from("user_focus_stats")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data));
  }

  // --- /create-plan
  if (req.method === "POST" && path === "/create-plan") {
    const body = await req.json();

    const { data, error } = await supabase
      .from("focus_plans")
      .insert({ user_id, ...body })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data));
  }

  // --- /complete-item
  if (req.method === "POST" && path === "/complete-item") {
    const body = await req.json();

    const { error } = await supabase
      .from("focus_item_progress")
      .insert({
        user_id,
        focus_item_id: body.focus_item_id,
        completed_at: new Date().toISOString(),
      });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
});
