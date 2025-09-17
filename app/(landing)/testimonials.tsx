import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

type Testimonial = {
    name: string
    role: string
    image: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: "Erica Dawson",
        role: "Owner, Twin Sun Games",
        image: "https://i.pravatar.cc/120?img=11",
        quote: "Collection Tracker replaced the spreadsheets we kept for six years. Our wholesale team closes restocks in half the time because pricing and quantities are always correct.",
    },
    {
        name: "Luis Martínez",
        role: "MTG Grinder",
        image: "https://i.pravatar.cc/120?img=12",
        quote: "Being able to filter my collection by archetype, format, and set legality is a game changer. I can build a RCQ deck in minutes and know exactly what I still need to borrow.",
    },
    {
        name: "Sasha Kim",
        role: "Pokémon Judge",
        image: "https://i.pravatar.cc/120?img=32",
        quote: "The deck validator understands every edge case we face at events. It flags issues before we submit lists and keeps my staff focused on players instead of paperwork.",
    },
    {
        name: "Noah Rivers",
        role: "Content Creator, OffCurve",
        image: "https://i.pravatar.cc/120?img=45",
        quote: "The AI assistant feels like a teammate. It explains why certain cards are underperforming and suggests swaps from my binder—not random cards I don\'t own.",
    },
    {
        name: "Priya Chandrasekhar",
        role: "Yu-Gi-Oh! Collector",
        image: "https://i.pravatar.cc/120?img=16",
        quote: "Tracking set rotations used to be a nightmare. Now I get one digest showing what\'s rotating, what spiked overnight, and where I can sell extras.",
    },
    {
        name: "Greg Flanders",
        role: "Head Buyer, Topdeck TCG",
        image: "https://i.pravatar.cc/120?img=23",
        quote: "Our intake desk uses Collection Tracker to scan buys and instantly see profitability. Integrating the quicklist export with TCGplayer saved hours every week.",
    },
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export default function WallOfLoveSection() {
    return (
        <section id="stories">
            <div className="py-24 md:py-32">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-foreground text-4xl font-semibold">Trusted by grinders, judges, and shop owners</h2>
                        <p className="text-muted-foreground mb-12 mt-4 text-balance text-lg">Real teams are keeping inventory tight, validating decks faster, and turning insights into wins.</p>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
                        {testimonialChunks.map((chunk, chunkIndex) => (
                            <div
                                key={chunkIndex}
                                className="space-y-3">
                                {chunk.map(({ name, role, quote, image }, index) => {
                                    const initials = name
                                        .split(" ")
                                        .map((part) => part[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()

                                    return (
                                        <Card key={index}>
                                            <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
                                                <Avatar className="size-9">
                                                    <AvatarImage
                                                        alt={name}
                                                        src={image}
                                                        loading="lazy"
                                                        width="120"
                                                        height="120"
                                                    />
                                                    <AvatarFallback>{initials}</AvatarFallback>
                                                </Avatar>

                                                <div>
                                                    <h3 className="font-medium">{name}</h3>

                                                    <span className="text-muted-foreground block text-sm tracking-wide">{role}</span>

                                                    <blockquote className="mt-3">
                                                        <p className="text-gray-700 dark:text-gray-300">{quote}</p>
                                                    </blockquote>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
