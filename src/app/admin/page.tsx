// We mark this as a Client Component because we use React hooks (useState)
// and handle a browser-side <form> submit.
"use client"

import { useState } from "react"

/** ---------- Small, reusable input components (just functions) ---------- **/

// Text input with label
function TextInput(props: {
  label: string
  name: string
  required?: boolean
  placeholder?: string
}) {
  const { label, name, required, placeholder } = props
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-emerald-900">{label}</span>
      <input
        className="w-full rounded border border-emerald-200 bg-white p-3 text-emerald-900 outline-none focus:border-emerald-500"
        name={name}
        placeholder={placeholder}
        required={required}
        type="text"
      />
    </label>
  )
}

// Datetime input with label (uses HTML datetime-local)
function DateTimeInput(props: {
  label: string
  name: string
  required?: boolean
}) {
  const { label, name, required } = props
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-emerald-900">{label}</span>
      {/* datetime-local returns a local time string (no timezone).
         We'll convert it to an ISO string before sending to the server. */}
      <input
        className="w-full rounded border border-emerald-200 bg-white p-3 text-emerald-900 outline-none focus:border-emerald-500"
        name={name}
        required={required}
        type="datetime-local"
      />
    </label>
  )
}

/** ---------- Helper: convert datetime-local -> ISO string ---------- **/
function toIsoFromLocal(value: FormDataEntryValue | null) {
  // value is like "2025-09-05T17:00"
  if (!value) return null
  const s = String(value)
  // Construct a Date in the user's local timezone from that string:
  const local = new Date(s)
  // Validate
  if (isNaN(local.getTime())) return null
  // Convert to ISO (UTC) for the database (timestamptz)
  return local.toISOString()
}

/** ---------- The Admin Page ---------- **/
export default function AdminPage() {
  // Simple UI state
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Handles the form submit and POSTs to /api/events
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    const form = e.currentTarget
    const fd = new FormData(form)

    // Pull values from the form
    const title = String(fd.get("title") || "").trim()
    const startIso = toIsoFromLocal(fd.get("start_ts"))
    const endIso = toIsoFromLocal(fd.get("end_ts"))
    const venue = String(fd.get("venue") || "").trim() || null

    // Minimal validation (client-side)
    if (!title || !startIso || !endIso) {
      setMessage("Please fill Title, Start, and End.")
      setSubmitting(false)
      return
    }

    try {
      // POST to our server route (which uses the service role key on the server)
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          start_ts: startIso,
          end_ts: endIso,
          venue,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Request failed (${res.status})`)
      }

      // Success -> clear the form
      form.reset()
      setMessage("Event created ✅ — check the homepage list.")
    } catch (err: any) {
      setMessage(`Error: ${err.message ?? "Something went wrong"}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 text-emerald-900">
      <h1 className="mb-2 text-3xl font-bold">Admin — Create Event</h1>
      <p className="mb-6 text-sm opacity-80">
        Fill out the form and it will POST to <code>/api/events</code>, which inserts into the{" "}
        <code>events</code> table on Supabase.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <TextInput label="Title" name="title" required placeholder="Welcome Back BBQ" />
        <DateTimeInput label="Start" name="start_ts" required />
        <DateTimeInput label="End" name="end_ts" required />
        <TextInput label="Venue (optional)" name="venue" placeholder="MCC Main Hall" />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded bg-emerald-600 px-5 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Create Event"}
        </button>

        {/* Status / errors for the user */}
        {message && (
          <p className="pt-2 text-sm">
            {message}
          </p>
        )}
      </form>

      {/* Small note to help you debug quickly */}
      <p className="mt-4 text-xs opacity-70">
        Tip: If the homepage doesn’t show the new event, make sure its <strong>start time is in the future</strong>.
        The list only queries future events.
      </p>
    </main>
  )
}
