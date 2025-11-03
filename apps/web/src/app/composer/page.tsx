'use client'

import Link from 'next/link'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { BrainDumpComposer } from '@/components/BrainDumpComposer'

export default function ComposerPage() {
  const { user, isLoading } = useRequireAuth()

  if (isLoading || !user) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        Checking your workspace access...
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Momentum Composer
        </span>
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-gray-900">
              Build an entire content queue from a single idea.
            </h1>
            <p className="text-lg text-gray-600">
              Drop your raw notes, pick the persona that matches your voice, and generate ready-to-post variants for
              X, LinkedIn, and Instagram. Rework long drafts in one click to stay on-brand and under limit.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                Fast sync (no queue)
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                Persona-aware tone controls
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                Rework + hashtag toggles
              </span>
            </div>
          </div>
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Need a different workflow?</h2>
            <p className="text-sm text-gray-600">
              Head over to{' '}
              <Link href="/replies" className="font-medium text-indigo-600 hover:text-indigo-500">
                Reply Studio
              </Link>{' '}
              to spin up conversation replies or{' '}
              <Link href="/insights" className="font-medium text-indigo-600 hover:text-indigo-500">
                Insight Radar
              </Link>{' '}
              to see what worked last week.
            </p>
          </div>
        </div>
      </section>

      <section className="card border-transparent bg-white/95 shadow-lg">
        <BrainDumpComposer />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Batch content in minutes',
            description: 'Spin up five variants per persona and export the ones that match your launch cadence.',
          },
          {
            title: 'Persona clarity',
            description: 'Each variant carries tone, cadence, and CTA style so scheduled content stays on brand.',
          },
          {
            title: 'Character-aware editing',
            description: 'Rework long drafts to fit platform constraints without losing your hook or CTA.',
          },
        ].map((item) => (
          <div key={item.title} className="card h-full bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
