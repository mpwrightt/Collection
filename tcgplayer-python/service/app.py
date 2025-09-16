import os
import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure local .env is loaded if present
load_dotenv()

try:
    from tcgplayer_client import TCGPlayerClient
except Exception as e:
    raise RuntimeError(
        "Failed to import tcgplayer_client. Make sure to install the package (pip install -e .)"
    ) from e

client: Optional[TCGPlayerClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client_id = os.getenv("TCGPLAYER_CLIENT_ID")
    client_secret = os.getenv("TCGPLAYER_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("Missing TCGPLAYER_CLIENT_ID or TCGPLAYER_CLIENT_SECRET environment variables")

    client = TCGPlayerClient(client_id=client_id, client_secret=client_secret)
    # Authenticate at startup
    await client.authenticate()
    yield
    # Cleanup
    if client:
        await client.close()


app = FastAPI(title="TCGplayer Python Service", version="0.1.0", lifespan=lifespan)

# If you need CORS for local dev UIs, you can relax origins here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    status = await client.get_rate_limit_status_async()
    return {"ok": True, "rate_limit": status}


@app.get("/categories")
async def get_categories():
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        return await client.endpoints.catalog.get_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/category-media")
async def get_category_media(categoryId: int = Query(..., description="Category ID")):
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        return await client.endpoints.catalog.get_category_media(categoryId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/groups")
async def get_groups(
    categoryId: Optional[int] = None,
    name: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
):
    """List groups (sets), optionally filtered by categoryId and name.

    This uses the documented endpoint /catalog/groups with optional params.
    """
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        params = {}
        if categoryId is not None:
            params["categoryId"] = categoryId
        if name:
            params["groupName"] = name
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        return await client._make_api_request("/catalog/groups", params=params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/skus")
async def get_skus(productIds: str = Query(..., description="Comma-separated product IDs")):
    """Fetch SKUs for one or more product IDs."""
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        ids: List[int] = [int(x) for x in productIds.split(",") if x]
        return await client.endpoints.catalog.get_skus(ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media")
async def get_media(productId: int = Query(..., description="Single product ID")):
    """Get media for a product (image URLs)."""
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        # The endpoint helper expects a list; for single product we use the single-product path
        return await client.endpoints.catalog.get_product_media([productId])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/product-details")
async def get_product_details(ids: str = Query(..., description="Comma-separated product IDs")):
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        product_ids: List[int] = [int(x) for x in ids.split(",") if x]
        return await client.endpoints.catalog.get_product_details(product_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products")
async def get_products(
    categoryId: Optional[int] = None,
    groupId: Optional[int] = None,
    productName: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
):
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        return await client.endpoints.catalog.get_products(
            category_id=categoryId,
            group_id=groupId,
            product_name=productName,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/pricing/products")
async def get_product_prices(ids: str = Query(..., description="Comma-separated product IDs")):
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        product_ids: List[int] = [int(x) for x in ids.split(",") if x]
        return await client.endpoints.pricing.get_market_prices(product_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/pricing/skus")
async def get_sku_prices(ids: str = Query(..., description="Comma-separated SKU IDs")):
    if not client:
        raise HTTPException(status_code=503, detail="Client not initialized")
    try:
        sku_ids: List[int] = [int(x) for x in ids.split(",") if x]
        return await client.endpoints.pricing.get_sku_market_prices(sku_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
