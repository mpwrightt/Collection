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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sparkles, Plus, Minus, Trash2, Search, Loader2, Filter, ShoppingCart, Save, Package, DollarSign } from "lucide-react"
import { CardDetailsModal } from "@/components/collections/card-details-modal"
import { setColorOverrides } from "@/lib/setColors"
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
  groupId?: number
  setAbbr?: string
  setColor?: string
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
    const groupId = Number(item?.groupId ?? item?.GroupId ?? item?.product?.groupId)
    out.push({ productId, info: { name, imageUrl, url, setName, groupId: Number.isFinite(groupId) ? groupId : undefined } })
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
  // Persisted Deck Tools tab via ?tool=collection|catalog|ai
  const initialTool = React.useMemo(() => {
    const q = (searchParams?.get('tool') || 'collection').toLowerCase()
    return ['collection','catalog','ai'].includes(q) ? q : 'collection'
  }, [searchParams])
  const [activeTool, setActiveTool] = React.useState<string>(initialTool)
  const setActiveToolAndUrl = React.useCallback((val: string) => {
    setActiveTool(val)
    const sp = new URLSearchParams(searchParams?.toString() || '')
    sp.set('tool', val)
    router.replace(`?${sp.toString()}`)
  }, [router, searchParams])
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

  // Use new analyzer_v2 if types are available; fallback to legacy analyzer to avoid TS break until codegen updates
  const analyzeDeck = useAction(((api as any).analyzer_v2?.analyzeDeckV2) ?? (api as any).ai.analyzeDeck)
  const buildDeck = useAction(api.ai.buildDeck)
  const getProductDetails = useAction(api.tcg.getProductDetails)
  const searchProducts = useAction(api.tcg.searchProducts)
  const searchLegalProducts = useAction(api.formats.searchLegalProducts)
  const getProductPrices = useAction(api.tcg.getProductPrices)
  const getSkus = useAction(api.tcg.getSkus)
  const getGroupsByIds = useAction(api.tcg.getGroupsByIds)
  const refreshDeckPrices = useAction(api.decks.refreshDeckPrices)

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
  const [groupInfo, setGroupInfo] = React.useState<Record<string, { name: string; abbreviation?: string }>>({})

  // Utility: derive a stable color from abbreviation/name
  const deriveSetColor = React.useCallback((abbr?: string, fallbackKey?: string): string | undefined => {
    const key = (abbr || fallbackKey || '').toUpperCase()
    if (!key) return undefined
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash)
      hash |= 0
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue} 70% 50%)`
  }, [])

  // Enrich missing group (set) info using groupIds from product details
  React.useEffect(() => {
    const allInfos = Object.values(productInfo)
    const missing: number[] = []
    for (const info of allInfos) {
      const gid = (info as ProductInfo).groupId
      if (typeof gid === 'number' && !groupInfo[String(gid)]) {
        missing.push(gid)
      }
    }
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      const collected: Record<string, { name: string; abbreviation?: string }> = {}
      for (let i = 0; i < missing.length; i += 25) {
        const chunk = Array.from(new Set(missing.slice(i, i + 25)))
        try {
          const payload = await getGroupsByIds({ groupIds: chunk } as any)
          const list: any[] = payload?.results || payload?.Results || payload?.data || []
          for (const g of list) {
            const gid = Number(g?.groupId ?? g?.GroupId)
            if (!Number.isFinite(gid)) continue
            const name = g?.name ?? g?.groupName ?? `Set #${gid}`
            const abbr = g?.abbreviation ?? g?.code
            collected[String(gid)] = { name, abbreviation: abbr }
          }
        } catch (e) {
          // ignore group fetch errors per batch
        }
      }
      if (!cancelled && Object.keys(collected).length) {
        setGroupInfo((prev) => ({ ...prev, ...collected }))
        // also backfill setName/abbr/color into productInfo entries that have groupId
        setProductInfo((prev) => {
          const next: Record<string, ProductInfo> = { ...prev }
          for (const [pid, info] of Object.entries(prev)) {
            const gid = (info as ProductInfo).groupId
            if (typeof gid === 'number') {
              const g = collected[String(gid)] || groupInfo[String(gid)]
              if (g) {
                const updated: ProductInfo = { ...(info as ProductInfo) }
                if (!updated.setName && g.name) updated.setName = g.name
                if (!updated.setAbbr && g.abbreviation) updated.setAbbr = g.abbreviation
                if (!updated.setColor) {
                  const byId = setColorOverrides[String(gid)]
                  const byAbbr = g.abbreviation ? setColorOverrides[String(g.abbreviation).toUpperCase()] : undefined
                  updated.setColor = byId || byAbbr || deriveSetColor(g.abbreviation, String(gid))
                }
                next[pid] = updated
              }
            }
          }
          return next
        })
      }
    })()
    return () => { cancelled = true }
  }, [productInfo, groupInfo, getGroupsByIds, deriveSetColor])

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
        let payload: any
        // Prefer format-legal results when a format is selected
        if (currentDeck.format) {
          payload = await searchLegalProducts({
            tcg: selectedTcg,
            formatCode: currentDeck.format,
            productName: query,
            limit: 40,
            offset: 0,
            ...(typeof currentTcgOption?.categoryId === 'number' ? { categoryId: currentTcgOption.categoryId } : {}),
          } as any)
        } else {
          payload = await searchProducts({
            productName: query,
            limit: 40,
            offset: 0,
            ...(typeof currentTcgOption?.categoryId === 'number' ? { categoryId: currentTcgOption.categoryId } : {}),
          })
        }
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
              const groupId = Number(item?.groupId ?? item?.GroupId)
              next[key] = {
                name,
                imageUrl: fallbackImage(productId),
                url: item?.url ?? `https://www.tcgplayer.com/product/${productId}`,
                setName: item?.groupName ?? item?.setName,
                groupId: Number.isFinite(groupId) ? groupId : undefined,
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
    [searchQuery, searchProducts, searchLegalProducts, currentTcgOption, currentDeck.format, selectedTcg]
  )

  // Target section selector for Deck Tools (synced with active section)
  const [toolTargetSection, setToolTargetSection] = React.useState<DeckSection>("main")
  React.useEffect(() => {
    if (toolTargetSection !== activeSection) {
      setToolTargetSection(activeSection)
    }
  }, [activeSection, toolTargetSection])

  // Scroll position preservation for deck sections
  const deckScrollRef = React.useRef<HTMLDivElement>(null)
  const deckScrollPositions = React.useRef<Record<DeckSection, number>>({
    main: 0,
    sideboard: 0,
    extra: 0
  })

  // Handle section changes with scroll preservation
  const handleSectionChange = React.useCallback((section: DeckSection) => {
    // Save current scroll position
    if (deckScrollRef.current) {
      deckScrollPositions.current[activeSection] = deckScrollRef.current.scrollTop
    }

    // Update active section
    setActiveSection(section)

    // Restore scroll position after content renders
    setTimeout(() => {
      if (deckScrollRef.current) {
        deckScrollRef.current.scrollTop = deckScrollPositions.current[section]
      }
    }, 50)
  }, [activeSection])

  // Also sync the other way - when tool target changes, update active section
  const handleToolTargetChange = React.useCallback((section: DeckSection) => {
    setToolTargetSection(section)
    handleSectionChange(section)
  }, [handleSectionChange])

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
        const id = deckKey(productId, skuId, toolTargetSection)
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
            section: toolTargetSection,
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
    [toolTargetSection, productInfo, setProductInfo, updateCurrentDeck, currentTcgOption]
  )

  const handleAddFromSearch = React.useCallback(
    async (card: any) => {
      const productId = Number(card?.productId ?? card?.ProductId)
      if (!Number.isFinite(productId)) return
      const info = await ensureProductInfo(productId)
      const skuId = card?.skuId ? Number(card.skuId) : null
      updateCurrentDeck((snapshot) => {
        const id = deckKey(productId, skuId, toolTargetSection)
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
            section: toolTargetSection,
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
    [toolTargetSection, ensureProductInfo, updateCurrentDeck, holdingsByProduct, priceMap, currentTcgOption]
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
    let deckValue = 0
    for (const card of deckCards) {
      bySection[card.section] = (bySection[card.section] ?? 0) + card.quantity
      unique.add(`${card.productId}:${card.skuId ?? "_"}`)
      const holdingsQuantity = card.holdingsQuantity ?? 0
      const missing = Math.max(0, card.quantity - holdingsQuantity)
      missingCopies += missing
      const price = priceMap[String(card.productId)] ?? card.marketPrice
      if (typeof price === 'number') {
        deckValue += price * (card.quantity || 0)
      }
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
      value: deckValue,
    }
  }, [deckCards, priceMap])

  const [showMissingOnly, setShowMissingOnly] = React.useState(false)

  // Card details modal state
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [detailsCtx, setDetailsCtx] = React.useState<{ id: string; card: DeckCardRow } | null>(null)

  const openDetails = React.useCallback((card: DeckCardRow) => {
    setDetailsCtx({ id: card.id, card })
    setDetailsOpen(true)
  }, [])

  const handleModalUpdate = React.useCallback(async (updates: any) => {
    if (!detailsCtx) return
    updateCurrentDeck((snapshot) => {
      const idx = snapshot.cards.findIndex((c) => c.id === detailsCtx.id)
      if (idx === -1) return snapshot
      const current = snapshot.cards[idx]
      const next = { ...current }
      if (typeof updates.quantity === 'number') next.quantity = Math.max(1, Math.floor(updates.quantity))
      if (typeof updates.skuId === 'number' || updates.skuId === null) next.skuId = updates.skuId ?? null
      const nextCards = [...snapshot.cards]
      nextCards[idx] = next
      return { ...snapshot, cards: nextCards }
    })
  }, [detailsCtx, updateCurrentDeck])

  const handleModalDelete = React.useCallback(async () => {
    if (!detailsCtx) return
    updateCurrentDeck((snapshot) => ({ ...snapshot, cards: snapshot.cards.filter((c) => c.id !== detailsCtx.id) }))
    setDetailsOpen(false)
  }, [detailsCtx, updateCurrentDeck])

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
  const [analysisProgress, setAnalysisProgress] = React.useState<string | null>(null)

  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  // Build with AI (assistant to construct a deck from holdings)
  const [aiGoal, setAiGoal] = React.useState("")
  const [aiBusy, setAiBusy] = React.useState(false)
  const [aiPlan, setAiPlan] = React.useState<string | null>(null)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [aiProgress, setAiProgress] = React.useState<string | null>(null)
  const [aiEnforce, setAiEnforce] = React.useState(true)
  const [aiBiasToOwned, setAiBiasToOwned] = React.useState(false)
  const [aiCommander, setAiCommander] = React.useState("")

  // Scroll position preservation for tabs
  const collectionScrollRef = React.useRef<HTMLDivElement>(null)
  const catalogScrollRef = React.useRef<HTMLDivElement>(null)
  const aiScrollRef = React.useRef<HTMLDivElement>(null)
  const scrollPositions = React.useRef({
    collection: 0,
    catalog: 0,
    ai: 0
  })

  // Save scroll position when switching tabs
  const handleTabChange = React.useCallback((newTab: string) => {
    // Save current scroll position from the div elements
    if (activeTool === 'collection' && collectionScrollRef.current) {
      scrollPositions.current.collection = collectionScrollRef.current.scrollTop
    } else if (activeTool === 'catalog' && catalogScrollRef.current) {
      scrollPositions.current.catalog = catalogScrollRef.current.scrollTop
    } else if (activeTool === 'ai' && aiScrollRef.current) {
      scrollPositions.current.ai = aiScrollRef.current.scrollTop
    }

    // Change tab
    setActiveToolAndUrl(newTab)

    // Restore scroll position after a brief delay to allow tab content to render
    setTimeout(() => {
      if (newTab === 'collection' && collectionScrollRef.current) {
        collectionScrollRef.current.scrollTop = scrollPositions.current.collection
      } else if (newTab === 'catalog' && catalogScrollRef.current) {
        catalogScrollRef.current.scrollTop = scrollPositions.current.catalog
      } else if (newTab === 'ai' && aiScrollRef.current) {
        aiScrollRef.current.scrollTop = scrollPositions.current.ai
      }
    }, 50)
  }, [activeTool, setActiveToolAndUrl])

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
        cards: payloadCards,
      } as any)
      const savedId = String(id)
      setCurrentDeckId(savedId)
      router.replace(`/dashboard/decks?deck=${savedId}`)
      try {
        await refreshDeckPrices({ deckId: savedId } as any)
        console.log("Deck prices refreshed")
      } catch (e) {
        console.warn("Deck price refresh failed (non-fatal)", e)
      }
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
    setAnalysisProgress("Analyzing deck composition...")
    try {
      // Optimized payload - only send essential data
      const deckPayload = deckCards.map((card) => ({
        productId: card.productId,
        skuId: card.skuId ?? undefined,
        quantity: card.quantity,
        section: card.section,
      }))

      // Reduced holdings payload for better performance
      const holdingsPayload = filteredHoldings
        .filter(row => row.quantity > 0) // Only cards we actually own
        .slice(0, 100) // Reduced from 200 for faster processing
        .map((row) => ({
          productId: row.productId,
          skuId: row.skuId ?? undefined,
          quantity: row.quantity ?? 0,
        }))

      setAnalysisProgress("Processing with AI...")

      const result = await analyzeDeck({
        tcg: selectedTcg,
        format: currentDeck.format ?? undefined,
        deck: {
          name: currentDeck.name || "Untitled Deck",
          cards: deckPayload,
        },
        holdings: holdingsPayload,
        includeAI: true,
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
      setAnalysisProgress(null)
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
    setAiProgress("Generating deck strategy...")
    try {
      // Build optimized holdings by name for AI prompt (prioritize high-value/quantity cards)
      const ownedByName = (filteredHoldings
        .filter(h => h.quantity > 0) // Only include cards we actually own
        .sort((a, b) => {
          // Prioritize by quantity desc, then market price desc
          const qtyDiff = (b.quantity ?? 0) - (a.quantity ?? 0)
          if (qtyDiff !== 0) return qtyDiff
          return (b.marketPrice ?? 0) - (a.marketPrice ?? 0)
        })
        .slice(0, 150) // Reduced from 300 for faster AI processing
      ).map((h) => {
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
        holdings: aiBiasToOwned ? ownedByName : undefined,
      } as any)

      setAiPlan(typeof result?.plan === 'string' ? result.plan : null)
      setAiProgress("Finding cards in catalog...")

      // Map AI card names to productIds via optimized batch search
      const suggested: Array<{ name: string; quantity: number; section: DeckSection }> = (result?.cards || [])
        .map((c: any) => ({ name: String(c.name), quantity: Number(c.quantity || 1), section: (c.section as DeckSection) || 'main' }))

      const additions: Array<{ productId: number; quantity: number; section: DeckSection }> = []

      // Batch process card searches to improve performance
      // Increase concurrency to reduce overall time while staying within server-side rate limits
      const batchSize = 10 // Process 10 cards at once
      for (let i = 0; i < suggested.length; i += batchSize) {
        const batch = suggested.slice(i, i + batchSize)
        setAiProgress(`Finding cards... ${Math.min(i + batchSize, suggested.length)}/${suggested.length}`)

        // Search all cards in batch concurrently
        const searchPromises = batch.map(async (s) => {
          try {
            let payload: any
            let list: any[] = []

            if (currentDeck.format) {
              // Try legal-first search
              payload = await searchLegalProducts({
                tcg: selectedTcg,
                formatCode: currentDeck.format,
                productName: s.name,
                limit: 1, // Only need top match
                offset: 0,
                ...(typeof currentTcgOption?.categoryId === 'number' ? { categoryId: currentTcgOption.categoryId } : {}),
              } as any)
              list = (payload as any)?.results || (payload as any)?.Results || (payload as any)?.data || []
            }

            if (!Array.isArray(list) || list.length === 0) {
              // Fallback to general search
              payload = await searchProducts({
                productName: s.name,
                limit: 1,
                offset: 0,
                ...(typeof currentTcgOption?.categoryId === 'number' ? { categoryId: currentTcgOption.categoryId } : {})
              })
              list = (payload as any)?.results || (payload as any)?.Results || (payload as any)?.data || []
            }

            const top = list[0]
            const productId = Number(top?.productId ?? top?.ProductId)
            if (Number.isFinite(productId) && productId > 0) {
              return { productId, quantity: Math.max(1, Math.floor(s.quantity)), section: s.section }
            }
            return null
          } catch (e) {
            // ignore individual mapping errors
            return null
          }
        })

        // Wait for batch to complete
        const batchResults = await Promise.all(searchPromises)
        additions.push(...batchResults.filter((result): result is { productId: number; quantity: number; section: DeckSection } => result !== null))

        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < suggested.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      if (additions.length === 0) return

      setAiProgress("Adding cards to deck...")

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
      setAiProgress(null)
    }
  }, [filteredHoldings, productInfo, searchProducts, buildDeck, selectedTcg, currentDeck, getTargetMainSize, updateCurrentDeck, holdingsByProduct, currentTcgOption, priceMap, aiGoal])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Modern Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Deck Builder
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded-full">{currentDeck.name || 'Untitled Deck'}</span>
                <span>•</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {currentTcgOption?.label || 'No Game'}
                </span>
                {currentDeck.format && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full">
                      {formatOptions.find(f => f.value === currentDeck.format)?.label || currentDeck.format}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/decks/saved">
                <Button variant="ghost" size="sm">My Decks</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleNewDeck} disabled={saving || deleting}>
                New
              </Button>
              <Button size="sm" onClick={handleSaveDeck} disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save</>
                )}
              </Button>
              {currentDeckId && (
                <Button variant="destructive" size="sm" onClick={handleDeleteDeck} disabled={deleting}>
                  {deleting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-2" />Delete</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deck Configuration Panel (Collapsible) */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deck Name</label>
              <Input
                value={currentDeck.name}
                onChange={(event) =>
                  updateCurrentDeck((snapshot) => ({ ...snapshot, name: event.target.value }))
                }
                placeholder="Enter deck name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Game</label>
              <Select value={selectedTcg} onValueChange={setSelectedTcg}>
                <SelectTrigger className="bg-background">
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
              <label className="text-sm font-medium">Format</label>
              <Select
                value={currentDeck.format ?? ""}
                onValueChange={(value) =>
                  updateCurrentDeck((snapshot) => ({ ...snapshot, format: value || null }))
                }
              >
                <SelectTrigger className="bg-background">
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
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Cards</p>
                    <p className="text-2xl font-bold text-blue-700">{deckStats.total}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-600 text-sm font-medium">Unique Cards</p>
                    <p className="text-2xl font-bold text-emerald-700">{deckStats.unique}</p>
                  </div>
                  <div className="h-8 w-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Missing Cards</p>
                    <p className="text-2xl font-bold text-orange-700">{deckStats.missingCopies}</p>
                  </div>
                  <div className="h-8 w-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Missing Cost</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(deckStats.missingCost)}</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Deck List */}
            <div className="space-y-6">
              {/* Section Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Deck Cards</h2>
                  <div className="flex items-center gap-2">
                    {allowedSections.map((section) => (
                      <Button
                        key={section}
                        size="sm"
                        variant={activeSection === section ? "default" : "outline"}
                        onClick={() => handleSectionChange(section)}
                        className="h-8"
                      >
                        {SECTION_LABELS[section]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Show missing only</span>
                  <Switch
                    checked={showMissingOnly}
                    onCheckedChange={setShowMissingOnly}
                  />
                </div>
              </div>

              {/* Unified Deck Section */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{SECTION_LABELS[activeSection]}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{deckCardsBySection[activeSection].reduce((total, card) => total + card.quantity, 0)} cards</span>
                      <span>•</span>
                      <span>{deckCardsBySection[activeSection].length} unique</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto" ref={deckScrollRef}>
                    {deckCardsBySection[activeSection].length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-lg mb-2">No cards in {SECTION_LABELS[activeSection]}</h3>
                      <p className="text-muted-foreground mb-4">Add cards from your collection or search the catalog</p>
                      <p className="text-sm text-muted-foreground">Use the tools on the right to add cards to this section</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {deckCardsBySection[activeSection].map((card) => {
                        const key = String(card.productId)
                        const info = productInfo[key]
                        const imageUrl = card.imageUrl ?? info?.imageUrl ?? fallbackImage(card.productId)
                        const name = info?.name ?? card.name ?? `#${card.productId}`
                        const setName = info?.setName
                        const holdingsQuantity = card.holdingsQuantity ?? 0
                        const owned = Math.min(card.quantity, holdingsQuantity)
                        const missing = Math.max(0, card.quantity - holdingsQuantity)
                        const marketPrice = priceMap[key] ?? card.marketPrice
                        const totalValue = typeof marketPrice === "number" ? marketPrice * card.quantity : 0

                        return (
                          <div key={card.id} className="group relative bg-background border rounded-lg p-3 hover:shadow-md transition-all duration-200">
                            {/* Card Image */}
                            <div className="relative mb-3">
                              <button
                                type="button"
                                onClick={() => openDetails(card)}
                                className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <img
                                  src={imageUrl}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                              {/* Quantity Badge */}
                              <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium">
                                ×{card.quantity}
                              </div>
                              {/* Missing Badge */}
                              {missing > 0 && (
                                <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  {missing}
                                </div>
                              )}
                            </div>

                            {/* Card Info */}
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => openDetails(card)}
                                className="w-full text-left"
                              >
                                <h4 className="font-medium text-sm leading-tight hover:text-primary transition-colors">{name}</h4>
                                {setName && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ backgroundColor: info?.setColor || 'var(--muted-foreground)' }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {setName}
                                      {info?.setAbbr && (
                                        <span className="uppercase opacity-70 ml-1">({info.setAbbr})</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </button>

                              {/* Price Info */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Market</span>
                                <span className="font-medium">
                                  {typeof marketPrice === "number" ? formatCurrency(marketPrice) : "—"}
                                </span>
                              </div>

                              {totalValue > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Total Value</span>
                                  <span className="font-medium text-green-600">{formatCurrency(totalValue)}</span>
                                </div>
                              )}

                              {/* Ownership Status */}
                              <div className="flex items-center gap-1">
                                {owned > 0 && (
                                  <Badge variant="secondary" className="text-xs h-5">
                                    Owned {owned}
                                  </Badge>
                                )}
                                {missing > 0 && (
                                  <Badge variant="destructive" className="text-xs h-5">
                                    Need {missing}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Card Controls */}
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleAdjustQuantity(card.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-8 text-center">{card.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleAdjustQuantity(card.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveCard(card.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Deck Tools Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Deck Tools
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add cards from your collection, search the catalog, or let AI build for you.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add cards to</label>
                    <div className="flex gap-1">
                      {allowedSections.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={toolTargetSection === s ? "default" : "outline"}
                          onClick={() => handleToolTargetChange(s)}
                          className="flex-1"
                        >
                          {SECTION_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Deck Value Summary */}
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deck Value</span>
                      <span className="font-semibold">{formatCurrency(deckStats.value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Missing Cost</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(deckStats.missingCost)}</span>
                    </div>
                  </div>

                  {/* Tools Tabs */}
                  <Tabs value={activeTool} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="collection" className="text-xs">Collection</TabsTrigger>
                      <TabsTrigger value="catalog" className="text-xs">Catalog</TabsTrigger>
                      <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
                    </TabsList>

                    <TabsContent value="collection" className="mt-4">
                      <div className="space-y-4">
                        <Input
                          value={holdingsSearch}
                          onChange={(e) => setHoldingsSearch(e.target.value)}
                          placeholder="Search your collection..."
                          className="w-full"
                        />

                        <div className="h-[500px] overflow-y-auto" ref={collectionScrollRef}>
                          {holdingsDisplay.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Search className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground">
                                {holdingsSearch ? 'No matching cards found' : 'No cards in your collection for this game'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {holdingsDisplay.map((row) => {
                                const key = `${row.productId}:${row.skuId ?? '_'}`
                                const info = productInfo[String(row.productId)]
                                const name = info?.name ?? `#${row.productId}`
                                const setName = info?.setName
                                const imageUrl = info?.imageUrl ?? fallbackImage(row.productId)
                                return (
                                  <div key={key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                    <div className="h-12 w-9 rounded overflow-hidden bg-muted">
                                      <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate">{name}</h4>
                                      {setName && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <span
                                            className="inline-block h-2 w-2 rounded-full"
                                            style={{ backgroundColor: info?.setColor || 'var(--muted-foreground)' }}
                                          />
                                          <span className="text-xs text-muted-foreground truncate">
                                            {setName}{info?.setAbbr && ` (${info.setAbbr})`}
                                          </span>
                                        </div>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">Owned: {row.quantity}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddFromHolding(row)}
                                      className="shrink-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="catalog" className="mt-4">
                      <div className="space-y-4">
                        <form onSubmit={handleSearch} className="flex gap-2">
                          <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search cards in catalog..."
                            className="flex-1"
                          />
                          <Button type="submit" disabled={searching} size="icon">
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </form>

                        {searchError && (
                          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            {searchError}
                          </div>
                        )}

                        <div className="h-[500px] overflow-y-auto" ref={catalogScrollRef}>
                          {searchResults.length === 0 && !searching ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Search className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground">Search for cards to add to your deck</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {searchResults.map((result, idx) => {
                                const productId = Number(result?.productId ?? result?.ProductId)
                                if (!Number.isFinite(productId)) return null
                                const key = `${productId}:${idx}`
                                const info = productInfo[String(productId)]
                                const name = info?.name ?? result?.name ?? result?.productName ?? `#${productId}`
                                const setName = info?.setName ?? result?.groupName ?? result?.setName
                                const imageUrl = info?.imageUrl ?? fallbackImage(productId)
                                return (
                                  <div key={key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                    <div className="h-12 w-9 rounded overflow-hidden bg-muted">
                                      <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate">{name}</h4>
                                      {setName && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <span
                                            className="inline-block h-2 w-2 rounded-full"
                                            style={{ backgroundColor: info?.setColor || 'var(--muted-foreground)' }}
                                          />
                                          <span className="text-xs text-muted-foreground truncate">
                                            {setName}{info?.setAbbr && ` (${info.setAbbr})`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddFromSearch(result)}
                                      className="shrink-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="ai" className="mt-4">
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Goal / Archetype</label>
                            <Input
                              value={aiGoal}
                              onChange={(e) => setAiGoal(e.target.value)}
                              placeholder="e.g., Aggro, Control, Combo..."
                            />
                          </div>

                          {selectedTcg === 'mtg' && (currentDeck.format || '').toLowerCase() === 'commander' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Commander</label>
                              <Input
                                value={aiCommander}
                                onChange={(e) => setAiCommander(e.target.value)}
                                placeholder="Name your commander"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Enforce Format Rules</p>
                              <p className="text-xs text-muted-foreground">Follow format restrictions</p>
                            </div>
                            <Switch checked={aiEnforce} onCheckedChange={setAiEnforce} />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Bias to Owned Collection</p>
                              <p className="text-xs text-muted-foreground">Prefer cards you already own (optional)</p>
                            </div>
                            <Switch checked={aiBiasToOwned} onCheckedChange={setAiBiasToOwned} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button onClick={handleAiBuild} disabled={aiBusy} className="w-full">
                            {aiBusy ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{aiProgress || "Building deck..."}</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-2" />Build with AI</>
                            )}
                          </Button>

                          <Button
                            onClick={handleAnalyzeDeck}
                            disabled={analysisBusy || deckCards.length === 0}
                            variant="outline"
                            className="w-full"
                          >
                            {analysisBusy ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{analysisProgress || "Analyzing..."}</>
                            ) : (
                              <><Search className="h-4 w-4 mr-2" />Analyze Deck</>
                            )}
                          </Button>
                        </div>

                        {(aiError || analysisState.error) && (
                          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            {aiError || analysisState.error}
                          </div>
                        )}

                        <div className="h-[360px] overflow-y-auto" ref={aiScrollRef}>
                          {analysisState.result ? (
                            <div className="space-y-3">
                              {/* Analysis Summary */}
                              {analysisState.result.ai?.analysis?.summary && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Analysis</h4>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">{analysisState.result.ai.analysis.summary}</p>
                                </div>
                              )}

                              {/* Strengths */}
                              {analysisState.result.ai?.analysis?.strengths?.length > 0 && (
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Strengths</h4>
                                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                                    {analysisState.result.ai.analysis.strengths.map((strength: string, idx: number) => (
                                      <li key={idx}>• {strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Weaknesses */}
                              {analysisState.result.ai?.analysis?.weaknesses?.length > 0 && (
                                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Areas to Improve</h4>
                                  <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                                    {analysisState.result.ai.analysis.weaknesses.map((weakness: string, idx: number) => (
                                      <li key={idx}>• {weakness}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Suggestions */}
                              {analysisState.result.ai?.suggestions?.length > 0 && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Suggestions</h4>
                                  <div className="space-y-2">
                                    {analysisState.result.ai.suggestions.map((suggestion: any, idx: number) => (
                                      <div key={idx} className="text-sm text-purple-800 dark:text-purple-200">
                                        <p className="font-medium">{suggestion.change}</p>
                                        <p className="text-xs opacity-75">{suggestion.rationale}</p>
                                        {suggestion.requiresPurchase && (
                                          <Badge variant="outline" className="mt-1 text-xs">Requires Purchase</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : aiPlan ? (
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted/30 rounded-lg">
                              {aiPlan}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground">{aiBiasToOwned ? 'AI will create a deck plan biased to your collection' : 'AI will create a deck plan following format rules'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Card Details Modal */}
      <CardDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        card={{
          ...detailsCtx?.card,
          name: detailsCtx?.card?.name ?? productInfo[String(detailsCtx?.card?.productId || '')]?.name,
          imageUrl: detailsCtx?.card?.imageUrl ?? productInfo[String(detailsCtx?.card?.productId || '')]?.imageUrl,
          setName: productInfo[String(detailsCtx?.card?.productId || '')]?.setName,
        }}
        onUpdateCard={async (updates: any) => {
          await handleModalUpdate(updates)
        }}
        onDeleteCard={async () => {
          await handleModalDelete()
        }}
        getProductDetails={async (ids: number[]) => await getProductDetails({ productIds: ids } as any)}
        getProductPrices={async (ids: number[]) => await getProductPrices({ productIds: ids } as any)}
        getSkus={async (ids: number[]) => await getSkus({ productIds: ids } as any)}
        getGroupsByIds={async (gids: number[]) => await getGroupsByIds({ groupIds: gids } as any)}
      />
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
