import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    // Create Pokemon Base Set 2
    const setId = "base2";

    // First, create the set
    await convex.mutation(api.sets.createSet, {
      categoryId: 3, // Pokemon
      setId: setId,
      name: "Pokemon Base Set 2",
      abbreviation: "BS2",
      totalCards: 130,
      releaseDate: "2000-02-24",
      description: "The second base set for Pokemon TCG with 130 cards including holos and non-holos."
    });

    // Sample cards from Pokemon Base Set 2
    const sampleCards = [
      // Some iconic cards with realistic product IDs (these would be real TCGPlayer IDs)
      {
        cardNumber: "1/130",
        productId: 11001,
        name: "Alakazam",
        rarity: "Rare Holo",
        category: "Pokemon",
        estimatedPrice: 12.99
      },
      {
        cardNumber: "2/130",
        productId: 11002,
        name: "Blastoise",
        rarity: "Rare Holo",
        category: "Pokemon",
        estimatedPrice: 25.99
      },
      {
        cardNumber: "3/130",
        productId: 11003,
        name: "Charizard",
        rarity: "Rare Holo",
        category: "Pokemon",
        estimatedPrice: 89.99
      },
      {
        cardNumber: "4/130",
        productId: 11004,
        name: "Clefairy",
        rarity: "Rare Holo",
        category: "Pokemon",
        estimatedPrice: 8.99
      },
      {
        cardNumber: "5/130",
        productId: 11005,
        name: "Gyarados",
        rarity: "Rare Holo",
        category: "Pokemon",
        estimatedPrice: 15.99
      },
      {
        cardNumber: "25/130",
        productId: 11025,
        name: "Pikachu",
        rarity: "Common",
        category: "Pokemon",
        estimatedPrice: 2.99
      },
      {
        cardNumber: "50/130",
        productId: 11050,
        name: "Energy Removal",
        rarity: "Common",
        category: "Trainer",
        estimatedPrice: 0.25
      },
      {
        cardNumber: "75/130",
        productId: 11075,
        name: "Professor Oak",
        rarity: "Uncommon",
        category: "Trainer",
        estimatedPrice: 1.99
      },
      {
        cardNumber: "100/130",
        productId: 11100,
        name: "Fighting Energy",
        rarity: "Common",
        category: "Energy",
        estimatedPrice: 0.10
      },
      {
        cardNumber: "130/130",
        productId: 11130,
        name: "Psychic Energy",
        rarity: "Common",
        category: "Energy",
        estimatedPrice: 0.10
      }
    ];

    // Import the sample cards
    await convex.mutation(api.sets.importSetCards, {
      setId: setId,
      cards: sampleCards
    });

    return NextResponse.json({
      success: true,
      message: "Demo set 'Pokemon Base Set 2' imported successfully",
      setId: setId,
      cardsImported: sampleCards.length
    });

  } catch (error) {
    console.error("Failed to import demo set:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import demo set",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}