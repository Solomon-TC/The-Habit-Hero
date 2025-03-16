import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create a service role client to bypass RLS
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_KEY") ?? "",
    );

    // Check if user already has a friend code in friend_codes table
    const { data: existingCode, error: existingCodeError } = await serviceClient
      .from("friend_codes")
      .select("code")
      .eq("user_id", user.id)
      .single();

    // If user exists and already has a friend code, return it
    if (existingCode && existingCode.code) {
      console.log("Found existing friend code:", existingCode.code);
      return new Response(JSON.stringify({ friendCode: existingCode.code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate a random 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Try to generate a unique code (retry up to 5 times)
    let friendCode = generateCode();
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < 5) {
      const { data, error } = await serviceClient
        .from("friend_codes")
        .select("id")
        .eq("code", friendCode)
        .single();

      if (error && error.code === "PGRST116") {
        // Code is unique (no results found)
        isUnique = true;
      } else {
        // Try a new code
        friendCode = generateCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: "Failed to generate unique friend code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Ensure user exists in the users table
    const { data: existingUser, error: existingUserError } = await serviceClient
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      // Create user record if it doesn't exist
      await serviceClient.from("users").insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      });
    }

    // Insert the friend code
    const { error: insertError } = await serviceClient
      .from("friend_codes")
      .insert({
        user_id: user.id,
        code: friendCode,
      });

    if (insertError) {
      console.error("Error inserting friend code:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Also update the users table for backward compatibility
    await serviceClient
      .from("users")
      .update({ friend_code: friendCode })
      .eq("id", user.id);

    return new Response(JSON.stringify({ friendCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
