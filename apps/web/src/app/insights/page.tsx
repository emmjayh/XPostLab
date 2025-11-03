'use client'

import { useMemo } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { usePersonas } from '@/hooks/usePersonas'

interface InsightMetric {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'flat'
}

const sampleMetrics: InsightMetric[] = [
  { label: 'Posts generated this week', value: '42', change: '+18%', trend: 'up' },
  { label: 'Average engagement lift', value: '2.4x', change: '+9%', trend: 'up' },
  { label: 'Completion rate', value: '94%', change: '-3%', trend: 'down' },
  { label: 'Time saved', value: '11h', change: '+2h', trend: 'up' },
]

const sampleHooks = [
  {
    hook: 'Unpopular opinion: shipping daily is how you unblock growth.',
    performance: '3.1x baseline reach',
  },
  {
    hook: 'We turned beta feedback into a viral thread in 48 hours. Here’s how.',
    performance: '2.8x reply rate',
  },
  {
    hook: 'The “boring” CRM experiment that added 18% retention in 30 days.',
    performance: '2.2x click-through',
  },
]

const sampleTimeline = [
  {
    title: 'Persona tweak: Product Launch Strategist',
    time: 'Today · 10:12 AM',
    description: 'Adjusted tone to highlight urgency during launch week.',
  },
  {
    title: 'Reply Studio session',
    time: 'Yesterday · 4:26 PM',
    description: 'Generated 6 on-brand replies for partnership outreach.',
  },
  {
    title: 'Momentum Composer batch',
    time: 'Oct 31 · 9:02 AM',
    description: 'Created 5 long-form LinkedIn variations targeting operators.',
  },
]

export default function InsightRadarPage() {
  const { user, isLoading } = useRequireAuth()
  const { personas } = usePersonas()

  const personaPerformance = useMemo(() => {
    if (!personas.length) {
      return [
        { name: 'Tech Thought Leader', usage: '46%', impact: 'High' },
        { name: 'Motivational Speaker', usage: '28%', impact: 'Medium' },
        { name: 'Master Storyteller', usage: '18%', impact: 'High' },
        { name: 'The Minimalist', usage: '8%', impact: 'Medium' },
      ]
    }

    const fallbackImpact = ['High', 'Medium', 'Emerging'] as const

    return personas.slice(0, 4).map((persona, index) => ({
      name: persona.name,
      usage: `${Math.max(12 - index * 3, 6)}%`,
      impact: fallbackImpact[index % fallbackImpact.length],
    }))
  }, [personas])

  if (isLoading || !user) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        Loading your insight radar...
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Insight Radar
        </span>
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-gray-900">See what’s resonating and why.</h1>
            <p className="text-lg text-gray-600">
              Insight Radar reviews every variant you generate and surfaces hooks, personas, and cadence patterns that outperform your
              baseline. Use it to shape tomorrow’s content calendar and double down on what works.
            </p>
          </div>
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Data status</h2>
            <p className="text-sm text-gray-600">
              Real analytics dashboard coming soon. This view shows representative insights so you can design your workflow today.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {sampleMetrics.map((metric) => (
          <div key={metric.label} className="card space-y-3">
            <div className="text-sm font-medium text-gray-500">{metric.label}</div>
            <div className="text-3xl font-semibold text-gray-900">{metric.value}</div>
            <div
              className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {metric.change} vs last week
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="card space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Top performing hooks</h3>
          <p className="text-sm text-gray-500">
            Hooks with the biggest lift on reach, replies, or click-through in the past 7 days.
          </p>
          <div className="space-y-4">
            {sampleHooks.map((item, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">{item.hook}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-indigo-600">{item.performance}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Persona performance</h3>
          <p className="text-sm text-gray-500">Relative usage and impact scores across recent campaigns.</p>
          <div className="space-y-3">
            {personaPerformance.map((persona) => (
              <div key={persona.name} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{persona.name}</span>
                  <span className="text-xs uppercase tracking-wide text-indigo-600">{persona.usage}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Impact: {persona.impact}</p>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <span className="block h-2 rounded-full bg-indigo-500" style={{ width: persona.usage }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="card space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Recent activity</h3>
          <div className="space-y-4">
            {sampleTimeline.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Action list</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li>• Double down on hooks that mention specific time frames or data points.</li>
            <li>• Layer Reply Studio responses on high-performing threads to extend reach.</li>
            <li>• Spin up a “Master Storyteller” persona variant for LinkedIn carousels.</li>
          </ul>
          <p className="text-xs text-gray-400">
            Automated recommendations will appear here once analytics is fully wired up.
          </p>
        </div>
      </section>
    </div>
  )
}
