import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    // Get all setCards that have pricing data
    const sets = await convex.query(api.sets.listSets, {});
    let totalSynced = 0;

    for (const set of sets) {
      const setWithCards = await convex.query(api.sets.getSetWithCards, { setId: set.setId });

      if (setWithCards?.cards) {
        const pricingEntries = setWithCards.cards
          .filter(card => card.estimatedPrice && card.estimatedPrice > 0)
          .map(card => ({
            productId: card.productId,
            categoryId: set.categoryId,
            currency: "USD",
            data: {
              marketPrice: card.estimatedPrice,
              results: [{
                subTypeName: "Normal",
                marketPrice: card.estimatedPrice,
                lowPrice: card.estimatedPrice * 0.8,
                midPrice: card.estimatedPrice * 0.9,
                highPrice: card.estimatedPrice * 1.2,
                directLowPrice: card.estimatedPrice * 0.7
              }]
            }
          }));

        if (pricingEntries.length > 0) {
          await convex.mutation(api.pricing.upsertPrices, {
            entries: pricingEntries
          });
          totalSynced += pricingEntries.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pricing cache synced successfully",
      totalSynced,
      setsProcessed: sets.length
    });

  } catch (error) {
    console.error("Failed to sync pricing cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync pricing cache",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}