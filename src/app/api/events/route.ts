// POST /api/events
// Server-side endpoint to create a new event in Supabase.
// Uses the *service role* key on the server so RLS won't block inserts.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Build a Supabase client with server credentials.
// URL is safe to be public. Service key must remain server-only (no NEXT_PUBLIC_).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body sent from the client form
    const body = await req.json()

    // Minimal required fields for our MVP schema
    const { title, start_ts, end_ts, venue } = body || {}

    // Quick validation to keep inputs sane
    if (!title || !start_ts || !end_ts) {
      return NextResponse.json(
        { error: "title, start_ts, and end_ts are required" },
        { status: 400 }
      )
    }

    // Create server-side Supabase client
    const supabase = createClient(supabaseUrl, serviceKey)

    // Insert row. 'id' and 'created_at' are auto-filled by defaults.
    const { data, error } = await supabase
      .from("events")
      .insert([{ title, start_ts, end_ts, venue: venue ?? null }])
      .select()
      .single()

    if (error) {
      // Helpful during dev: surface DB error messages
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Return the created row to the client
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    // Handles bad JSON or unexpected exceptions
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    )
  }
}
