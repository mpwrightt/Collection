import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    // Get all collections (this will work without authentication for demo purposes)
    const collections = await convex.query(api.collections.listCollectionsWithCounts, {
      parentId: undefined
    });

    if (collections.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No collections found. Please create a collection first."
      });
    }

    // Use the first collection
    const targetCollection = collections[0];

    // Add demo Pokemon cards that match our pricing data
    const demoItems = [
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11003, // Charizard from Base Set 2 - $89.99
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo Charizard from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11025, // Pikachu from Base Set 2 - $2.99
        quantity: 3,
        condition: "Near Mint",
        notes: "Demo Pikachu cards from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11002, // Blastoise from Base Set 2 - $25.99
        quantity: 1,
        condition: "Lightly Played",
        notes: "Demo Blastoise from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 12003, // Flareon from Jungle - $35.99
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo Flareon from Jungle set"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 12004, // Jolteon from Jungle - $32.99
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo Jolteon from Jungle set"
      }
    ];

    let itemsAdded = 0;
    for (const item of demoItems) {
      await convex.mutation(api.collections.addItem, item);
      itemsAdded++;
    }

    // Calculate total estimated value
    const totalValue = (89.99 * 1) + (2.99 * 3) + (25.99 * 1) + (35.99 * 1) + (32.99 * 1);

    return NextResponse.json({
      success: true,
      message: `Added ${itemsAdded} demo cards to collection "${targetCollection.name}"`,
      collectionId: targetCollection._id,
      itemsAdded,
      estimatedValue: totalValue,
      cards: [
        "1x Charizard ($89.99)",
        "3x Pikachu ($2.99 each)",
        "1x Blastoise ($25.99)",
        "1x Flareon ($35.99)",
        "1x Jolteon ($32.99)"
      ]
    });

  } catch (error) {
    console.error("Failed to add demo items:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add demo items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}