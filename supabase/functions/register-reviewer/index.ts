import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Always return HTTP 200 — put the error in the body so the client can show a real message
const ok = (data: object) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (error: string) =>
  new Response(JSON.stringify({ success: false, error }), {
    status: 200, // ← 200 so supabase.functions.invoke() gives us the body
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, email, password, fullName, publisherName, phone, dateOfBirth } = body;

    if (!token || !email || !password || !fullName) {
      return fail("Campos obrigatórios em falta (token, email, password, fullName).");
    }

    // Admin client — uses service role, bypasses RLS and email confirmation
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Validate the invitation token (service role bypasses RLS)
    const { data: invitation, error: tokenError } = await adminClient
      .from("reviewer_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !invitation) {
      return fail("Token de convite inválido ou expirado.");
    }

    // 2. Verify email matches the invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return fail("O email não corresponde ao convite.");
    }

    // 3. Create auth user with email pre-confirmed (admin API)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      // If user already exists (retry scenario), fetch the existing user
      if (createError.message?.includes("already") || createError.message?.includes("exists")) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email.toLowerCase());
        if (!existingUser) return fail(`Erro ao criar utilizador: ${createError.message}`);
        // Update password for the existing user
        await adminClient.auth.admin.updateUserById(existingUser.id, { password });
        userData!.user = existingUser as any;
      } else {
        return fail(`Erro ao criar utilizador: ${createError.message}`);
      }
    }

    const userId = userData!.user.id;

    // 4. Generate editor secret ID
    const secretId =
      "VM-" +
      Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
        .slice(0, 12);

    // 5. Create reviewer profile (upsert in case of retry)
    const { data: profile, error: profileError } = await adminClient
      .from("reviewer_profiles")
      .upsert({
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

    if (profileError) {
      return fail(`Erro ao criar perfil: ${profileError.message}`);
    }

    // 6. Mark invitation as accepted
    await adminClient
      .from("reviewer_invitations")
      .update({ status: "accepted" })
      .eq("token", token);

    return ok({
      success: true,
      editor_secret_id: profile.editor_secret_id,
    });
  } catch (err: any) {
    return fail(err?.message || "Erro interno no servidor.");
  }
});
