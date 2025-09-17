import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CallToAction() {
    return (
        <section className="py-24 px-6">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-8 py-16 text-center shadow-[0_0_60px_rgba(60,130,255,0.16)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_900px_at_10%_-20%,rgba(43,200,183,0.22),transparent)]" />
                <div className="pointer-events-none absolute inset-x-[-120px] top-1/2 h-[420px] -translate-y-1/2 bg-[radial-gradient(circle,rgba(76,106,255,0.35),transparent_65%)] blur-3xl" />
                <div className="relative mx-auto max-w-3xl space-y-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">Ready When You Are</span>
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Stop guessing what&apos;s in your binders</h2>
                    <p className="text-muted-foreground text-lg">
                        Import your list, connect TCGplayer, and let Collection Tracker handle the rest. Free for small collections—upgrade when you&apos;re ready to scale.
                    </p>

                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/sign-up">
                                <span>Start free workspace</span>
                            </Link>
                        </Button>

                        <Button asChild size="lg" variant="outline" className="border-border/60 bg-transparent backdrop-blur">
                            <Link href="#pricing">
                                <span>Compare plans</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
