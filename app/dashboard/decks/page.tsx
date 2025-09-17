"use client"

import * as React from "react"
import { useAction, useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sparkles, Plus, Minus, Trash2, Search, Loader2, Filter, ShoppingCart, Save } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

type DeckSection = "main" | "sideboard" | "extra"

type DeckCardRow = {
  id: string
  productId: number
  skuId?: number | null
  section: DeckSection
  quantity: number
  holdingsQuantity: number
  name?: string
  imageUrl?: string
  url?: string
  categoryId?: number | null
  marketPrice?: number
}

type DeckSnapshot = {
  name: string
  format: string | null
  cards: DeckCardRow[]
}

type AggregatedHolding = {
  productId: number
  skuId: number | null
  quantity: number
  categoryId: number | null
  marketPrice?: number
  collection?: string
  [key: string]: any
}

type ProductInfo = {
  name: string
  imageUrl: string
  url?: string
  setName?: string
}

const SECTION_LABELS: Record<DeckSection, string> = {
  main: "Main Deck",
  sideboard: "Sideboard",
  extra: "Extra Deck",
}

const TCG_OPTIONS: {
  value: string
  label: string
  categoryId: number
  formats: { value: string; label: string }[]
  sections: DeckSection[]
}[] = [
  {
    value: "mtg",
    label: "Magic: The Gathering",
    categoryId: 1,
    formats: [
      { value: "standard", label: "Standard" },
      { value: "modern", label: "Modern" },
      { value: "commander", label: "Commander" },
    ],
    sections: ["main", "sideboard"],
  },
  {
    value: "pokemon",
    label: "Pokemon TCG",
    categoryId: 3,
    formats: [
      { value: "standard", label: "Standard" },
      { value: "expanded", label: "Expanded" },
    ],
    sections: ["main", "sideboard"],
  },
  {
    value: "ygo",
    label: "Yu-Gi-Oh!",
    categoryId: 2,
    formats: [
      { value: "advanced", label: "Advanced" },
      { value: "traditional", label: "Traditional" },
    ],
    sections: ["main", "sideboard", "extra"],
  },
]

function fallbackImage(productId: number) {
  return `https://product-images.tcgplayer.com/${productId}.jpg`
}

function deckKey(productId: number, skuId: number | null | undefined, section: DeckSection) {
  return `${productId}:${skuId ?? "_"}:${section}`
}

function holdingKey(productId: number, skuId: number | null | undefined) {
  return `${productId}:${skuId ?? "_"}`
}

function extractList(payload: any): any[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.results)) return payload.results
  if (Array.isArray(payload.Results)) return payload.Results
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.data?.results)) return payload.data.results
  if (Array.isArray(payload.data?.Results)) return payload.data.Results
  if (Array.isArray(payload.items)) return payload.items
  return []
}

function numberOrNull(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function parseProductDetails(payload: any): { productId: number; info: ProductInfo }[] {
  const out: { productId: number; info: ProductInfo }[] = []
  for (const item of extractList(payload)) {
    const productId = Number(
      item?.productId ?? item?.ProductId ?? item?.product?.productId ?? item?.product?.ProductId
    )
    if (!Number.isFinite(productId)) continue
    const name =
      item?.name ??
      item?.ProductName ??
      item?.cleanName ??
      item?.product?.name ??
      `#${productId}`
    const url = item?.url ?? item?.product?.url ?? `https://www.tcgplayer.com/product/${productId}`
    const imageUrl = item?.imageUrl ?? item?.productImage ?? fallbackImage(productId)
    const setName = item?.groupName ?? item?.setName ?? item?.product?.setName
    out.push({ productId, info: { name, imageUrl, url, setName } })
  }
  return out
}

function parseProductPrices(payload: any): Record<string, number> {
  const map: Record<string, number> = {}
  const sources = [extractList(payload), extractList(payload?.prices), extractList(payload?.data)]
  for (const list of sources) {
    for (const entry of list) {
      const productId = Number(entry?.productId ?? entry?.ProductId ?? entry?.product?.productId)
      if (!Number.isFinite(productId)) continue
      const candidates = [
        entry?.marketPrice,
        entry?.marketprice,
        entry?.avgPrice,
        entry?.averagePrice,
        entry?.midPrice,
        entry?.price,
        entry?.market,
        entry?.marketPrice?.amount,
      ]
      let price: number | null = null
      for (const candidate of candidates) {
        price = numberOrNull(candidate)
        if (price !== null) break
      }
      if (price !== null) {
        map[String(productId)] = price
      }
    }
  }
  return map
}

function createSnapshotForTcg(tcg: string): DeckSnapshot {
  const option = TCG_OPTIONS.find((item) => item.value === tcg)
  return {
    name: option ? `${option.label} Deck` : "Untitled Deck",
    format: option?.formats[0]?.value ?? null,
    cards: [],
  }
}

function formatCurrency(value: number | undefined) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
}

type AnalysisState = {
  result: any | null
  deckHash: string | null
  error: string | null
}

