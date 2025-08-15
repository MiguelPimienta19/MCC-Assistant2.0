// Next.js Response helper for returning HTTP responses
import { NextResponse } from "next/server"
// Supabase JS client for querying your database
import { createClient } from "@supabase/supabase-js"

// Public (client-safe) Supabase env vars.
// We use them here because this route only needs read access
// and your RLS policy allows anon SELECT.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Route handler for GET /api/ics/[id]
// In Next.js 15+, dynamic `params` is a *Promise* and must be awaited.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // dynamic segment: [id]
) {
  // Pull the event ID out of the awaited params object
  const { id } = await ctx.params

  // Basic guard: if no ID is provided, bail with 400 Bad Request
  if (!id) {
    return new NextResponse("Missing event id", { status: 400 })
  }

  // Create a Supabase client using the public anon key (read-only with RLS)
  const supabase = createClient(url, anon)

  // Fetch the single event by its UUID, selecting the fields needed for ICS
  const { data: ev, error } = await supabase
    .from("events")
    .select("id,title,start_ts,end_ts,venue")
    .eq("id", id)
    .single() // expect exactly one row

  // If the event doesn't exist or a DB error occurred, return 404
  if (error || !ev) {
    return new NextResponse("Event not found", { status: 404 })
  }

  // Convert string timestamps from the DB into JS Date objects
  const start = new Date(ev.start_ts)
  const end = new Date(ev.end_ts)

  // Helper to left-pad numbers (e.g., 7 -> "07") for ICS formatting
  const pad = (n: number) => n.toString().padStart(2, "0")

  // Convert a Date to UTC "YYYYMMDDTHHMMSSZ" format required by ICS
  const toIcsUtc = (d: Date) =>
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"

  // Escape characters that have special meaning in ICS text fields
  const escapeIcsText = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n")

  // Build the .ics file contents line-by-line per RFC 5545
  // - BEGIN/END:VCALENDAR encloses the calendar
  // - BEGIN/END:VEVENT encloses a single event
  // - UID: globally unique ID for this event file
  // - DTSTAMP: when the file was generated (UTC)
  // - DTSTART/DTEND: event start/end (UTC, ICS format)
  // - SUMMARY: the event title
  // - LOCATION: optional event location/venue
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MCC Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@mcc-events`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
    `LOCATION:${escapeIcsText(ev.venue ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "", // final CRLF
  ].join("\r\n") // ICS prefers CRLF newlines

// Sanitize the title so it can be safely used in a filename
const safeTitle = ev.title
  .replace(/[^a-z0-9_\-]/gi, "_") // replace special chars with underscore
  .substring(0, 50) // limit length just in case

  // Return the .ics file as a downloadable attachment
  return new NextResponse(ics, {
    status: 200,
    headers: {
      // Correct MIME type for calendar files
      "Content-Type": "text/calendar; charset=utf-8",
      // Hint to the browser to download with a nice filename
      "Content-Disposition": `attachment; filename="event-${safeTitle}.ics"`,
    },
  })
}
