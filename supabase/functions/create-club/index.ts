// supabase/functions/create-club/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    // Create Supabase client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { club_name, email, password, name, debug } = await req.json()

    // 🔍 Debug mode
    if (debug === true) {
      const authHeader = req.headers.get("Authorization")

      // Try to get user from the auth header if present
      let userCheck = { success: false, error: "No auth header", userId: null }
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "")
        const { data, error } = await supabaseAdmin.auth.getUser(token)
        userCheck = {
          success: !error,
          error: error?.message || null,
          userId: data?.user?.id || null
        }
      }

      return new Response(
        JSON.stringify({
          debug: true,
          message: "Debug mode - Edge Function is working!",
          environment: {
            hasUrl: !!Deno.env.get("SUPABASE_URL"),
            hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
            hasAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
            hasJwtSecret: !!Deno.env.get("JWT_SECRET"),
            url: Deno.env.get("SUPABASE_URL"),
          },
          request: {
            hasAuthHeader: !!authHeader,
            authHeaderLength: authHeader?.length || 0,
          },
          userCheck,
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate required fields
    if (!club_name || !email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: club_name, email, password, name" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate the user's JWT token
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication token",
          details: userError?.message || "User not found",
          hint: "Please try logging out and logging in again"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          error: "Profile not found",
          details: `No profile found for user ${user.email}`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          details: `User role is '${profile.role}', but 'admin' is required`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create new user for the club admin
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createUserError || !newUser.user) {
      return new Response(
        JSON.stringify({
          error: "Failed to create user",
          details: createUserError?.message || "Unknown error"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = newUser.user.id

    // Create club
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .insert({ name: club_name })
      .select()
      .single()

    if (clubError || !club) {
      // Rollback: delete the user we just created
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: "Failed to create club",
          details: clubError?.message || "Unknown error"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create profile for the new admin
    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        club_id: club.id,
        name,
        role: "admin",
      })

    if (profileInsertError) {
      // Rollback: delete club and user
      await supabaseAdmin.from("clubs").delete().eq("id", club.id)
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: "Failed to create profile",
          details: profileInsertError.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        clubId: club.id,
        userId: userId,
        message: `Club '${club_name}' created successfully`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err: any) {
    console.error("Unexpected error:", err)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
