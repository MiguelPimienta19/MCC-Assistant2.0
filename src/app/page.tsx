import Link from "next/link"
import EventsList from "@/components/EventsList"



export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-emerald-900 md:text-7xl">
                Multicultural Center
              </h1>
              <p className="mt-6 max-w-xl text-lg text-emerald-800 md:text-xl">
                Welcome to the MCC. Explore upcoming events, book the event space, or
                generate structured meeting agendas.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/schedule"
                  className="rounded-md border border-emerald-500 px-5 py-3 text-emerald-900 transition-colors hover:bg-emerald-500 hover:text-white"
                >
                  Schedule Event Space
                </Link>
                <Link
                  href="/agenda"
                  className="rounded-md border border-emerald-300 px-5 py-3 text-emerald-900 transition-colors hover:bg-emerald-300 hover:text-emerald-950"
                >
                  Create Meeting Agenda
                </Link>
              </div>
            </div>

            {/* decorative wordmark */}
            <div
              aria-hidden
              className="hidden select-none text-7xl font-black leading-none text-emerald-300/60 md:block"
            >
              cultivating
              <br />
              relationships
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming events placeholder (we'll wire data next) */}
      <section id="calendar" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="mb-6 text-3xl font-bold text-emerald-900">Upcoming Events</h2>
        <EventsList /> {/* Fetches and displays events from Supabase */}
        <div className="mt-6">
          <Link href="/hub#events" className="text-emerald-900 underline-offset-4 hover:underline">
            Explore event details →
          </Link>
        </div>
      </section>
    </main>
  )
}
