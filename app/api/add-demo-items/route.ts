import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user's collections
    const collections = await convex.query(api.collections.listCollectionsWithCounts, {
      parentId: undefined
    });

    if (collections.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No collections found. Create a collection first."
      });
    }

    // Use the first collection (Pokemon collection from the image)
    const targetCollection = collections[0];

    // Add some demo Pokemon cards from Base Set 2
    const demoItems = [
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11003, // Charizard
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo card from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11025, // Pikachu
        quantity: 2,
        condition: "Near Mint",
        notes: "Demo card from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 11002, // Blastoise
        quantity: 1,
        condition: "Lightly Played",
        notes: "Demo card from Base Set 2"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 12003, // Flareon from Jungle
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo card from Jungle set"
      },
      {
        collectionId: targetCollection._id,
        categoryId: 3, // Pokemon
        productId: 12004, // Jolteon from Jungle
        quantity: 1,
        condition: "Near Mint",
        notes: "Demo card from Jungle set"
      }
    ];

    // Add each item to the collection
    let itemsAdded = 0;
    for (const item of demoItems) {
      await convex.mutation(api.collections.addItem, item);
      itemsAdded++;
    }

    return NextResponse.json({
      success: true,
      message: `Added ${itemsAdded} demo cards to collection "${targetCollection.name}"`,
      collectionId: targetCollection._id,
      itemsAdded
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