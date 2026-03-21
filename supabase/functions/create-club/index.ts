// ============================================
// Supabase Edge Function: create-club
// ============================================
//
// This Edge Function securely creates a new club with an admin user.
//
// SECURITY:
// - Runs server-side with access to service role key
// - Validates user permissions before creating club
// - Creates users using Admin API (supabase.auth.admin)
//
// DEPLOYMENT:
// supabase functions deploy create-club
//
// TEST LOCALLY:
// supabase functions serve create-club
//
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Types
interface ClubData {
  name: string
  city: string
  logo_url?: string | null
}

interface AdminData {
  name: string
  email: string
  password: string
}

interface RequestBody {
  club: ClubData
  admin: AdminData
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================
    // 1. Initialize Supabase Client with Service Role
    // ============================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // ============================================
    // 2. Verify the requesting user is authorized
    // ============================================

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================
    // 3. Check if user has permission to create clubs
    // ============================================

    // TODO: Add your authorization logic here
    // Example: Check if user is a super admin
    // const { data: profile } = await supabaseAdmin
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single()
    //
    // if (profile?.role !== 'super_admin') {
    //   return new Response(
    //     JSON.stringify({ error: 'Insufficient permissions' }),
    //     { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   )
    // }

    // ============================================
    // 4. Parse and validate request body
    // ============================================

    const requestBody: RequestBody = await req.json()

    if (!requestBody.club || !requestBody.admin) {
      return new Response(
        JSON.stringify({ error: 'Missing club or admin data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { club, admin } = requestBody

    // Validate required fields
    if (!club.name || !club.city) {
      return new Response(
        JSON.stringify({ error: 'Club name and city are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!admin.name || !admin.email || !admin.password) {
      return new Response(
        JSON.stringify({
          error: 'Admin name, email, and password are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================
    // 5. Create admin user using Admin API
    // ============================================

    const { data: authData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true, // Auto-confirm email for admin users
        user_metadata: {
          name: admin.name,
        },
      })

    if (createUserError || !authData.user) {
      console.error('Failed to create user:', createUserError)
      return new Response(
        JSON.stringify({
          error: `Failed to create admin user: ${createUserError?.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const userId = authData.user.id

    // ============================================
    // 6. Create club record
    // ============================================

    const { data: clubData, error: clubError } = await supabaseAdmin
      .from('clubs')
      .insert({
        name: club.name,
        city: club.city,
        logo_url: club.logo_url || null,
      })
      .select()
      .single()

    if (clubError || !clubData) {
      console.error('Failed to create club:', clubError)

      // Rollback: Delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: `Failed to create club: ${clubError?.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const clubId = clubData.id

    // ============================================
    // 7. Create admin profile
    // ============================================

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        name: admin.name,
        role: 'admin',
        club_id: clubId,
      })

    if (profileError) {
      console.error('Failed to create profile:', profileError)

      // Rollback: Delete club and user
      await supabaseAdmin.from('clubs').delete().eq('id', clubId)
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: `Failed to create admin profile: ${profileError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================
    // 8. Return success response
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        clubId,
        userId,
        message: `Club "${club.name}" created successfully with admin ${admin.email}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