function DecksPageImpl() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTcg, setSelectedTcg] = React.useState<string>(TCG_OPTIONS[0]?.value ?? "mtg")
  const [deckSnapshots, setDeckSnapshots] = React.useState<Record<string, DeckSnapshot>>(() => {
    const initial: Record<string, DeckSnapshot> = {}
    for (const option of TCG_OPTIONS) {
      initial[option.value] = createSnapshotForTcg(option.value)
    }
    return initial
  })

  const saveDeckMutation = useMutation(api.decks.saveDeck)
  const deleteDeckMutation = useMutation(api.decks.deleteDeck)
  const [currentDeckId, setCurrentDeckId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = searchParams?.get("deck")
    if (id && id !== currentDeckId) setCurrentDeckId(id)
  }, [searchParams, currentDeckId])

  const loadedDeck = useQuery(api.decks.getDeck, currentDeckId ? ({ deckId: currentDeckId } as any) : "skip") as any

  const analyzeDeck = useAction(api.ai.analyzeDeck)
  const buildDeck = useAction(api.ai.buildDeck)
  const getProductDetails = useAction(api.tcg.getProductDetails)
  const searchProducts = useAction(api.tcg.searchProducts)
  const getProductPrices = useAction(api.tcg.getProductPrices)

  const currentTcgOption = React.useMemo(
    () => TCG_OPTIONS.find((option) => option.value === selectedTcg),
    [selectedTcg]
  )

  React.useEffect(() => {
    setDeckSnapshots((prev) => {
      if (prev[selectedTcg]) return prev
      return { ...prev, [selectedTcg]: createSnapshotForTcg(selectedTcg) }
    })
  }, [selectedTcg])

  const currentDeck = deckSnapshots[selectedTcg] ?? createSnapshotForTcg(selectedTcg)
  const deckCards = currentDeck.cards

  // Apply loaded deck data when present
  React.useEffect(() => {
    if (!loadedDeck?.deck) return
    const tcg = loadedDeck.deck.tcg as string
    setSelectedTcg(tcg)
    setDeckSnapshots((prev) => {
      const next = { ...prev }
      const mapped = (loadedDeck.cards || []).map((c: any) => {
        const section = (c.section as DeckSection) || "main"
        return {
          id: deckKey(Number(c.productId), c.skuId ?? null, section),
          productId: Number(c.productId),
          skuId: typeof c.skuId === "number" ? c.skuId : null,
          section,
          quantity: Number(c.quantity ?? 0),
          holdingsQuantity: 0,
          name: `#${c.productId}`,
          imageUrl: fallbackImage(Number(c.productId)),
          url: `https://www.tcgplayer.com/product/${Number(c.productId)}`,
          categoryId: (c.categoryId ?? TCG_OPTIONS.find((o) => o.value === tcg)?.categoryId ?? null) as number | null,
          marketPrice: undefined,
        } as DeckCardRow
      })
      next[tcg] = {
        name: loadedDeck.deck.name || "Untitled Deck",
        format: loadedDeck.deck.formatCode ?? null,
        cards: mapped,
      }
      return next
    })
  }, [loadedDeck])

  const [activeSection, setActiveSection] = React.useState<DeckSection>("main")
  const allowedSections = currentTcgOption?.sections ?? ["main", "sideboard"]

  React.useEffect(() => {
    const first = allowedSections[0]
    if (!first) return
    if (!allowedSections.includes(activeSection)) {
      setActiveSection(first)
    }
  }, [allowedSections, activeSection])

  const updateCurrentDeck = React.useCallback(
    (mutator: (snapshot: DeckSnapshot) => DeckSnapshot) => {
      setDeckSnapshots((prev) => {
        const snapshot = prev[selectedTcg] ?? createSnapshotForTcg(selectedTcg)
        const nextSnapshot = mutator(snapshot)
        if (nextSnapshot === snapshot) return prev
        return { ...prev, [selectedTcg]: nextSnapshot }
      })
    },
    [selectedTcg]
  )

  const holdingsData = useQuery(api.dashboard.getHoldings, { limit: 1000, offset: 0 }) || {
    rows: [],
    total: 0,
  }

  const holdingsRows = React.useMemo(
    () => ((holdingsData?.rows ?? []) as AggregatedHolding[]),
    [holdingsData]
  )

  const filteredHoldings = React.useMemo(() => {
    const categoryId = currentTcgOption?.categoryId
    if (!categoryId) return holdingsRows
    return holdingsRows.filter((row) => row.categoryId === categoryId)
  }, [holdingsRows, currentTcgOption])

  const holdingsMemo = React.useMemo(() => {
    const bySku = new Map<string, AggregatedHolding>()
    const byProduct = new Map<number, { quantity: number; marketPrice?: number }>()
    for (const row of filteredHoldings) {
      const key = holdingKey(row.productId, row.skuId ?? null)
      bySku.set(key, row)
      const existing = byProduct.get(row.productId)
      const quantity = (existing?.quantity ?? 0) + (row.quantity ?? 0)
      const marketPrice =
        typeof row.marketPrice === "number"
          ? row.marketPrice
          : existing?.marketPrice
      byProduct.set(row.productId, { quantity, marketPrice })
    }
    return { bySku, byProduct }
  }, [filteredHoldings])

  const holdingsBySku = holdingsMemo.bySku
  const holdingsByProduct = holdingsMemo.byProduct

  const [productInfo, setProductInfo] = React.useState<Record<string, ProductInfo>>({})

  React.useEffect(() => {
    const missingIds = Array.from(
      new Set(
        filteredHoldings
          .map((row) => row.productId)
          .filter((productId) => !productInfo[String(productId)])
      )
    )
    if (missingIds.length === 0) return
    let cancelled = false
    const run = async () => {
      const collected: Record<string, ProductInfo> = {}
      for (let i = 0; i < missingIds.length; i += 25) {
        const chunk = missingIds.slice(i, i + 25)
        try {
          const payload = await getProductDetails({ productIds: chunk })
          for (const { productId, info } of parseProductDetails(payload)) {
            collected[String(productId)] = info
          }
        } catch (error) {
          console.error("Failed to fetch product details:", error)
        }
      }
      if (!cancelled && Object.keys(collected).length) {
        setProductInfo((prev) => ({ ...prev, ...collected }))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [filteredHoldings, productInfo, getProductDetails])

  const [holdingsSearch, setHoldingsSearch] = React.useState("")

  const holdingsDisplay = React.useMemo(() => {
    const query = holdingsSearch.trim().toLowerCase()
    return filteredHoldings
      .filter((row) => {
        if (!query) return true
        const info = productInfo[String(row.productId)]
        const nameMatch = info?.name?.toLowerCase().includes(query)
        const idMatch = String(row.productId).includes(query)
        return nameMatch || idMatch
      })
      .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))
      .slice(0, 100)
  }, [filteredHoldings, productInfo, holdingsSearch])

  const ensureProductInfo = React.useCallback(
    async (productId: number): Promise<ProductInfo> => {
      const key = String(productId)
      const existing = productInfo[key]
      if (existing) return existing
      try {
        const payload = await getProductDetails({ productIds: [productId] })
        const parsed = parseProductDetails(payload)
        if (parsed.length > 0) {
          const info = parsed[0].info
          setProductInfo((prev) => ({ ...prev, [key]: info }))
          return info
        }
      } catch (error) {
        console.error(`Failed to fetch product ${productId}:`, error)
      }
      const fallback: ProductInfo = { name: `#${productId}`, imageUrl: fallbackImage(productId), url: `https://www.tcgplayer.com/product/${productId}` }
      setProductInfo((prev) => ({ ...prev, [key]: prev[key] ?? fallback }))
      return fallback
    },
    [getProductDetails, productInfo]
  )

  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    const missingPrices = Array.from(
      new Set(
        deckCards
          .map((card) => card.productId)
          .filter((productId) => priceMap[String(productId)] === undefined)
      )
    )
    if (missingPrices.length === 0) return
    let cancelled = false
    const run = async () => {
      const collected: Record<string, number> = {}
      for (let i = 0; i < missingPrices.length; i += 25) {
        const chunk = missingPrices.slice(i, i + 25)
        try {
          const payload = await getProductPrices({ productIds: chunk })
          Object.assign(collected, parseProductPrices(payload))
        } catch (error) {
          console.error("Failed to fetch product prices:", error)
        }
      }
      if (!cancelled && Object.keys(collected).length) {
        setPriceMap((prev) => ({ ...prev, ...collected }))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [deckCards, priceMap, getProductPrices])

  React.useEffect(() => {
    updateCurrentDeck((snapshot) => {
      if (snapshot.cards.length === 0) return snapshot
      let changed = false
      const nextCards = snapshot.cards.map((card) => {
        const exact = holdingsBySku.get(holdingKey(card.productId, card.skuId ?? null))
        const aggregate = holdingsByProduct.get(card.productId)
        const holdingsQuantity = exact?.quantity ?? aggregate?.quantity ?? 0
        if (holdingsQuantity === card.holdingsQuantity) return card
        changed = true
        return { ...card, holdingsQuantity }
      })
      if (!changed) return snapshot
      return { ...snapshot, cards: nextCards }
    })
  }, [holdingsMemo, updateCurrentDeck])

  // Ensure product details for cards currently in the deck (for loaded decks or manual entry)
  React.useEffect(() => {
    const missing = Array.from(new Set(
      deckCards
        .map((c) => c.productId)
        .filter((pid) => !productInfo[String(pid)])
    ))
    if (missing.length === 0) return
    let cancelled = false
    const run = async () => {
      try {
        for (let i = 0; i < missing.length; i += 25) {
          const chunk = missing.slice(i, i + 25)
          const payload = await getProductDetails({ productIds: chunk })
          const parsed = parseProductDetails(payload)
          if (cancelled) return
          if (parsed.length > 0) {
            setProductInfo((prev) => {
              const next = { ...prev }
              for (const { productId, info } of parsed) {
                next[String(productId)] = info
              }
              return next
            })
          }
        }
      } catch (e) {
        console.warn('Failed to fetch details for deck cards', e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [deckCards, productInfo, getProductDetails])

  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  const handleSearch = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const query = searchQuery.trim()
      if (!query) {
        setSearchResults([])
        return
      }
      setSearching(true)
      setSearchError(null)
      try {
        const payload = await searchProducts({
          productName: query,
          limit: 40,
          offset: 0,
          ...(currentTcgOption?.categoryId ? { categoryId: currentTcgOption.categoryId } : {}),
        })
        const list = extractList(payload)
        setSearchResults(list)
        if (Array.isArray(list)) {
          setProductInfo((prev) => {
            const next = { ...prev }
            for (const item of list) {
              const productId = Number(item?.productId ?? item?.ProductId)
              if (!Number.isFinite(productId)) continue
              const key = String(productId)
              if (next[key]) continue
              const name =
                item?.name ?? item?.productName ?? item?.ProductName ?? `#${productId}`
              next[key] = {
                name,
                imageUrl: fallbackImage(productId),
                url: item?.url ?? `https://www.tcgplayer.com/product/${productId}`,
                setName: item?.groupName ?? item?.setName,
              }
            }
            return next
          })
        }
      } catch (error: any) {
        console.error("Search failed:", error)
        setSearchError(error?.message ?? "Search failed")
      } finally {
        setSearching(false)
      }
    },
    [searchQuery, searchProducts, currentTcgOption]
  )

  const handleAddFromHolding = React.useCallback(
    (holding: AggregatedHolding) => {
      const productId = Number(holding.productId)
      if (!Number.isFinite(productId)) return
      const skuId = holding.skuId ?? null
      const key = String(productId)
      let info = productInfo[key]
      if (!info) {
        info = { name: `#${productId}`, imageUrl: fallbackImage(productId) }
        setProductInfo((prev) => ({ ...prev, [key]: prev[key] ?? info }))
      }
      updateCurrentDeck((snapshot) => {
        const id = deckKey(productId, skuId, activeSection)
        const index = snapshot.cards.findIndex((card) => card.id === id)
        const holdingsQuantity = Number(holding.quantity ?? 0)
        if (index >= 0) {
          const nextCards = [...snapshot.cards]
          nextCards[index] = {
            ...nextCards[index],
            quantity: nextCards[index].quantity + 1,
            holdingsQuantity,
          }
          return { ...snapshot, cards: nextCards }
        }
        const nextCards = [
          ...snapshot.cards,
          {
            id,
            productId,
            skuId,
            section: activeSection,
            quantity: 1,
            holdingsQuantity,
            name: info?.name ?? `#${productId}`,
            imageUrl: info?.imageUrl ?? fallbackImage(productId),
            url: info?.url,
            categoryId: holding.categoryId ?? currentTcgOption?.categoryId ?? null,
            marketPrice:
              typeof holding.marketPrice === "number" ? holding.marketPrice : undefined,
          },
        ]
        return { ...snapshot, cards: nextCards }
      })
    },
    [activeSection, productInfo, setProductInfo, updateCurrentDeck, currentTcgOption]
  )

  const handleAddFromSearch = React.useCallback(
    async (card: any) => {
      const productId = Number(card?.productId ?? card?.ProductId)
      if (!Number.isFinite(productId)) return
      const info = await ensureProductInfo(productId)
      const skuId = card?.skuId ? Number(card.skuId) : null
      updateCurrentDeck((snapshot) => {
        const id = deckKey(productId, skuId, activeSection)
        const index = snapshot.cards.findIndex((item) => item.id === id)
        const holdingsAggregate = holdingsByProduct.get(productId)
        const holdingsQuantity = holdingsAggregate?.quantity ?? 0
        const priceCandidates = [
          priceMap[String(productId)],
          numberOrNull(card?.marketPrice) ?? undefined,
          numberOrNull(card?.price) ?? undefined,
        ]
        const marketPrice = priceCandidates.find(
          (value) => typeof value === "number"
        ) as number | undefined
        if (index >= 0) {
          const nextCards = [...snapshot.cards]
          nextCards[index] = {
            ...nextCards[index],
            quantity: nextCards[index].quantity + 1,
            holdingsQuantity,
            name: info.name,
            imageUrl: info.imageUrl,
            url: info.url,
            marketPrice: marketPrice ?? nextCards[index].marketPrice,
          }
          return { ...snapshot, cards: nextCards }
        }
        const nextCards = [
          ...snapshot.cards,
          {
            id,
            productId,
            skuId,
            section: activeSection,
            quantity: 1,
            holdingsQuantity,
            name: info.name,
            imageUrl: info.imageUrl,
            url: info.url,
            categoryId: currentTcgOption?.categoryId ?? null,
            marketPrice,
          },
        ]
        return { ...snapshot, cards: nextCards }
      })
    },
    [activeSection, ensureProductInfo, updateCurrentDeck, holdingsByProduct, priceMap, currentTcgOption]
  )

  const handleAdjustQuantity = React.useCallback(
    (id: string, delta: number) => {
      if (!delta) return
      updateCurrentDeck((snapshot) => {
        const index = snapshot.cards.findIndex((card) => card.id === id)
        if (index === -1) return snapshot
        const card = snapshot.cards[index]
        const nextQuantity = card.quantity + delta
        if (nextQuantity <= 0) {
          const nextCards = snapshot.cards.filter((item) => item.id !== id)
          return { ...snapshot, cards: nextCards }
        }
        const nextCards = [...snapshot.cards]
        nextCards[index] = { ...card, quantity: nextQuantity }
        return { ...snapshot, cards: nextCards }
      })
    },
    [updateCurrentDeck]
  )

  const handleRemoveCard = React.useCallback(
    (id: string) => {
      updateCurrentDeck((snapshot) => {
        const nextCards = snapshot.cards.filter((card) => card.id !== id)
        if (nextCards.length === snapshot.cards.length) return snapshot
        return { ...snapshot, cards: nextCards }
      })
    },
    [updateCurrentDeck]
  )

  const deckHash = React.useMemo(
    () =>
      JSON.stringify(
        deckCards.map((card) => [card.productId, card.skuId ?? null, card.section, card.quantity])
      ),
    [deckCards]
  )

  const deckStats = React.useMemo(() => {
    const bySection: Record<DeckSection, number> = { main: 0, sideboard: 0, extra: 0 }
    const unique = new Set<string>()
    let missingCopies = 0
    let missingCost = 0
    for (const card of deckCards) {
      bySection[card.section] = (bySection[card.section] ?? 0) + card.quantity
      unique.add(`${card.productId}:${card.skuId ?? "_"}`)
      const holdingsQuantity = card.holdingsQuantity ?? 0
      const missing = Math.max(0, card.quantity - holdingsQuantity)
      missingCopies += missing
      const price = priceMap[String(card.productId)] ?? card.marketPrice
      if (missing > 0 && typeof price === "number") {
        missingCost += missing * price
      }
    }
    const total = bySection.main + bySection.sideboard + bySection.extra
    return {
      total,
      unique: unique.size,
      bySection,
      missingCopies,
      missingCost,
    }
  }, [deckCards, priceMap])

  const [showMissingOnly, setShowMissingOnly] = React.useState(false)

  const deckCardsBySection = React.useMemo(() => {
    const map: Record<DeckSection, DeckCardRow[]> = { main: [], sideboard: [], extra: [] }
    for (const card of deckCards) {
      const missing = Math.max(0, card.quantity - (card.holdingsQuantity ?? 0))
      if (showMissingOnly && missing === 0) continue
      map[card.section].push(card)
    }
    return map
  }, [deckCards, showMissingOnly])

  const [analysisState, setAnalysisState] = React.useState<AnalysisState>({
    result: null,
    deckHash: null,
    error: null,
  })
  const [analysisBusy, setAnalysisBusy] = React.useState(false)

  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  // Build with AI (assistant to construct a deck from holdings)
  const [aiGoal, setAiGoal] = React.useState("")
  const [aiBusy, setAiBusy] = React.useState(false)
  const [aiPlan, setAiPlan] = React.useState<string | null>(null)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [aiEnforce, setAiEnforce] = React.useState(true)
  const [aiCommander, setAiCommander] = React.useState("")

  const handleSaveDeck = React.useCallback(async () => {
    setSaving(true)
    try {
      const payloadCards = deckCards.map((card) => ({
        categoryId: Number(card.categoryId ?? currentTcgOption?.categoryId ?? 0),
        productId: Number(card.productId),
        skuId: typeof card.skuId === "number" ? card.skuId : undefined,
        quantity: Number(card.quantity ?? 0),
        section: card.section,
      }))
      const id = await saveDeckMutation({
        deckId: currentDeckId ? (currentDeckId as any) : undefined,
        name: currentDeck.name || "Untitled Deck",
        tcg: selectedTcg,
        formatCode: currentDeck.format ?? undefined,
        notes: undefined,
        cards: payloadCards,
      } as any)
      const savedId = String(id)
      setCurrentDeckId(savedId)
      router.replace(`/dashboard/decks?deck=${savedId}`)
    } catch (error) {
      console.error("Save deck failed:", error)
    } finally {
      setSaving(false)
    }
  }, [deckCards, currentDeck, selectedTcg, currentDeckId, currentTcgOption, saveDeckMutation, router])

  const handleNewDeck = React.useCallback(() => {
    setCurrentDeckId(null)
    setDeckSnapshots((prev) => ({ ...prev, [selectedTcg]: createSnapshotForTcg(selectedTcg) }))
    router.replace(`/dashboard/decks`)
  }, [selectedTcg, router])

  const handleDeleteDeck = React.useCallback(async () => {
    if (!currentDeckId) return
    const ok = typeof window !== "undefined" ? window.confirm("Delete this deck? This cannot be undone.") : true
    if (!ok) return
    setDeleting(true)
    try {
      await deleteDeckMutation({ deckId: currentDeckId as any } as any)
      setCurrentDeckId(null)
      setDeckSnapshots((prev) => ({ ...prev, [selectedTcg]: createSnapshotForTcg(selectedTcg) }))
      router.push("/dashboard/decks/saved")
    } catch (error) {
      console.error("Delete deck failed:", error)
    } finally {
      setDeleting(false)
    }
  }, [currentDeckId, deleteDeckMutation, selectedTcg, router])

  const handleAnalyzeDeck = React.useCallback(async () => {
    if (deckCards.length === 0) {
      setAnalysisState({ result: null, deckHash: null, error: "Add cards to analyze the deck." })
      return
    }
    setAnalysisBusy(true)
    try {
      const deckPayload = deckCards.map((card) => ({
        productId: card.productId,
        skuId: card.skuId ?? undefined,
        quantity: card.quantity,
        section: card.section,
      }))
      const holdingsPayload = filteredHoldings.slice(0, 200).map((row) => ({
        productId: row.productId,
        skuId: row.skuId ?? undefined,
        quantity: row.quantity ?? 0,
      }))
      const result = await analyzeDeck({
        tcg: selectedTcg,
        format: currentDeck.format ?? undefined,
        deck: {
          name: currentDeck.name || "Untitled Deck",
          cards: deckPayload,
        },
        holdings: holdingsPayload,
      })
      setAnalysisState({ result, deckHash, error: null })
    } catch (error: any) {
      console.error("Deck analysis failed:", error)
      setAnalysisState({
        result: null,
        deckHash: null,
        error: error?.message ?? "Deck analysis failed",
      })
    } finally {
      setAnalysisBusy(false)
    }
  }, [deckCards, filteredHoldings, analyzeDeck, selectedTcg, currentDeck, deckHash])

  const isAnalysisStale =
    !!analysisState.result && analysisState.deckHash !== null && analysisState.deckHash !== deckHash

  const formatOptions = currentTcgOption?.formats ?? []

  // Deck Assistant: Quick Fill from Collection to target main size
  const getTargetMainSize = React.useCallback(() => {
    switch (selectedTcg) {
      case "mtg":
        return 60
      case "pokemon":
        return 60
      case "ygo":
        return 40
      default:
        return 60
    }
  }, [selectedTcg])

  const getMaxCopiesPerCard = React.useCallback(() => {
    switch (selectedTcg) {
      case "ygo":
        return 3
      default:
        return 4
    }
  }, [selectedTcg])

  const handleQuickFillFromCollection = React.useCallback(() => {
    const target = getTargetMainSize()
    const currentMainCount = deckCards.filter((c) => c.section === "main").reduce((sum, c) => sum + (c.quantity || 0), 0)
    let needed = target - currentMainCount
    if (needed <= 0) return

    const maxCopies = getMaxCopiesPerCard()

    // Copy current cards map for quick lookup
    const byId = new Map(deckCards.map((c) => [c.id, c]))

    // Sort holdings by quantity desc, price desc as heuristic
    const owned = [...filteredHoldings].sort((a, b) => {
      const qd = (b.quantity ?? 0) - (a.quantity ?? 0)
      if (qd !== 0) return qd
      const pd = (b.marketPrice ?? 0) - (a.marketPrice ?? 0)
      return pd
    })

    updateCurrentDeck((snapshot) => {
      let nextCards = [...snapshot.cards]

      // Helper to get current total copies for a product across sections
      const totalForProduct = (pid: number) => nextCards.filter((x) => x.productId === pid).reduce((s, x) => s + (x.quantity || 0), 0)

      for (const h of owned) {
        if (needed <= 0) break
        const productId = Number(h.productId)
        if (!Number.isFinite(productId)) continue
        const skuId = h.skuId ?? null
        const id = deckKey(productId, skuId, "main")
        const currentTotal = totalForProduct(productId)
        const canAddForRule = Math.max(0, maxCopies - currentTotal)
        if (canAddForRule <= 0) continue
        const ownedQty = Number(h.quantity ?? 0)
        const alreadyForThisLine = nextCards.find((c) => c.id === id)?.quantity ?? 0
        const remainingOwnedForLine = Math.max(0, ownedQty - alreadyForThisLine)
        const add = Math.min(needed, canAddForRule, remainingOwnedForLine)
        if (add <= 0) continue
        const info = productInfo[String(productId)]
        if (byId.has(id)) {
          nextCards = nextCards.map((c) => (c.id === id ? { ...c, quantity: (c.quantity || 0) + add } : c))
        } else {
          nextCards = [
            ...nextCards,
            {
              id,
              productId,
              skuId,
              section: "main" as DeckSection,
              quantity: add,
              holdingsQuantity: Number(h.quantity ?? 0),
              name: info?.name ?? `#${productId}`,
              imageUrl: info?.imageUrl ?? fallbackImage(productId),
              url: info?.url,
              categoryId: h.categoryId ?? currentTcgOption?.categoryId ?? null,
              marketPrice: typeof h.marketPrice === "number" ? h.marketPrice : undefined,
            } as DeckCardRow,
          ]
        }
        needed -= add
      }

      if (needed <= 0) return { ...snapshot, cards: nextCards }
      return { ...snapshot, cards: nextCards }
    })
  }, [filteredHoldings, productInfo, deckCards, updateCurrentDeck, currentTcgOption, getTargetMainSize, getMaxCopiesPerCard])

  const handleAiBuild = React.useCallback(async () => {
    setAiBusy(true)
    setAiError(null)
    try {
      // Build holdings by name for AI prompt (limit for payload size)
      const ownedByName = (filteredHoldings.slice(0, 300)).map((h) => {
        const info = productInfo[String(h.productId)]
        const name = info?.name || `#${h.productId}`
        return { name, quantity: Number(h.quantity ?? 0) }
      })

      // Determine target size; for MTG Commander target 100
      let target = getTargetMainSize()
      if (selectedTcg === 'mtg' && (currentDeck.format || '').toLowerCase() === 'commander') {
        target = 100
      }
      const result = await buildDeck({
        tcg: selectedTcg,
        format: currentDeck.format ?? undefined,
        goal: (aiGoal || aiCommander) ? `${aiGoal}${aiCommander ? ` | Commander: ${aiCommander}` : ''}` : undefined,
        targetMainSize: target,
        enforceRules: aiEnforce,
        holdings: ownedByName,
      } as any)

      setAiPlan(typeof result?.plan === 'string' ? result.plan : null)

      // Map AI card names to productIds via catalog search
      const suggested: Array<{ name: string; quantity: number; section: DeckSection }> = (result?.cards || [])
        .map((c: any) => ({ name: String(c.name), quantity: Number(c.quantity || 1), section: (c.section as DeckSection) || 'main' }))

      const additions: Array<{ productId: number; quantity: number; section: DeckSection }> = []
      for (const s of suggested) {
        try {
          const payload = await searchProducts({ productName: s.name, limit: 1, offset: 0, ...(currentTcgOption?.categoryId ? { categoryId: currentTcgOption.categoryId } : {}) })
          const list: any[] = (payload as any)?.results || (payload as any)?.Results || (payload as any)?.data || []
          const top = list[0]
          const productId = Number(top?.productId ?? top?.ProductId)
          if (Number.isFinite(productId) && productId > 0) {
            additions.push({ productId, quantity: Math.max(1, Math.floor(s.quantity)), section: s.section })
          }
        } catch (e) {
          // ignore individual mapping errors
        }
      }

      if (additions.length === 0) return

      // Apply to current deck snapshot
      updateCurrentDeck((snapshot) => {
        let nextCards = [...snapshot.cards]
        for (const add of additions) {
          const id = deckKey(add.productId, null, add.section)
          const idx = nextCards.findIndex((c) => c.id === id)
          if (idx >= 0) {
            nextCards[idx] = { ...nextCards[idx], quantity: (nextCards[idx].quantity || 0) + add.quantity }
            continue
          }
          const info = productInfo[String(add.productId)]
          nextCards.push({
            id,
            productId: add.productId,
            skuId: null,
            section: add.section,
            quantity: add.quantity,
            holdingsQuantity: holdingsByProduct.get(add.productId)?.quantity ?? 0,
            name: info?.name ?? `#${add.productId}`,
            imageUrl: info?.imageUrl ?? fallbackImage(add.productId),
            url: info?.url,
            categoryId: currentTcgOption?.categoryId ?? null,
            marketPrice: priceMap[String(add.productId)] ?? undefined,
          })
        }
        return { ...snapshot, cards: nextCards }
      })

    } catch (e: any) {
      setAiError(e?.message ?? 'Failed to build deck')
    } finally {
      setAiBusy(false)
    }
  }, [filteredHoldings, productInfo, searchProducts, buildDeck, selectedTcg, currentDeck, getTargetMainSize, updateCurrentDeck, holdingsByProduct, currentTcgOption, priceMap, aiGoal])

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex-1">Deck Builder</CardTitle>
            <Link href="/dashboard/decks/saved">
              <Button variant="outline">My Decks</Button>
            </Link>
            <Button variant="outline" onClick={handleNewDeck} disabled={saving || deleting}>
              New
            </Button>
            <Button onClick={handleSaveDeck} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Deck</span>
              )}
            </Button>
            <Button variant="destructive" onClick={handleDeleteDeck} disabled={!currentDeckId || deleting}>
              {deleting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete</span>
              )}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Deck Name</label>
              <Input
                value={currentDeck.name}
                onChange={(event) =>
                  updateCurrentDeck((snapshot) => ({ ...snapshot, name: event.target.value }))
                }
                placeholder="Untitled Deck"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Trading Card Game</label>
              <Select value={selectedTcg} onValueChange={setSelectedTcg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TCG_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Format</label>
              <Select
                value={currentDeck.format ?? ""}
                onValueChange={(value) =>
                  updateCurrentDeck((snapshot) => ({ ...snapshot, format: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.length === 0 ? (
                    <SelectItem value="">No formats available</SelectItem>
                  ) : (
                    formatOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Active section for new cards:
            </div>
            <div className="flex items-center gap-2">
              {allowedSections.map((section) => (
                <Button
                  key={section}
                  size="sm"
                  variant={activeSection === section ? "default" : "outline"}
                  onClick={() => setActiveSection(section)}
                >
                  {SECTION_LABELS[section]}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Only show cards that need to be bought</span>
              <Switch
                checked={showMissingOnly}
                onCheckedChange={setShowMissingOnly}
                aria-label="Toggle missing cards filter"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Deck List</CardTitle>
              <div className="text-sm text-muted-foreground">
                {deckStats.total} cards • {deckStats.unique} unique • Missing {deckStats.missingCopies}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {allowedSections.map((section) => {
                const cards = deckCardsBySection[section]
                return (
                  <div key={section} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">{SECTION_LABELS[section]}</h3>
                      <span className="text-sm text-muted-foreground">
                        {cards.reduce((total, card) => total + card.quantity, 0)} cards
                      </span>
                    </div>
                    {cards.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        No cards yet. Add cards from your holdings or search the catalog.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Card</TableHead>
                              <TableHead className="w-32">Quantity</TableHead>
                              <TableHead className="w-52">Ownership</TableHead>
                              <TableHead className="w-32">Market</TableHead>
                              <TableHead className="w-12 text-right">Remove</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cards.map((card) => {
                              const key = String(card.productId)
                              const info = productInfo[key]
                              const imageUrl = card.imageUrl ?? info?.imageUrl ?? fallbackImage(card.productId)
                              const name = card.name ?? info?.name ?? `#${card.productId}`
                              const holdingsQuantity = card.holdingsQuantity ?? 0
                              const owned = Math.min(card.quantity, holdingsQuantity)
                              const missing = Math.max(0, card.quantity - holdingsQuantity)
                              const marketPrice = priceMap[key] ?? card.marketPrice
                              const estimated =
                                missing > 0 && typeof marketPrice === "number"
                                  ? formatCurrency(marketPrice * missing)
                                  : "—"
                              return (
                                <TableRow key={card.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="h-14 w-10 overflow-hidden rounded border bg-muted">
                                        <img
                                          src={imageUrl}
                                          alt={name}
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium leading-tight">{name}</div>
                                        <div className="text-xs text-muted-foreground">#{card.productId}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleAdjustQuantity(card.id, -1)}
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="w-8 text-center text-sm font-medium">
                                        {card.quantity}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleAdjustQuantity(card.id, 1)}
                                        aria-label="Increase quantity"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary">Owned {owned}</Badge>
                                      {missing > 0 && (
                                        <Badge variant="destructive" className="inline-flex items-center gap-1">
                                          <ShoppingCart className="h-3 w-3" />Need {missing}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">
                                        {typeof marketPrice === "number"
                                          ? formatCurrency(marketPrice)
                                          : "—"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {missing > 0 ? `Missing total: ${estimated}` : "Fully owned"}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleRemoveCard(card.id)}
                                      aria-label="Remove card"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Deck Assistant
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use AI insights on the deck page and quickly fill the main deck from your collection.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={currentDeckId ? `/dashboard/decks/${currentDeckId}` : `#`}>
                  <Button disabled={!currentDeckId} variant="outline">
                    Open AI Analysis
                  </Button>
                </Link>
                <Button onClick={handleQuickFillFromCollection} variant="default">
                  Quick Fill from Collection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end mb-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">Goal / Archetype</label>
                  <Input value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} placeholder="e.g., Mono-Red Aggro" />
                </div>
                {selectedTcg === 'mtg' && (currentDeck.format || '').toLowerCase() === 'commander' && (
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground">Commander (optional)</label>
                    <Input value={aiCommander} onChange={(e) => setAiCommander(e.target.value)} placeholder="e.g., Atraxa, Praetors' Voice" />
                  </div>
                )}
                <Button onClick={handleAiBuild} disabled={aiBusy}>
                  {aiBusy ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Building...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Build with AI</span>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Switch checked={aiEnforce} onCheckedChange={setAiEnforce} id="enforce-legality" />
                <label htmlFor="enforce-legality" className="text-muted-foreground">Enforce format legality and construction rules</label>
              </div>
              {aiError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive mb-4">{aiError}</div>
              )}
              {aiPlan && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground mb-4">{aiPlan}</div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Main Deck</div>
                  <div className="text-lg font-semibold">{deckStats.bySection.main}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Sideboard / Extra</div>
                  <div className="text-lg font-semibold">{deckStats.bySection.sideboard + deckStats.bySection.extra}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Missing Copies</div>
                  <div className="text-lg font-semibold">{deckStats.missingCopies}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Estimated Spend</div>
                  <div className="text-lg font-semibold">{formatCurrency(deckStats.missingCost)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Your Collection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Build from cards you already own. Select a card to move it into the active deck section.
              </p>
              <Input
                value={holdingsSearch}
                onChange={(event) => setHoldingsSearch(event.target.value)}
                placeholder="Search holdings by name or product ID"
              />
            </CardHeader>
            <CardContent>
              {holdingsDisplay.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No matching cards in your collection for this game yet.
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {holdingsDisplay.map((holding) => {
                      const key = String(holding.productId)
                      const info = productInfo[key]
                      const name = info?.name ?? `#${holding.productId}`
                      const imageUrl = info?.imageUrl ?? fallbackImage(holding.productId)
                      const marketPrice =
                        typeof holding.marketPrice === "number"
                          ? holding.marketPrice
                          : priceMap[key]
                      return (
                        <div
                          key={`${holding.productId}:${holding.skuId ?? "_"}`}
                          className="flex items-center gap-3 rounded-md border p-3"
                        >
                          <div className="h-14 w-10 overflow-hidden rounded bg-muted">
                            <img
                              src={imageUrl}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{name}</div>
                                <div className="text-xs text-muted-foreground">#{holding.productId}</div>
                              </div>
                              <Badge variant="secondary">x{holding.quantity}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{holding.collection || "Collection"}</span>
                              <span>{
                                typeof marketPrice === "number"
                                  ? formatCurrency(marketPrice)
                                  : ""
                              }</span>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleAddFromHolding(holding)}>
                            Add
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Search Catalog</CardTitle>
              <p className="text-sm text-muted-foreground">
                Need something new? Find cards outside your collection and mark them as purchases.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by card name"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
              {searchError && (
                <div className="text-sm text-destructive">{searchError}</div>
              )}
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  Search for a card to start adding it to your deck.
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {searchResults.map((result) => {
                      const productId = Number(result?.productId ?? result?.ProductId)
                      if (!Number.isFinite(productId)) return null
                      const key = String(productId)
                      const info = productInfo[key]
                      const name = info?.name ?? result?.name ?? result?.productName ?? `#${productId}`
                      const setName = info?.setName ?? result?.groupName ?? result?.setName
                      const imageUrl = info?.imageUrl ?? fallbackImage(productId)
                      return (
                        <div key={key} className="flex items-center gap-3 rounded-md border p-3">
                          <div className="h-14 w-10 overflow-hidden rounded bg-muted">
                            <img
                              src={imageUrl}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="text-sm font-medium">{name}</div>
                            {setName && (
                              <div className="text-xs text-muted-foreground">{setName}</div>
                            )}
                          </div>
                          <Button size="sm" onClick={() => handleAddFromSearch(result)}>
                            Add to Deck
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function DecksPage() {
  return (
    <React.Suspense fallback={<div className="px-4 lg:px-6 py-8 text-sm text-muted-foreground">Loading deck builder...</div>}>
      <DecksPageImpl />
    </React.Suspense>
  )
}
