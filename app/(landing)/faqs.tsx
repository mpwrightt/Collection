const faqs = [
    {
        question: "Which games do you support today?",
        answer:
            "Magic: The Gathering, Pokémon, and Yu-Gi-Oh! are live now. Flesh and Blood plus Lorcana are in private preview—join the waitlist from your workspace settings to get early access.",
    },
    {
        question: "Do I need TCGplayer credentials to use Collection Tracker?",
        answer:
            "No. You can start by importing CSVs or pasting decklists. Connecting TCGplayer unlocks live pricing, quicklist exports, and automatic restock alerts.",
    },
    {
        question: "How does the AI assistant use my data?",
        answer:
            "Deck insights only use cards from your workspace and public tournament results. We never train on your data or send inventory details to third parties without your permission.",
    },
    {
        question: "Can multiple team members manage the same collection?",
        answer:
            "Absolutely. Invite judges, buyers, and teammates with role-based permissions. Activity logs keep track of edits across every folder and deck.",
    },
    {
        question: "What happens if I cancel?",
        answer:
            "You keep read-only access to your collections and can export everything to CSV or quicklist anytime. Paid features like AI suggestions and multi-user permissions pause until you resume.",
    },
]

export default function FAQs() {
    return (
        <section id="faq" className="scroll-py-16 py-24 md:scroll-py-32 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="grid gap-y-12 lg:[grid-template-columns:1fr_auto]">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-semibold md:text-5xl">Answers for collectors and tournament teams</h2>
                        <p className="text-muted-foreground mt-4 max-w-md text-lg">Can&apos;t find what you&apos;re looking for? Drop us a line and we&apos;ll set up a quick call to walk you through the workflow.</p>
                    </div>

                    <div className="divide-y divide-border/60 sm:mx-auto sm:max-w-xl lg:mx-0">
                        {faqs.map((faq) => (
                            <div key={faq.question} className="py-6">
                                <h3 className="text-lg font-medium">{faq.question}</h3>
                                <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
