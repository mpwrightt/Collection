import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const clientId = process.env.TCGPLAYER_CLIENT_ID
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET
    const apiVersion = process.env.TCGPLAYER_API_VERSION || "v1.39.0"

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: "Missing TCGPlayer credentials"
      }, { status: 500 })
    }

    // Get token
    const tokenResponse = await fetch("https://api.tcgplayer.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    const tokenData = await tokenResponse.json()
    const { access_token, token_type } = tokenData

    // Test the complete flow with the same products used in the app
    const testProductIds = [121, 122, 123]

    // 1. Get product details
    console.log("Fetching product details...")
    const detailsResponse = await fetch(
      `https://api.tcgplayer.com/${apiVersion}/catalog/products/${testProductIds.join(',')}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `${token_type} ${access_token}`,
        },
      }
    )
    const detailsData = await detailsResponse.json()
    console.log("Product details:", detailsData.results?.length, "products")

    // 2. Get pricing (this is the key part)
    console.log("Fetching product pricing...")
    const pricingResponse = await fetch(
      `https://api.tcgplayer.com/${apiVersion}/pricing/product/${testProductIds.join(',')}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `${token_type} ${access_token}`,
        },
      }
    )
    const pricingData = await pricingResponse.json()
    console.log("Pricing data:", pricingData.results?.length, "price records")

    // 3. Process pricing data the same way the app does
    const priceMap: Record<string, number> = {}
    for (const rec of pricingData.results || []) {
      const pid = String(rec.productId)
      if (!pid) continue

      let market = 0
      const subType = rec.subTypeName || 'Normal'

      // Only use Normal (non-foil) pricing for now, or use any available price
      if (subType === 'Normal' || !priceMap[pid]) {
        if (typeof rec.marketPrice === 'number') {
          market = rec.marketPrice
        } else if (typeof rec.midPrice === 'number') {
          market = rec.midPrice
        } else if (typeof rec.lowPrice === 'number') {
          market = rec.lowPrice
        }

        if (market > 0 && (subType === 'Normal' || !priceMap[pid])) {
          priceMap[pid] = market
        }
      }
    }

    // 4. Test individual SKUs (this was problematic before)
    let skuResults = []
    for (const productId of testProductIds) {
      try {
        const skuResponse = await fetch(
          `https://api.tcgplayer.com/${apiVersion}/catalog/products/${productId}/skus`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `${token_type} ${access_token}`,
            },
          }
        )

        if (skuResponse.ok) {
          const skuData = await skuResponse.json()
          skuResults.push({
            productId,
            skuCount: skuData.results?.length || 0,
            skus: skuData.results?.slice(0, 2) // First 2 SKUs for testing
          })
        } else {
          skuResults.push({
            productId,
            error: `${skuResponse.status}: ${skuResponse.statusText}`
          })
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 100))
      } catch (error) {
        skuResults.push({
          productId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Complete TCGPlayer flow test",
      data: {
        tokenAcquired: !!access_token,
        products: detailsData.results,
        pricing: pricingData.results,
        processedPrices: priceMap,
        skuResults,
        totalValue: Object.values(priceMap).reduce((sum, price) => sum + price, 0),
        flowTest: {
          detailsSuccess: detailsResponse.ok,
          pricingSuccess: pricingResponse.ok,
          pricesProcessed: Object.keys(priceMap).length,
          averagePrice: Object.values(priceMap).reduce((sum, price) => sum + price, 0) / Math.max(Object.keys(priceMap).length, 1)
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}