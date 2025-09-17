import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    // Try to debug what's in the database
    const allCollections = await convex.query(api.collections.listCollectionsWithCounts, {
      parentId: undefined
    });

    return NextResponse.json({
      success: true,
      collectionsFound: allCollections.length,
      collections: allCollections,
      message: `Found ${allCollections.length} collections in the database`
    });

  } catch (error) {
    console.error("Failed to query collections:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to query collections",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}