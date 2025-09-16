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

    // Test API call - get categories
    const categoriesResponse = await fetch(`https://api.tcgplayer.com/${apiVersion}/catalog/categories`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `${token_type} ${access_token}`,
      },
    })

    if (!categoriesResponse.ok) {
      const errorText = await categoriesResponse.text()
      return NextResponse.json({
        error: "Failed to fetch categories",
        status: categoriesResponse.status,
        statusText: categoriesResponse.statusText,
        details: errorText
      }, { status: 500 })
    }

    const categoriesData = await categoriesResponse.json()

    // Test product search - search for a common card
    const searchResponse = await fetch(
      `https://api.tcgplayer.com/${apiVersion}/catalog/products?productName=Charizard&categoryId=1&limit=5`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `${token_type} ${access_token}`,
        },
      }
    )

    const searchData = searchResponse.ok ? await searchResponse.json() : null

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

    return NextResponse.json({
      success: true,
      message: "TCGPlayer API is working",
      data: {
        tokenAcquired: !!access_token,
        categoriesCount: categoriesData?.results?.length || 0,
        searchResultsCount: searchData?.results?.length || 0,
        pricingDataAvailable: !!pricingData,
        sampleCategory: categoriesData?.results?.[0],
        sampleProduct: searchData?.results?.[0],
        samplePricing: pricingData?.results?.[0]
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}