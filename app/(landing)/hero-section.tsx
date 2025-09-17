import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Bot, Layers, LineChart, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

import { HeroHeader } from "./header"

const heroHighlights = [
    {
        icon: LineChart,
        title: "Live market valuations",
        description: "Automatic price sync from TCGplayer with intraday refreshes when you need them",
    },
    {
        icon: Layers,
        title: "Collections built your way",
        description: "Nested folders, tags, and smart filters keep thousands of cards organized in seconds",
    },
    {
        icon: Bot,
        title: "AI deck insights",
        description: "Get format-legal deck advice trained on your collection and the latest tournament data",
    },
]

const statHighlights = [
    { label: "Cards tracked daily", value: "2.3M" },
    { label: "Decks validated", value: "87K" },
    { label: "Avg. value unlocked", value: "$1.4k" },
]

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="relative">
                <section id="top" className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_1200px_at_50%_-200px,rgba(76,106,255,0.25),transparent)]" />
                    <div className="py-24 sm:py-28 lg:py-36">
                        <div className="relative mx-auto max-w-6xl px-6">
                            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                                <div className="space-y-10">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                        <Sparkles className="size-4" />
                                        <span>Sync with TCGplayer in under two minutes</span>
                                    </div>
                                    <div className="space-y-6">
                                        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                                            Your command center for every trading card you own
                                        </h1>
                                        <p className="text-muted-foreground text-lg leading-relaxed">
                                            Collection Tracker pulls catalog, pricing, and format rules straight from TCGplayer so collectors, store owners, and grinders always know what&apos;s in their binders and what to play next.
                                        </p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {heroHighlights.map(({ icon: Icon, title, description }) => (
                                            <div
                                                key={title}
                                                className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-full border border-primary/30">
                                                        <Icon className="size-5" />
                                                    </div>
                                                    <h3 className="text-sm font-medium uppercase tracking-wide">{title}</h3>
                                                </div>
                                                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        <Button asChild size="lg">
                                            <Link href="/sign-up">
                                                <span>Start tracking for free</span>
                                                <ArrowRight className="ml-2 size-5" />
                                            </Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="backdrop-blur">
                                            <Link href="#features">
                                                <span>Browse the product tour</span>
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-12 top-10 hidden size-48 rounded-full bg-primary/20 blur-3xl lg:block" />
                                    <div className="bg-background/80 border border-border/60 shadow-2xl shadow-blue-500/10 ring-1 ring-border/60 relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] backdrop-blur">
                                        <Image
                                            src="/hero-section-main-app-dark.png"
                                            alt="Collection Tracker dashboard"
                                            width={2880}
                                            height={1842}
                                            priority
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-16 grid gap-6 border-t border-border/40 pt-8 sm:grid-cols-3">
                                {statHighlights.map((stat) => (
                                    <div key={stat.label} className="rounded-2xl border border-border/40 bg-background/40 p-6 text-center backdrop-blur">
                                        <span className="text-3xl font-semibold text-foreground">{stat.value}</span>
                                        <p className="text-muted-foreground mt-2 text-sm uppercase tracking-wide">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
