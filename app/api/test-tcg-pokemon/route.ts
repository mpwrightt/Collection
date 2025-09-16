import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables
    const clientId = process.env.TCGPLAYER_CLIENT_ID
    const clientSecret = process.env.TCGPLAYER_CLIENT_SECRET
    const apiVersion = process.env.TCGPLAYER_API_VERSION || "v1.39.0"

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: "Missing TCGPlayer credentials",
        details: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          apiVersion
        }
      }, { status: 500 })
    }

    // Test token acquisition
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return NextResponse.json({
        error: "Failed to get TCGPlayer token",
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        details: errorText
      }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const { access_token, token_type } = tokenData

    // Test API call - get categories and find Pokemon
    const categoriesResponse = await fetch(`https://api.tcgplayer.com/${apiVersion}/catalog/categories`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `${token_type} ${access_token}`,
      },
    })

    const categoriesData = await categoriesResponse.json()
    const pokemonCategory = categoriesData.results?.find((cat: any) =>
      cat.name.toLowerCase().includes('pokemon') || cat.displayName?.toLowerCase().includes('pokemon')
    )

    // Test product search with Pokemon category
    let searchData = null
    if (pokemonCategory) {
      const searchResponse = await fetch(
        `https://api.tcgplayer.com/${apiVersion}/catalog/products?productName=Charizard&categoryId=${pokemonCategory.categoryId}&limit=5`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `${token_type} ${access_token}`,
          },
        }
      )
      searchData = searchResponse.ok ? await searchResponse.json() : null
    }

    // Test SKUs for first product found
    let skuData = null
    if (searchData?.results?.length > 0) {
      const productId = searchData.results[0].productId
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
      skuData = skuResponse.ok ? await skuResponse.json() : null
    }

    // Test pricing for first product found
    let pricingData = null
    if (searchData?.results?.length > 0) {
      const productId = searchData.results[0].productId
      const pricingResponse = await fetch(
        `https://api.tcgplayer.com/${apiVersion}/pricing/product/${productId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `${token_type} ${access_token}`,
          },
        }
      )
      pricingData = pricingResponse.ok ? await pricingResponse.json() : null
    }

    // Test SKU-level pricing if we have SKUs
    let skuPricingData = null
    if (skuData?.results?.length > 0) {
      const skuIds = skuData.results.slice(0, 3).map((sku: any) => sku.skuId).join(',')
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

    return NextResponse.json({
      success: true,
      message: "Pokemon TCGPlayer API test complete",
      data: {
        tokenAcquired: !!access_token,
        categoriesCount: categoriesData?.results?.length || 0,
        pokemonCategoryFound: !!pokemonCategory,
        pokemonCategory: pokemonCategory,
        searchResultsCount: searchData?.results?.length || 0,
        skuCount: skuData?.results?.length || 0,
        pricingDataAvailable: !!pricingData,
        skuPricingDataAvailable: !!skuPricingData,
        sampleProduct: searchData?.results?.[0],
        sampleSku: skuData?.results?.[0],
        samplePricing: pricingData?.results?.[0],
        sampleSkuPricing: skuPricingData?.results?.[0]
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}