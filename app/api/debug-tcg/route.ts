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

    // Get all categories to see what's available
    const categoriesResponse = await fetch(`https://api.tcgplayer.com/${apiVersion}/catalog/categories`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `${token_type} ${access_token}`,
      },
    })

    const categoriesData = await categoriesResponse.json()

    // Test with known products from existing test data (product IDs 121, 122, 123)
    const testProductIds = [121, 122, 123]

    // Get product details
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
    const detailsData = detailsResponse.ok ? await detailsResponse.json() : null

    // Get pricing for test products
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
    const pricingData = pricingResponse.ok ? await pricingResponse.json() : null

    // Get SKUs for test products
    const skuResponse = await fetch(
      `https://api.tcgplayer.com/${apiVersion}/catalog/products/${testProductIds.join(',')}/skus`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `${token_type} ${access_token}`,
        },
      }
    )
    const skuData = skuResponse.ok ? await skuResponse.json() : null

    // Test SKU pricing if we have SKUs
    let skuPricingData = null
    if (skuData?.results?.length > 0) {
      const skuIds = skuData.results.slice(0, 5).map((sku: any) => sku.skuId || sku.productConditionId).join(',')
      if (skuIds) {
        const skuPricingResponse = await fetch(
          `https://api.tcgplayer.com/${apiVersion}/pricing/sku/${skuIds}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `${token_type} ${access_token}`,
            },
          }
        )
        skuPricingData = skuPricingResponse.ok ? await skuPricingResponse.json() : null
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        allCategories: categoriesData.results,
        testProductDetails: detailsData,
        testProductPricing: pricingData,
        testProductSkus: skuData,
        testSkuPricing: skuPricingData,
        apiVersion,
        debugInfo: {
          detailsStatus: detailsResponse.status,
          pricingStatus: pricingResponse.status,
          skuStatus: skuResponse.status,
          testProductIds
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