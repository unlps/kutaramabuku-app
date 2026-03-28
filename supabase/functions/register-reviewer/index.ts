import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, email, password, fullName, publisherName, phone, dateOfBirth } = await req.json();

    if (!token || !email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client with service role — bypasses email confirmation
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Validate the invitation token
    const { data: invitation, error: tokenError } = await adminClient
      .from("reviewer_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Token de convite inválido ou expirado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check email matches invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "O email não corresponde ao convite." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create auth user (admin API — email already confirmed)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ← confirm immediately, skipping email verification
      user_metadata: { full_name: fullName },
    });

    if (createError) throw createError;
    const userId = userData.user.id;

    // 4. Generate editor secret ID
    const secretId = "VM-" + Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
      .slice(0, 12);

    // 5. Create reviewer profile
    const { data: profile, error: profileError } = await adminClient
      .from("reviewer_profiles")
      .insert({
        id: userId,
        full_name: fullName,
        editor_secret_id: secretId,
        publisher_name: publisherName || null,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        role: "reviewer",
        status: "active",
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // 6. Mark invitation as accepted
    await adminClient
      .from("reviewer_invitations")
      .update({ status: "accepted" })
      .eq("token", token);

    return new Response(
      JSON.stringify({
        success: true,
        editor_secret_id: profile.editor_secret_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
