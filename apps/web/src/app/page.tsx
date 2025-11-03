'use client'

import Link from 'next/link'
import { BrainDumpComposer } from '../components/BrainDumpComposer'

const features = [
  {
    title: 'Momentum Composer',
    description: 'Expand one spark into threads, hooks, captions, and newsletters that stay on brand for every platform.',
    badge: 'MC',
  },
  {
    title: 'Persona Engine',
    description: 'Load personas that mimic your tone, cadence, and CTA style so every post sounds like you.',
    badge: 'PE',
  },
  {
    title: 'Insight Radar',
    description: 'See which angles resonate with your audience and get suggestions backed by performance signals.',
    badge: 'IR',
  },
  {
    title: 'Reply Studio',
    description: 'Spin up punchy replies and conversation starters that keep you visible without sounding robotic.',
    badge: 'RS',
  },
]

const steps = [
  {
    number: '01',
    title: 'Drop your raw idea',
    description:
      'Paste notes, half finished hooks, or a quick brain dump. X Post Lab understands context and intent instantly.',
  },
  {
    number: '02',
    title: 'Choose your persona and platform',
    description:
      'Select the persona that matches your voice and target channel. Each persona carries tone, cadence, and CTA patterns.',
  },
  {
    number: '03',
    title: 'Generate and refine in seconds',
    description:
      'Create multiple polished variants, rework long drafts to fit character limits, and copy them into your publishing flow.',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Creator Workflow OS
          </span>
          <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            Turn <span className="gradient-text">one idea</span> into{' '}
            <span className="gradient-text">a month of momentum</span>
          </h1>
          <p className="text-lg text-gray-600 md:text-xl">
            X Post Lab studies your voice, tracks what lands with your audience, and spins a single concept into campaign ready
            content--threads, hooks, captions, scripts, and more--in minutes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="#composer" className="btn-primary px-6 py-3 text-base">
              Start Creating
            </Link>
            <Link href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
              See how it works
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-3xl font-semibold text-gray-900">5x</p>
              <p className="text-sm text-gray-500">Faster ideation to publish loop</p>
            </div>
            <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-3xl font-semibold text-gray-900">30+</p>
              <p className="text-sm text-gray-500">Persona playbooks ready to use</p>
            </div>
            <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-3xl font-semibold text-gray-900">Unlimited</p>
              <p className="text-sm text-gray-500">Content variants per brainstorm</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="glass-card rounded-2xl p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-indigo-500">Live Workspace</p>
                <p className="text-lg font-semibold text-gray-900">Persona Mixer</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">X Post Lab</span>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Idea</p>
                <p className="text-base text-gray-700">
                  Launching a behind the scenes thread on how we built a viral product in 30 days.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Persona</p>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    Tech Thought Leader
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Tone: analytical and insightful. CTA: direct. Platform fit: Threads, LinkedIn, X.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-500">Variant preview</p>
                <p className="mt-2 text-sm text-gray-700">
                  30 days. 1 prototype. 0 sleep. Here is how we built momentum before launch--what worked, what flopped, and
                  the signal we track now.
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-6 -bottom-6 h-24 rounded-2xl bg-purple-200/40 blur-3xl" />
        </div>
      </section>

      <section id="features" className="space-y-12">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">What makes X Post Lab different?</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Every tool is tuned for momentum. Personas keep your voice authentic, insights highlight what performs, and
            automation gets you ready to post assets in record time.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="card h-full transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">
                {feature.badge}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-3 text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="space-y-12">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">From idea to impact in three moves</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Give us the spark and X Post Lab handles the rest: planning, persona matching, and ready to post variants.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="card relative overflow-hidden border border-gray-200/80 bg-white shadow-sm">
              <span className="absolute -top-8 right-4 text-5xl font-bold text-gray-100">{step.number}</span>
              <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-3 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="composer" className="space-y-10">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Try X Post Lab</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Drop an idea, pick a persona, and generate ready to post drafts in the voice your audience trusts.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="card border-transparent bg-white/95 shadow-lg">
            <BrainDumpComposer />
          </div>
          <div className="space-y-6">
            <div className="card bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Persona highlights</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg text-indigo-500">1</span>
                  <span>Persona defaults keep tone, cadence, and CTA style consistent for teams and multi channel creators.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg text-indigo-500">2</span>
                  <span>Rework variants on the fly to fit platform limits without losing your message.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg text-indigo-500">3</span>
                  <span>Save your best performing personas and reuse them across launches, ads, and community drops.</span>
                </li>
              </ul>
            </div>
            <div className="card bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl">
              <h3 className="text-lg font-semibold">Launch faster</h3>
              <p className="mt-2 text-sm text-white/90">
                Teams using X Post Lab ship campaigns five times faster and keep brand voice aligned across every touch point.
              </p>
              <Link
                href="#how-it-works"
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Explore the workflow
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12l-3.75 3.75M3 12h18" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="gradient-bg rounded-3xl px-8 py-16 text-center text-white shadow-2xl">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to turn your ideas into a content engine?</h2>
          <p className="text-lg text-white/90">
            Join creators and teams who use X Post Lab to brainstorm, batch, and publish without losing their signature voice.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="#composer" className="btn bg-white px-6 py-3 text-base font-semibold text-purple-600 hover:bg-white/90">
              Try the composer
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/30 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Sign in to continue
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
