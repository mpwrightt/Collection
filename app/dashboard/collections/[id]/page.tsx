"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

export default function CollectionDetailPage() {
  const params = useParams() as { id: string }
  const collectionId = params.id as string

  const addItem = useMutation(api.collections.addItem)
  const getCategories = useAction(api.tcg.getCategories)
  const getGroups = useAction(api.tcg.getGroups)
  const searchProducts = useAction(api.tcg.searchProducts)
  const getProductDetails = useAction(api.tcg.getProductDetails)
  const getProductMedia = useAction(api.tcg.getProductMedia)
  const getAllGroups = useAction(api.tcg.getAllGroups)
  const getSkus = useAction(api.tcg.getSkus)
  const getProductPrices = useAction(api.tcg.getProductPrices)
  const getSkuPrices = useAction(api.tcg.getSkuPrices)
  const upsertPrices = useMutation(api.pricing.upsertPrices)

  // Live stats and items
  const summary = useQuery(api.collections.collectionSummary, { collectionId: collectionId as any }) || { totalQuantity: 0, distinctProducts: 0, estimatedValue: 0 }
  const items = useQuery(api.collections.listItems, { collectionId: collectionId as any }) || []

  // Stable key for product set to avoid effect loops on array identity changes
  const itemsProductKey = React.useMemo(() => {
    const pids = Array.from(new Set((items as any[]).map((it: any) => Number(it.productId)).filter(Boolean)))
    pids.sort((a, b) => a - b)
    return JSON.stringify(pids)
  }, [items])

  const [open, setOpen] = React.useState(false)
  const [cardOpen, setCardOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const [categoryId, setCategoryId] = React.useState<string | undefined>(undefined)
  const [categories, setCategories] = React.useState<any[]>([])
  const [groups, setGroups] = React.useState<any[]>([])
  const [catQuery, setCatQuery] = React.useState("")
  const [groupQuery, setGroupQuery] = React.useState("")

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<any[]>([])
  const [selected, setSelected] = React.useState<any | null>(null)
  const [selectedDetails, setSelectedDetails] = React.useState<any | null>(null)
  const [selectedMedia, setSelectedMedia] = React.useState<any | null>(null)
  const [selectedGroup, setSelectedGroup] = React.useState<string | undefined>(undefined)
  const [quantity, setQuantity] = React.useState(1)
  const [mediaMap, setMediaMap] = React.useState<Record<string, string>>({})
  const [skus, setSkus] = React.useState<any[]>([])
  const [selectedSkuId, setSelectedSkuId] = React.useState<number | undefined>(undefined)

  // Enrichment for items table
  const [itemNames, setItemNames] = React.useState<Record<string, string>>({})
  const [itemThumbs, setItemThumbs] = React.useState<Record<string, string>>({})
  const [itemPrices, setItemPrices] = React.useState<Record<string, number>>({})
  const [skuPrices, setSkuPrices] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    ;(async () => {
      try {
        const cats = await getCategories({})
        const list = (cats?.Results ?? cats?.results ?? cats?.data ?? []) as any[]
        setCategories(list)
      } catch {}
    })()
  }, [getCategories])

  React.useEffect(() => {
    ;(async () => {
      try {
        if (!categoryId) { setGroups([]); setSelectedGroup(undefined); return }
        const res = await getAllGroups({ categoryId: Number(categoryId) })
        const anyRes: any = res
        const list = (anyRes?.Results ?? anyRes?.results ?? anyRes?.data ?? []) as any[]
        setGroups(list)
      } catch { setGroups([]) }
    })()
  }, [categoryId, getAllGroups])

  // When items change, fetch product names, thumbnails, and pricing
  React.useEffect(() => {
    ;(async () => {
      const pids: number[] = JSON.parse(itemsProductKey || "[]")
      if (pids.length === 0) { setItemNames({}); setItemThumbs({}); setItemPrices({}); return }
      try {
        // Details and pricing in parallel
        const [details, prices] = await Promise.all([
          getProductDetails({ productIds: pids }),
          getProductPrices({ productIds: pids }),
        ])
        const detailsAny: any = details
        const pricesAny: any = prices
        const dlist: any[] = (detailsAny?.results || detailsAny?.Results || detailsAny?.data || [])
        const plist: any[] = (pricesAny?.results || pricesAny?.Results || pricesAny?.data || [])

        // Map names
        const nameMap: Record<string, string> = {}
        for (const d of dlist) {
          const pid = String(d.productId ?? d.ProductId ?? d.product?.productId)
          if (!pid) continue
          const n = d.name ?? d.ProductName ?? d.product?.name ?? "Product"
          nameMap[pid] = n
        }
        setItemNames(nameMap)

        // Map prices and write to cache
        function parseMarketPrice(rec: any): number {
          if (!rec) return 0
          if (typeof rec.marketPrice === 'number') return rec.marketPrice
          if (rec.price?.market) return Number(rec.price.market) || 0
          if (rec.results?.[0]?.marketPrice) return Number(rec.results[0].marketPrice) || 0
          if (rec.Results?.[0]?.marketPrice) return Number(rec.Results[0].marketPrice) || 0
          return Number(rec.market) || 0
        }
        const priceMap: Record<string, number> = {}
        const upsertEntries: any[] = []
        for (const rec of plist) {
          const pidNum: number | undefined = Number(rec.productId ?? rec.ProductId ?? rec.productId)
          if (!pidNum) continue
          const marketPrice = parseMarketPrice(rec)
          priceMap[String(pidNum)] = marketPrice
          // Use any item's categoryId for this product
          const anyItem = (items as any[]).find((it) => Number(it.productId) === pidNum)
          upsertEntries.push({
            productId: pidNum,
            skuId: undefined,
            categoryId: Number(anyItem?.categoryId ?? 0),
            currency: 'USD',
            data: rec,
          })
        }
        setItemPrices(priceMap)
        if (upsertEntries.length > 0) {
          try { await upsertPrices({ entries: upsertEntries }) } catch {}
        }

        // Fallback A: fetch SKU prices for rows where product price is missing/zero and we already have a skuId on the item
        const missingSkuIds = Array.from(new Set((items as any[])
          .filter((it) => (priceMap[String(it.productId)] ?? 0) <= 0 && it.skuId)
          .map((it) => Number(it.skuId)))) as number[]
        if (missingSkuIds.length > 0) {
          try {
            const skuResp = await getSkuPrices({ skuIds: missingSkuIds })
            const anySku: any = skuResp
            const slist: any[] = (anySku?.results || anySku?.Results || anySku?.data || [])
            const sMap: Record<string, number> = {}
            const upsertSkuEntries: any[] = []
            const skuToProduct: Record<string, number> = {}
            for (const it of (items as any[])) {
              if (it.skuId) skuToProduct[String(it.skuId)] = Number(it.productId)
            }
            for (const s of slist) {
              const sid = String(s.skuId ?? s.SkuId ?? s.id)
              const sPrice = parseMarketPrice(s)
              if (sid) sMap[sid] = sPrice
              const pid = skuToProduct[sid]
              if (pid) {
                // Upsert sku-level and also product-level fallback for summary queries
                upsertSkuEntries.push({ productId: pid, skuId: Number(sid), categoryId: 0, currency: 'USD', data: s })
                upsertSkuEntries.push({ productId: pid, skuId: undefined, categoryId: 0, currency: 'USD', data: { marketPrice: sPrice } })
                // also reflect in page-level price map so UI updates immediately
                priceMap[String(pid)] = priceMap[String(pid)] || sPrice
              }
            }
            setSkuPrices(sMap)
            if (upsertSkuEntries.length > 0) {
              try { await upsertPrices({ entries: upsertSkuEntries }) } catch {}
            }
          } catch {}
        }

        // Fallback B: for products that still have no product price and no skuId on their items, try to fetch a SKU via getSkus and then price that SKU
        const productsNeedingSkus: number[] = Array.from(new Set((items as any[])
          .filter((it) => (priceMap[String(it.productId)] ?? 0) <= 0 && !it.skuId)
          .map((it) => Number(it.productId))))
        if (productsNeedingSkus.length > 0) {
          try {
            const skuListResp = await getSkus({ productIds: productsNeedingSkus })
            const sAny: any = skuListResp
            const skusForProducts: any[] = (sAny?.results || sAny?.Results || sAny?.data || [])
            const firstSkuByProduct = new Map<number, number>()
            for (const s of skusForProducts) {
              const pid = Number(s.productId ?? s.ProductId)
              const sid = Number(s.skuId ?? s.SkuId)
              if (pid && sid && !firstSkuByProduct.has(pid)) firstSkuByProduct.set(pid, sid)
            }
            const skuIdsToPrice = Array.from(firstSkuByProduct.values())
            if (skuIdsToPrice.length > 0) {
              const skuResp2 = await getSkuPrices({ skuIds: skuIdsToPrice })
              const anySku2: any = skuResp2
              const s2list: any[] = (anySku2?.results || anySku2?.Results || anySku2?.data || [])
              const upserts: any[] = []
              for (const s of s2list) {
                const sid = Number(s.skuId ?? s.SkuId ?? s.id)
                const price = parseMarketPrice(s)
                // map back to product
                const pidEntry = Array.from(firstSkuByProduct.entries()).find(([, id]) => id === sid)
                if (pidEntry) {
                  const [pid] = pidEntry
                  // update UI maps
                  priceMap[String(pid)] = priceMap[String(pid)] || price
                  // cache upserts
                  upserts.push({ productId: pid, skuId: sid, categoryId: 0, currency: 'USD', data: s })
                  upserts.push({ productId: pid, skuId: undefined, categoryId: 0, currency: 'USD', data: { marketPrice: price } })
                }
              }
              if (upserts.length > 0) {
                try { await upsertPrices({ entries: upserts }) } catch {}
              }
            }
          } catch {}
        }
        // reflect any updates to product-level map
        setItemPrices({ ...priceMap })

        // Thumbnails – direct URL pattern, no API calls needed
        const thumbMap: Record<string, string> = {}
        for (const pid of pids) {
          thumbMap[String(pid)] = `https://product-images.tcgplayer.com/${pid}.jpg`
        }
        setItemThumbs(thumbMap)
      } catch {
        // Swallow to keep UI responsive
      }
    })()
  // Only re-run when the set of productIds changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsProductKey])

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    try {
      const cid = categoryId ? Number(categoryId) : undefined
      const gid = selectedGroup ? Number(selectedGroup) : undefined
      const res = await searchProducts({ productName: query, categoryId: cid, groupId: gid, limit: 40, offset: 0 })
      const items = (res?.results || res?.Results || res?.data || []).map((r: any) => r)
      setResults(items)
      // Direct URLs for search results thumbnails
      const thumbMap: Record<string, string> = {}
      for (const r of items) {
        const pid = Number(r.productId || r.ProductId || r.product?.productId)
        if (pid) thumbMap[String(pid)] = `https://product-images.tcgplayer.com/${pid}.jpg`
      }
      setMediaMap(thumbMap)
      setSelected(null)
      setSelectedDetails(null)
      setSelectedMedia(null)
    } finally {
      setBusy(false)
    }
  }

  async function onSelectProduct(r: any) {
    setSelected(r)
    const productId = Number(r.productId || r.ProductId || r.product?.productId)
    try {
      const [details, media, skusResp] = await Promise.all([
        getProductDetails({ productIds: [productId] }),
        getProductMedia({ productId }),
        getSkus({ productIds: [productId] }),
      ])
      setSelectedDetails(details)
      setSelectedMedia(media)
      const skuList = skusResp?.results || skusResp?.Results || skusResp?.data || []
      setSkus(skuList)
      setSelectedSkuId(undefined)
      setCardOpen(true)
    } catch {
      setSelectedDetails(null)
      setSelectedMedia(null)
    }
  }

  async function onAddSelected() {
    if (!selected) return
    const productId = Number(selected.productId || selected.ProductId || selected.product?.productId)
    const resolvedCategoryId = (selected.categoryId || selected.CategoryId || selected.category?.categoryId || (categoryId ? Number(categoryId) : undefined)) as number | undefined
    await addItem({ collectionId: collectionId as any, categoryId: resolvedCategoryId ?? 0, productId, skuId: selectedSkuId, quantity })
    setOpen(false)
    setSelected(null)
    setSelectedDetails(null)
    setSelectedMedia(null)
    setResults([])
    setQuery("")
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Folder</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add cards</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Add cards to folder</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <form onSubmit={onSearch} className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    placeholder="Filter categories..."
                    value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                  />
                  <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSelectedGroup(undefined) }}>
                    <SelectTrigger id="category"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {categories
                        .filter((c: any) => !catQuery || (c.name || "").toLowerCase().includes(catQuery.toLowerCase()))
                        .map((c) => (
                        <SelectItem key={(c as any).categoryId} value={String((c as any).categoryId)}>
                          {(c as any).name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="group">Set (Group)</Label>
                  <Input
                    placeholder="Filter sets..."
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger id="group"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {groups
                        .filter((g: any) => !groupQuery || (g.name || g.groupName || "").toLowerCase().includes(groupQuery.toLowerCase()))
                        .map((g) => (
                        <SelectItem key={(g as any).groupId} value={String((g as any).groupId)}>
                          {(g as any).name || (g as any).groupName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="q">Search</Label>
                  <div className="flex gap-2">
                    <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Charizard, Pikachu, Black Lotus" />
                    <Button type="submit" disabled={busy}>Search</Button>
                  </div>
                </div>
              </form>

              {results.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 max-h-[55vh] overflow-y-auto pr-1">
                  {results.map((r) => {
                    const pid = r.productId || r.ProductId || r.product?.productId
                    const name = r.name || r.ProductName || r.product?.name || "Product"
                    return (
                      <button key={pid} onClick={() => onSelectProduct(r)} className="rounded-md border p-2 text-left hover:bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 rounded-md border bg-muted overflow-hidden">
                            {mediaMap[String(pid)] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaMap[String(pid)]} alt="" className="size-full object-cover" />
                            ) : (
                              <Skeleton className="size-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium line-clamp-1">{name}</div>
                            <div className="text-xs text-muted-foreground">#{pid}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Small stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="text-base">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular-nums">{summary.totalQuantity}</div></CardContent>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="text-base">Distinct Products</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular-nums">{summary.distinctProducts}</div></CardContent>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="text-base">Estimated Value</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular-nums">{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(summary.estimatedValue || 0)}</div></CardContent>
        </Card>
      </div>

      {/* Card detail Focused Modal */}
      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Card Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              {/* Always use direct product image URL */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Card image"
                src={`https://product-images.tcgplayer.com/${selected?.productId || selected?.ProductId || selected?.product?.productId}.jpg`}
                className="w-40 rounded-md border object-cover"
              />
              <div className="text-sm">
                <div className="font-medium">{selected?.name || selected?.ProductName || selected?.product?.name || "Product"}</div>
                <div className="text-muted-foreground">#{selected?.productId || selected?.ProductId || selected?.product?.productId}</div>
                <div className="mt-2 grid gap-1">
                  {selectedDetails?.results?.[0]?.cleanName && (
                    <div>Clean Name: {selectedDetails.results[0].cleanName}</div>
                  )}
                  {selected?.groupName && <div>Set: {selected.groupName}</div>}
                  {(selected?.categoryId || selected?.CategoryId) && <div>Category ID: {selected.categoryId || selected.CategoryId}</div>}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {skus.length > 0 && (
                <div className="grid gap-2">
                  <Label>SKUs</Label>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                    {skus.map((s: any) => (
                      <button
                        key={s.skuId || s.SkuId}
                        className={`w-full text-left rounded px-2 py-1 hover:bg-muted ${selectedSkuId === (s.skuId || s.SkuId) ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedSkuId(Number(s.skuId || s.SkuId))}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">#{s.skuId || s.SkuId}</span>
                          <span className="text-xs text-muted-foreground">{s.printing || s.finish || s.condition || 'SKU'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={onAddSelected}>Add to folder</Button>
                <Button variant="outline" onClick={() => setCardOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items in this folder */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-2 pr-4">Card</th>
                    <th className="text-left py-2 pr-4">SKU</th>
                    <th className="text-left py-2 pr-4">Qty</th>
                    <th className="text-left py-2 pr-4">Price</th>
                    <th className="text-left py-2 pr-4">Total</th>
                    <th className="text-left py-2 pr-4">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => {
                    const pidKey = String(it.productId)
                    const unit = (itemPrices[pidKey] ?? 0) > 0
                      ? (itemPrices[pidKey] ?? 0)
                      : (it.skuId ? (skuPrices[String(it.skuId)] ?? 0) : 0)
                    const total = unit * (it.quantity ?? 0)
                    return (
                    <tr key={it._id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onSelectProduct({ productId: it.productId, name: itemNames[String(it.productId)] })}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-md border bg-muted overflow-hidden">
                            {itemThumbs[String(it.productId)] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={itemThumbs[String(it.productId)]} alt="" className="size-full object-cover" />
                            ) : (
                              <Skeleton className="size-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{itemNames[String(it.productId)] ?? `#${it.productId}`}</div>
                            <div className="text-xs text-muted-foreground">#{it.productId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-4">{it.skuId ?? '-'}</td>
                      <td className="py-2 pr-4">{it.quantity}</td>
                      <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(unit)}</td>
                      <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(total)}</td>
                      <td className="py-2 pr-4">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
