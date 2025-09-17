import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user's collection items
    const collections = await convex.query(api.collections.listCollectionsWithCounts, {
      parentId: undefined
    });

    if (collections.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No collections found"
      });
    }

    const pokemonCollection = collections.find(c => c.name.toLowerCase().includes('pokemon'));

    if (!pokemonCollection) {
      return NextResponse.json({
        success: false,
        error: "No Pokemon collection found"
      });
    }

    // Get items in the Pokemon collection
    const items = await convex.query(api.collections.listItems, {
      collectionId: pokemonCollection._id
    });

    if (items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No items found in Pokemon collection"
      });
    }

    // Create mock pricing for the user's actual cards
    const pricingEntries = items.map(item => ({
      productId: item.productId,
      categoryId: item.categoryId,
      currency: "USD",
      data: {
        marketPrice: Math.random() * 50 + 5, // Random price between $5-$55
        results: [{
          subTypeName: "Normal",
          marketPrice: Math.random() * 50 + 5,
          lowPrice: Math.random() * 30 + 2,
          midPrice: Math.random() * 40 + 3,
          highPrice: Math.random() * 60 + 10,
          directLowPrice: Math.random() * 25 + 1
        }]
      }
    }));

    // Upsert pricing data
    await convex.mutation(api.pricing.upsertPrices, {
      entries: pricingEntries
    });

    return NextResponse.json({
      success: true,
      message: `Created pricing data for ${pricingEntries.length} cards in Pokemon collection`,
      collectionName: pokemonCollection.name,
      itemCount: items.length,
      pricingEntriesCreated: pricingEntries.length
    });

  } catch (error) {
    console.error("Failed to sync user pricing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync user pricing",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}