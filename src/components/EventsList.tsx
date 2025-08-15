"use client"
/**
 * UpcomingEvents
 * - Fetches future events from Supabase
 * - Lets user toggle between List and Week views
 * - No external calendar libraries; pure React + Tailwind
 *
 * Notes:
 * - Week view shows the current week (Mon–Sun by default)
 * - Times rendered in user's local timezone (can pin to campus TZ if you want)
 */

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

// ---- Types ----
type EventRow = {
  id: string
  title: string
  start_ts: string
  end_ts: string
  venue: string | null
}

// ---- Helpers ----
const fmtList = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})

const fmtTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }) // hour & minutes

// Start of week (Mon); switch to 0 for Sun if you prefer
const WEEK_START = 1 // 0 = Sunday, 1 = Monday

function startOfWeek(d = new Date()) {
  const date = new Date(d)
  const day = (date.getDay() - WEEK_START + 7) % 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day)
  return date
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 7)
  return e
}
function dayIndex(date: Date) {
  // 0..6 column index in our Mon-start grid
  return (date.getDay() - WEEK_START + 7) % 7
}
function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes()
}

// Google Calendar helpers
function pad(n: number) { return n.toString().padStart(2, "0") }
function toGoogleDateUTC(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"
  )
}
function buildGoogleCalUrl({
  title, start, end, location, details,
}: { title: string; start: Date; end: Date; location?: string; details?: string }) {
  const base = "https://calendar.google.com/calendar/render"
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleDateUTC(start)}/${toGoogleDateUTC(end)}`,
  })
  if (location) params.set("location", location)
  if (details) params.set("details", details)
  return `${base}?${params.toString()}`
}

// ---- Component ----
export default function UpcomingEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "week">("list")

  useEffect(() => {
    ;(async () => {
      try {
        const nowIso = new Date().toISOString()
        const { data, error } = await supabase
          .from("events")
          .select("id,title,start_ts,end_ts,venue")
          .gte("start_ts", nowIso)
          .order("start_ts", { ascending: true })
        if (error) throw error
        setEvents((data ?? []) as EventRow[])
      } catch (e: any) {
        setError(e.message ?? "Failed to load events")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div>Loading events…</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  if (events.length === 0) return <div className="text-amber-600">No upcoming events.</div>

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          className={`rounded px-3 py-1 text-sm border ${view === "list" ? "bg-emerald-500 text-white border-emerald-500" : "border-emerald-300 text-emerald-900 hover:bg-emerald-100"}`}
          onClick={() => setView("list")}
        >
          List
        </button>
        <button
          className={`rounded px-3 py-1 text-sm border ${view === "week" ? "bg-emerald-500 text-white border-emerald-500" : "border-emerald-300 text-emerald-900 hover:bg-emerald-100"}`}
          onClick={() => setView("week")}
        >
          Week
        </button>
      </div>

      {view === "list" ? (
        <ListView events={events} />
      ) : (
        <WeekView events={events} />
      )}
    </div>
  )
}

/* ---------------------------
   List View (grouped by day)
--------------------------- */
function ListView({ events }: { events: EventRow[] }) {
  // Group events by YYYY-MM-DD (local)
  const groups = useMemo(() => {
    const map = new Map<string, EventRow[]>()
    for (const ev of events) {
      const dayKey = new Date(ev.start_ts).toISOString().slice(0, 10) // YYYY-MM-DD (UTC slice is fine for grouping)
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push(ev)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  return (
    <div className="space-y-6">
      {groups.map(([dayKey, rows]) => {
        const date = new Date(rows[0].start_ts)
        return (
          <div key={dayKey} className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-900">
              {fmtList.format(date)}
            </h3>
            <ul className="space-y-3">
              {rows.map((ev) => {
                const start = new Date(ev.start_ts)
                const end = new Date(ev.end_ts)
                const pretty = `${fmtTime.format(start)} – ${fmtTime.format(end)}`
                const gcalHref = buildGoogleCalUrl({
                  title: ev.title, start, end, location: ev.venue ?? undefined,
                })
                const icsHref = `/api/ics/${ev.id}`

                return (
                  <li key={ev.id} className="rounded border p-3">
                    <div className="font-medium text-emerald-800">{ev.title}</div>
                    <div className="text-sm text-gray-600">
                      {pretty} · {ev.venue ?? "TBD"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <a
                        href={gcalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded border border-emerald-500 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-500 hover:text-white"
                      >
                        Add to Google Calendar
                      </a>
                      <a
                        href={icsHref}
                        className="inline-block rounded border border-emerald-300 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100"
                      >
                        Add to Apple/Outlook (.ics)
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------------------
   Week View (Mon–Sun grid)
   - Simple 8am–8pm window
   - Positions events by start/end within each day column
--------------------------- */
function WeekView({ events }: { events: EventRow[] }) {
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())

  // Filter events that intersect this week
  const weekEvents = events.filter((ev) => {
    const s = new Date(ev.start_ts)
    return s >= weekStart && s < weekEnd
  })

  // Layout constants
  const dayHoursStart = 8   // 8:00
  const dayHoursEnd = 20    // 20:00
  const minutesSpan = (dayHoursEnd - dayHoursStart) * 60

  return (
    <div className="border rounded overflow-hidden">
      {/* Header row: days */}
      <div className="grid grid-cols-8 border-b bg-emerald-50">
        <div className="p-2 text-sm font-medium text-gray-600">Time</div>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + i)
          return (
            <div key={i} className="p-2 text-sm font-medium text-emerald-900">
              {fmtList.format(d)}
            </div>
          )
        })}
      </div>

      {/* Body: time ruler + day columns */}
      <div className="grid grid-cols-8 relative" style={{ minHeight: 600 }}>
        {/* Time ruler */}
        <div className="relative">
          {Array.from({ length: dayHoursEnd - dayHoursStart + 1 }).map((_, i) => (
            <div
              key={i}
              className="border-b text-[11px] text-gray-500 h-[48px] leading-[48px] px-2"
            >
              {String(((dayHoursStart + i + 11) % 12) + 1)} {dayHoursStart + i < 12 ? "AM" : "PM"}
            </div>
          ))}
        </div>

        {/* 7 day columns */}
        {Array.from({ length: 7 }).map((_, col) => (
          <div key={col} className="relative border-l">
            {/* Hour lines */}
            {Array.from({ length: dayHoursEnd - dayHoursStart + 1 }).map((_, i) => (
              <div key={i} className="border-b h-[48px]" />
            ))}

            {/* Events in this day */}
            {weekEvents
              .filter((ev) => dayIndex(new Date(ev.start_ts)) === col)
              .map((ev) => {
                const s = new Date(ev.start_ts)
                const e = new Date(ev.end_ts)
                // Clamp to our 8a–8p window for display
                const sMin = Math.max(minutesSinceMidnight(s), dayHoursStart * 60) - dayHoursStart * 60
                const eMin = Math.min(minutesSinceMidnight(e), dayHoursEnd * 60) - dayHoursStart * 60
                const topPct = Math.max(0, sMin / minutesSpan) * 100
                const heightPct = Math.max(8, (eMin - sMin) / minutesSpan * 100) // min height

                const pretty = `${fmtTime.format(s)} – ${fmtTime.format(e)}`
                const gcalHref = buildGoogleCalUrl({ title: ev.title, start: s, end: e, location: ev.venue ?? undefined })
                const icsHref = `/api/ics/${ev.id}`

                return (
                  <div
                    key={ev.id}
                    className="absolute left-1 right-1 rounded border border-emerald-400 bg-emerald-50/70 p-2 text-xs shadow-sm"
                    style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                  >
                    <div className="font-medium text-emerald-900 mb-0.5 truncate">{ev.title}</div>
                    <div className="text-[11px] text-gray-700 mb-1 truncate">{pretty} · {ev.venue ?? "TBD"}</div>
                    <div className="flex gap-1">
                      <a
                        href={gcalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-emerald-400 px-2 py-0.5 hover:bg-emerald-100"
                      >
                        Google
                      </a>
                      <a
                        href={icsHref}
                        className="rounded border border-emerald-300 px-2 py-0.5 hover:bg-emerald-100"
                      >
                        .ics
                      </a>
                    </div>
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
