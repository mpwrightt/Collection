import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const results = [];

    // 1. Pokemon Base Set 2
    const baseSet2Id = "base2";
    await convex.mutation(api.sets.createSet, {
      categoryId: 3, // Pokemon
      setId: baseSet2Id,
      name: "Pokemon Base Set 2",
      abbreviation: "BS2",
      totalCards: 130,
      releaseDate: "2000-02-24",
      description: "The second base set for Pokemon TCG with 130 cards."
    });

    const baseSet2Cards = [
      { cardNumber: "1/130", productId: 11001, name: "Alakazam", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 12.99 },
      { cardNumber: "2/130", productId: 11002, name: "Blastoise", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 25.99 },
      { cardNumber: "3/130", productId: 11003, name: "Charizard", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 89.99 },
      { cardNumber: "4/130", productId: 11004, name: "Clefairy", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 8.99 },
      { cardNumber: "5/130", productId: 11005, name: "Gyarados", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 15.99 },
      { cardNumber: "6/130", productId: 11006, name: "Hitmonlee", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 7.99 },
      { cardNumber: "7/130", productId: 11007, name: "Hypno", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 6.99 },
      { cardNumber: "8/130", productId: 11008, name: "Lapras", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 11.99 },
      { cardNumber: "9/130", productId: 11009, name: "Magneton", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 9.99 },
      { cardNumber: "10/130", productId: 11010, name: "Pidgeot", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 10.99 },
      { cardNumber: "25/130", productId: 11025, name: "Pikachu", rarity: "Common", category: "Pokemon", estimatedPrice: 2.99 },
      { cardNumber: "50/130", productId: 11050, name: "Energy Removal", rarity: "Common", category: "Trainer", estimatedPrice: 0.25 },
      { cardNumber: "75/130", productId: 11075, name: "Professor Oak", rarity: "Uncommon", category: "Trainer", estimatedPrice: 1.99 },
      { cardNumber: "100/130", productId: 11100, name: "Fighting Energy", rarity: "Common", category: "Energy", estimatedPrice: 0.10 },
      { cardNumber: "130/130", productId: 11130, name: "Psychic Energy", rarity: "Common", category: "Energy", estimatedPrice: 0.10 }
    ];

    await convex.mutation(api.sets.importSetCards, {
      setId: baseSet2Id,
      cards: baseSet2Cards
    });

    results.push({ setName: "Pokemon Base Set 2", cardsImported: baseSet2Cards.length });

    // 2. Pokemon Jungle Set
    const jungleSetId = "jungle";
    await convex.mutation(api.sets.createSet, {
      categoryId: 3, // Pokemon
      setId: jungleSetId,
      name: "Pokemon Jungle",
      abbreviation: "JU",
      totalCards: 64,
      releaseDate: "1999-06-16",
      description: "First expansion set for Pokemon TCG featuring Jungle Pokemon."
    });

    const jungleCards = [
      { cardNumber: "1/64", productId: 12001, name: "Clefable", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 18.99 },
      { cardNumber: "2/64", productId: 12002, name: "Electrode", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 12.99 },
      { cardNumber: "3/64", productId: 12003, name: "Flareon", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 35.99 },
      { cardNumber: "4/64", productId: 12004, name: "Jolteon", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 32.99 },
      { cardNumber: "5/64", productId: 12005, name: "Kangaskhan", rarity: "Rare Holo", category: "Pokemon", estimatedPrice: 15.99 },
      { cardNumber: "25/64", productId: 12025, name: "Pikachu", rarity: "Common", category: "Pokemon", estimatedPrice: 4.99 },
      { cardNumber: "40/64", productId: 12040, name: "Poke Ball", rarity: "Common", category: "Trainer", estimatedPrice: 0.50 },
      { cardNumber: "64/64", productId: 12064, name: "Lightning Energy", rarity: "Common", category: "Energy", estimatedPrice: 0.15 }
    ];

    await convex.mutation(api.sets.importSetCards, {
      setId: jungleSetId,
      cards: jungleCards
    });

    results.push({ setName: "Pokemon Jungle", cardsImported: jungleCards.length });

    // 3. Magic: The Gathering Alpha (sample)
    const alphaSetId = "alpha";
    await convex.mutation(api.sets.createSet, {
      categoryId: 1, // MTG
      setId: alphaSetId,
      name: "Magic: The Gathering Alpha",
      abbreviation: "LEA",
      totalCards: 295,
      releaseDate: "1993-08-05",
      description: "The first Magic: The Gathering set ever printed."
    });

    const alphaCards = [
      { cardNumber: "1/295", productId: 13001, name: "Black Lotus", rarity: "Rare", category: "Artifact", estimatedPrice: 25000.00 },
      { cardNumber: "2/295", productId: 13002, name: "Mox Pearl", rarity: "Rare", category: "Artifact", estimatedPrice: 8500.00 },
      { cardNumber: "3/295", productId: 13003, name: "Ancestral Recall", rarity: "Rare", category: "Instant", estimatedPrice: 12000.00 },
      { cardNumber: "4/295", productId: 13004, name: "Lightning Bolt", rarity: "Common", category: "Instant", estimatedPrice: 450.00 },
      { cardNumber: "5/295", productId: 13005, name: "Shivan Dragon", rarity: "Rare", category: "Creature", estimatedPrice: 1200.00 },
      { cardNumber: "25/295", productId: 13025, name: "Giant Growth", rarity: "Common", category: "Instant", estimatedPrice: 125.00 },
      { cardNumber: "50/295", productId: 13050, name: "Counterspell", rarity: "Uncommon", category: "Instant", estimatedPrice: 275.00 },
      { cardNumber: "100/295", productId: 13100, name: "Serra Angel", rarity: "Uncommon", category: "Creature", estimatedPrice: 350.00 }
    ];

    await convex.mutation(api.sets.importSetCards, {
      setId: alphaSetId,
      cards: alphaCards
    });

    results.push({ setName: "Magic: The Gathering Alpha", cardsImported: alphaCards.length });

    return NextResponse.json({
      success: true,
      message: "All demo sets imported successfully",
      results: results,
      totalSets: results.length,
      totalCards: results.reduce((sum, r) => sum + r.cardsImported, 0)
    });

  } catch (error) {
    console.error("Failed to import demo sets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import demo sets",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}