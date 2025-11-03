'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ReplyStudio } from '@/components/ReplyStudio'

export default function ReplyStudioPage() {
  const { user, isLoading } = useRequireAuth()

  if (isLoading || !user) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        Loading Reply Studio...
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Reply Studio
        </span>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold text-gray-900">Stay in the conversation without sounding canned.</h1>
          <p className="text-lg text-gray-600">
            Paste any thread, DM, or comment and Reply Studio will draft human replies that carry your persona’s tone. Perfect for
            partnerships, community management, and high-intent leads.
          </p>
        </div>
      </section>

      <section className="card border-transparent bg-white/95 shadow-lg">
        <ReplyStudio />
      </section>
    </div>
  )
}
