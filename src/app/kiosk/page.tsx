// Client component so we can use hooks and auto-refresh.
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Shape of the rows we read from the DB
type EventRow = {
  id: string
  title: string
  start_ts: string
  end_ts: string
  venue: string | null
}

// Helper: format a time like "3:00 PM"
function timeOnly(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export default function KioskPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch “today’s” events and refresh every 60s
  useEffect(() => {
    let mounted = true
    let timer: NodeJS.Timeout

    async function load() {
      try {
        setError(null)
        setLoading(true)

        // Compute local midnight → midnight for today
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay)
        endOfDay.setDate(endOfDay.getDate() + 1)

        // Query events that start today (you can tweak to include overlaps later)
        const { data, error } = await supabase
          .from("events")
          .select("id,title,start_ts,end_ts,venue")
          .gte("start_ts", startOfDay.toISOString())
          .lt("start_ts", endOfDay.toISOString())
          .order("start_ts", { ascending: true })

        if (error) throw error
        if (mounted) setEvents((data ?? []) as EventRow[])
      } catch (e: any) {
        if (mounted) setError(e.message ?? "Failed to load")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // initial load + 60s refresh
    load()
    timer = setInterval(load, 60_000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <main className="mx-auto max-w-5xl p-6 text-emerald-900">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">Today at the MCC</h1>
        <span className="text-sm opacity-70">{new Date().toLocaleString()}</span>
      </header>

      {loading && <p className="text-emerald-800">Loading…</p>}
      {error && <p className="text-red-700">Error: {error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-emerald-800">No events scheduled today.</p>
      )}

      <ul className="space-y-4">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">{ev.title}</h2>
              <div className="text-xl font-medium">{timeOnly(ev.start_ts)} – {timeOnly(ev.end_ts)}</div>
            </div>
            {ev.venue && (
              <p className="mt-2 text-lg opacity-80">{ev.venue}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
