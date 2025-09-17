"use client"

import * as React from "react"
import { useAction, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Sparkles, ShoppingCart } from "lucide-react"

function formatCurrency(value?: number) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
}

export default function DeckAiPage() {
  const params = useParams() as { id: string }
  const router = useRouter()

  const deckData = useQuery(api.decks.getDeck, params?.id ? ({ deckId: params.id } as any) : "skip") as any
  const holdingsData = useQuery(api.dashboard.getHoldings, { limit: 1000, offset: 0 }) || { rows: [], total: 0 }

  const analyzeDeck = useAction(api.ai.analyzeDeck)
  const getProductDetails = useAction(api.tcg.getProductDetails)
  const getProductPrices = useAction(api.tcg.getProductPrices)

  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<any | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const deckCards = React.useMemo<{
    productId: number
    skuId?: number
    quantity: number
    section: string
  }[]>(() => {
    return (deckData?.cards ?? []).map((c: any) => ({
      productId: Number(c.productId),
      skuId: typeof c.skuId === "number" ? c.skuId : undefined,
      quantity: Number(c.quantity ?? 0),
      section: (c.section as string) || "main",
    }))
  }, [deckData])

  const holdings = React.useMemo(() => {
    return (holdingsData?.rows ?? []).map((r: any) => ({
      productId: Number(r.productId),
      skuId: r.skuId ?? undefined,
      quantity: Number(r.quantity ?? 0),
    }))
  }, [holdingsData])

  const stats = React.useMemo(() => {
    const bySection: Record<string, number> = {}
    let missingCopies = 0
    let total = 0
    for (const c of deckCards) {
      const sec = c.section || "main"
      const q = c.quantity || 0
      bySection[sec] = (bySection[sec] || 0) + q
      total += q
      const owned = (holdings.find((h: any) => h.productId === c.productId && String(h.skuId ?? "_") === String(c.skuId ?? "_"))?.quantity
        ?? holdings.filter((h: any) => h.productId === c.productId).reduce((s: number, h: any) => s + (h.quantity || 0), 0))
      missingCopies += Math.max(0, q - (owned || 0))
    }
    return { bySection, total, missingCopies }
  }, [deckCards, holdings])

  // Product info and price maps for display
  const [productInfo, setProductInfo] = React.useState<Record<string, { name: string; imageUrl: string; url: string }>>({})
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({})

  const fallbackImage = React.useCallback((productId: number) => `https://product-images.tcgplayer.com/${productId}.jpg`, [])
  const parseProductDetails = React.useCallback((payload: any): { productId: number; name: string; url: string; imageUrl: string }[] => {
    const out: { productId: number; name: string; url: string; imageUrl: string }[] = []
    const list = Array.isArray(payload) ? payload : (payload?.results || payload?.Results || payload?.data || [])
    for (const item of list) {
      const productId = Number(item?.productId ?? item?.ProductId ?? item?.product?.productId)
      if (!Number.isFinite(productId)) continue
      const name = item?.name ?? item?.ProductName ?? item?.product?.name ?? `#${productId}`
      const url = item?.url ?? item?.product?.url ?? `https://www.tcgplayer.com/product/${productId}`
      const imageUrl = item?.imageUrl ?? item?.productImage ?? fallbackImage(productId)
      out.push({ productId, name, url, imageUrl })
    }
    return out
  }, [fallbackImage])

  React.useEffect(() => {
    const set = new Set<number>(deckCards.map((c) => c.productId))
    const missing: number[] = Array.from(set).filter((pid: number) => !productInfo[String(pid)])
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      const collected: Record<string, { name: string; imageUrl: string; url: string }> = {}
      for (let i = 0; i < missing.length; i += 25) {
        const chunk: number[] = missing.slice(i, i + 25)
        try {
          const payload = await getProductDetails({ productIds: chunk })
          for (const rec of parseProductDetails(payload)) {
            collected[String(rec.productId)] = { name: rec.name, imageUrl: rec.imageUrl, url: rec.url }
          }
        } catch {}
      }
      if (!cancelled && Object.keys(collected).length) setProductInfo((prev) => ({ ...prev, ...collected }))
    })()
    return () => { cancelled = true }
  }, [deckCards, productInfo, getProductDetails, parseProductDetails])

  React.useEffect(() => {
    const set = new Set<number>(deckCards.map((c) => c.productId))
    const ids: number[] = Array.from(set).filter((pid: number) => priceMap[String(pid)] === undefined)
    if (ids.length === 0) return
    let cancelled = false
    ;(async () => {
      const collected: Record<string, number> = {}
      for (let i = 0; i < ids.length; i += 25) {
        const chunk: number[] = ids.slice(i, i + 25)
        try {
          const payload = await getProductPrices({ productIds: chunk })
          const list: any[] = payload?.results || payload?.Results || payload?.data || []
          for (const entry of list) {
            const pid = Number(entry?.productId ?? entry?.ProductId)
            if (!Number.isFinite(pid)) continue
            const val = [entry?.marketPrice, entry?.midPrice, entry?.lowPrice, entry?.price]?.find((x: any) => typeof x === 'number')
            if (typeof val === 'number') collected[String(pid)] = val
          }
        } catch {}
      }
      if (!cancelled && Object.keys(collected).length) setPriceMap((prev) => ({ ...prev, ...collected }))
    })()
    return () => { cancelled = true }
  }, [deckCards, priceMap, getProductPrices])

  // Missing rows by product
  const missingRows = React.useMemo(() => {
    type Row = { productId: number; missing: number; price?: number; name: string; imageUrl: string; url: string }
    const agg = new Map<number, { missing: number }>()
    for (const c of deckCards) {
      const owned = holdings.find((h: any) => h.productId === c.productId && String(h.skuId ?? "_") === String(c.skuId ?? "_"))?.quantity
        ?? holdings.filter((h: any) => h.productId === c.productId).reduce((s: number, h: any) => s + (h.quantity || 0), 0)
      const miss = Math.max(0, (c.quantity || 0) - (owned || 0))
      if (miss <= 0) continue
      agg.set(c.productId, { missing: (agg.get(c.productId)?.missing || 0) + miss })
    }
    const rows: Row[] = []
    for (const [pid, { missing }] of agg) {
      const key = String(pid)
      const info = productInfo[key] ?? { name: `#${pid}`, imageUrl: fallbackImage(pid), url: `https://www.tcgplayer.com/product/${pid}` }
      rows.push({ productId: pid, missing, price: priceMap[key], name: info.name, imageUrl: info.imageUrl, url: info.url })
    }
    rows.sort((a, b) => (b.price ?? 0) * b.missing - (a.price ?? 0) * a.missing)
    return rows
  }, [deckCards, holdings, productInfo, priceMap, fallbackImage])

  const csvContent = React.useMemo(() => {
    if (missingRows.length === 0) return ""
    const header = "productId,quantity"
    const lines = missingRows.map((r) => `${r.productId},${r.missing}`)
    return [header, ...lines].join("\n")
  }, [missingRows])

  const handleAnalyze = React.useCallback(async () => {
    if (!deckData?.deck) return
    setBusy(true)
    setError(null)
    try {
      const out = await analyzeDeck({
        tcg: deckData.deck.tcg,
        format: deckData.deck.formatCode ?? undefined,
        deck: {
          name: deckData.deck.name || "Untitled Deck",
          cards: deckCards,
        },
        holdings,
      })
      setResult(out)
    } catch (e: any) {
      setError(e?.message ?? "Analysis failed")
      setResult(null)
    } finally {
      setBusy(false)
    }
  }, [deckData, deckCards, holdings, analyzeDeck])

  if (!deckData) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading deck...
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.push("/dashboard/decks/saved")}>Back to My Decks</Button>
        <Link href={`/dashboard/decks?deck=${String(deckData.deck._id)}`} className="ml-auto">
          <Button variant="outline">Open in Builder</Button>
        </Link>
        <Button onClick={handleAnalyze} disabled={busy}>
          {busy ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Analyze Deck</span>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{deckData.deck.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">Game: {deckData.deck.tcg}</Badge>
            {deckData.deck.formatCode && (
              <Badge variant="secondary">Format: {deckData.deck.formatCode}</Badge>
            )}
            <Badge variant="secondary">Total Cards: {stats.total}</Badge>
            <Badge variant="secondary">Missing Copies: {stats.missingCopies}</Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {result ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Summary & Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.ai?.analysis?.summary && (
                <div>
                  <div className="text-sm text-muted-foreground">{result.ai.analysis.summary}</div>
                </div>
              )}
              {(() => {
                const strengths = Array.isArray(result?.ai?.analysis?.strengths) ? result.ai.analysis.strengths : []
                return strengths.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold mb-1">Strengths</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {strengths.map((s: any, i: number) => <li key={i}>• {String(s)}</li>)}
                  </ul>
                </div>
                ) : null
              })()}
              {(() => {
                const weaknesses = Array.isArray(result?.ai?.analysis?.weaknesses) ? result.ai.analysis.weaknesses : []
                return weaknesses.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold mb-1">Weaknesses</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {weaknesses.map((s: any, i: number) => <li key={i}>• {String(s)}</li>)}
                  </ul>
                </div>
                ) : null
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const issues = Array.isArray(result?.ai?.issues) ? result.ai.issues : []
                return issues.length === 0 ? (
                <div className="text-sm text-muted-foreground">No issues reported.</div>
                ) : (
                <div className="space-y-2">
                  {issues.map((issue: any, i: number) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{issue.type}</span>
                        <Badge variant={issue.severity === "error" ? "destructive" : "secondary"}>{issue.severity}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{issue.detail}</p>
                    </div>
                  ))}
                </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const suggestions = Array.isArray(result?.ai?.suggestions) ? result.ai.suggestions : []
                return suggestions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No suggestions available.</div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suggestion</TableHead>
                      <TableHead>Rationale</TableHead>
                      <TableHead className="w-40">Purchase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.change}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.rationale}</TableCell>
                        <TableCell>
                          {s.requiresPurchase ? (
                            <Badge variant="destructive" className="inline-flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" /> Buy Needed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">From Collection</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )
              })()}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Missing Cards</CardTitle>
            </CardHeader>
            <CardContent>
              {missingRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">You already own all required copies for this deck.</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!csvContent) return
                        navigator.clipboard.writeText(csvContent).catch(() => {})
                      }}
                    >
                      Copy CSV
                    </Button>
                    <Button
                      onClick={() => {
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${deckData.deck.name?.replace(/[^a-z0-9_-]/gi, '_') || 'deck'}_missing.csv`
                        document.body.appendChild(a); a.click(); document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      disabled={!csvContent}
                    >
                      Download CSV
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Card</TableHead>
                        <TableHead className="w-24">Missing</TableHead>
                        <TableHead className="w-28">Market</TableHead>
                        <TableHead className="w-28">Estimated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingRows.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-8 overflow-hidden rounded border bg-muted">
                                <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="space-y-1">
                                <div className="text-sm font-medium leading-tight">{row.name}</div>
                                <div className="text-xs text-muted-foreground">#{row.productId}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{row.missing}</TableCell>
                          <TableCell>{typeof row.price === 'number' ? formatCurrency(row.price) : '—'}</TableCell>
                          <TableCell>{typeof row.price === 'number' ? formatCurrency(row.price * row.missing) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Click Analyze Deck to get format checks, strengths/weaknesses, and suggestions that prefer your owned cards. Items requiring purchase are flagged with a cart.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
