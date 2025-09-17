import { Boxes, Gem, Layers3, ShieldCheck, Sparkles, Tags } from "lucide-react"

import { Card } from "@/components/ui/card"

const collectionFeatures = [
    {
        icon: Boxes,
        title: "Nested collections",
        description: "Drag cards between binders, decks, and wishlists with quantity controls, conditions, and languages always in sync.",
    },
    {
        icon: Gem,
        title: "Real market value",
        description: "Pricing cache refreshes each morning with live adjustments when a card spikes so you never miss a sell window.",
    },
    {
        icon: Tags,
        title: "Smart tagging",
        description: "Create tags for archetypes, sets, formats, or buylist status and filter your collection in milliseconds.",
    },
]

const deckHighlights = [
    {
        icon: Layers3,
        title: "Format-aware builder",
        description: "MTG, Pokémon, and Yu-Gi-Oh! rules baked in—deck size, sideboard counts, and copy limits enforced as you type.",
    },
    {
        icon: Sparkles,
        title: "AI scouting report",
        description: "Instantly surface curve issues, matchup gaps, and card suggestions tuned to the inventory you already own.",
    },
    {
        icon: ShieldCheck,
        title: "Tournament ready",
        description: "Export decklists, share viewer links, or generate a TCGplayer quicklist to buy missing pieces in one tap.",
    },
]

const deckWorkflow = [
    {
        step: "1",
        title: "Import",
        description: "Upload a list, paste from Arena, or pick from your collection folders. We match SKUs automatically.",
    },
    {
        step: "2",
        title: "Validate",
        description: "See legality issues, ratio warnings, and pricing deltas before you sleeve a single card.",
    },
    {
        step: "3",
        title: "Optimize",
        description: "Ask the AI assistant for swaps, meta insight, or a budget version—always referencing what you already own.",
    },
]

export default function FeaturesOne() {
    return (
        <>
            <section id="features" className="py-24 md:py-32">
                <div className="mx-auto w-full max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-foreground text-4xl font-semibold">Collections that manage themselves</h2>
                        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance text-lg">
                            Consolidate every binder, deck, and trade-in list in one place. Collection Tracker keeps your data tidy, prices accurate, and lets you focus on playing instead of updating spreadsheets.
                        </p>
                    </div>
                    <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {collectionFeatures.map(({ icon: Icon, title, description }) => (
                            <Card key={title} className="h-full border border-border/50 bg-background/60 p-6 backdrop-blur">
                                <div className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full border border-primary/30">
                                    <Icon className="size-6" />
                                </div>
                                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section id="deck" className="py-24 md:py-32">
                <div className="mx-auto w-full max-w-6xl px-6">
                    <div className="grid gap-12 lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:items-center">
                        <div className="space-y-6">
                            <h2 className="text-4xl font-semibold text-foreground">Deckbuilding with a co-pilot that actually knows your cards</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Build faster with legality checks, curated card pools, and AI-powered recommendations that respect your real-world inventory. When you&apos;re ready to sleeve up, we package everything for tournament submission or a quick order.
                            </p>
                            <div className="grid gap-4">
                                {deckHighlights.map(({ icon: Icon, title, description }) => (
                                    <div key={title} className="rounded-2xl border border-border/40 bg-background/40 p-5 backdrop-blur">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-full border border-primary/30">
                                                <Icon className="size-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold">{title}</h3>
                                                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Card className="border border-border/50 bg-background/60 p-6 backdrop-blur">
                            <span className="text-xs font-semibold uppercase tracking-widest text-primary">PLAYBOOK</span>
                            <h3 className="mt-4 text-2xl font-semibold">From list to tournament in three steps</h3>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Everything in the pipeline stays linked to your live card inventory so you never overbuy or miss a gap.
                            </p>
                            <div className="mt-8 space-y-6">
                                {deckWorkflow.map(({ step, title, description }) => (
                                    <div key={step} className="relative rounded-2xl border border-border/40 bg-background/50 p-5">
                                        <div className="bg-primary text-primary-foreground absolute -top-4 left-5 flex size-9 items-center justify-center rounded-full text-sm font-semibold shadow-lg shadow-primary/30">
                                            {step}
                                        </div>
                                        <h4 className="pl-10 text-lg font-semibold">{title}</h4>
                                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </section>
        </>
    )
}
