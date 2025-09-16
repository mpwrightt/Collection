# TCGplayer Integration

Timestamp: 2025-09-15T17:48:09-04:00

## Access & Auth
- Bearer token cached in Convex; never expose secrets to the browser.
- Global rate limit ~10 rps; we throttle requests in Convex.

## Convex Actions
- `getCategories` — list all categories
- `getGroups` — list sets by category (with optional name filter)
- `getAllGroups` — page through all sets for a category
- `searchProducts` — by name with optional `categoryId`/`groupId`
- `getProductDetails` — metadata
- `getProductMedia` — images
- `getSkus` — SKU list for a product
- `getCategoryMedia` — icon/banner for categories

## Python Service (optional)
- Endpoints: `/categories`, `/groups`, `/skus`, `/media`, `/product-details`, `/category-media`
- Use via `TCGPY_PUBLIC_URL`; otherwise Convex calls TCGplayer directly.
