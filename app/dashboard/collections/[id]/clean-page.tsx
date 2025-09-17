"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Grid3X3,
  Square,
  Filter,
  TrendingUp,
  TrendingDown,
  Package2,
  DollarSign,
  Plus,
  Minus,
  Search,
  Download,
  Upload,
  Sparkles,
  BarChart3,
  CheckSquare,
  FolderOpen,
  Star,
  Trophy,
  Crown,
  MoreVertical,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Zap,
  ExternalLink
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AddCardsDialogV2 } from "@/components/collections/add-cards-dialog-v2"
import { CardDetailsModal } from "@/components/collections/card-details-modal"

// Card view model for rendering grid/list items
type CardView = {
  _id: string
  productId: number
  name: string
  setName?: string
  number?: string
  quantity: number
  condition: string
  imageUrl: string
  marketPrice: number
  priceChange: number
  rarity: string
  foil: boolean
  tcgPlayerUrl: string
}

const CONDITIONS = [
  { value: "NM", label: "Near Mint", color: "bg-green-500", conditionId: 1 },
  { value: "LP", label: "Lightly Played", color: "bg-blue-500", conditionId: 2 },
  { value: "MP", label: "Moderately Played", color: "bg-yellow-500", conditionId: 3 },
  { value: "HP", label: "Heavily Played", color: "bg-orange-500", conditionId: 4 },
  { value: "DMG", label: "Damaged", color: "bg-red-500", conditionId: 5 },
]

// TCGPlayer condition ID to abbreviation mapping
const CONDITION_ID_MAP: Record<number, string> = {
  1: "NM",   // Near Mint
  2: "LP",   // Lightly Played
  3: "MP",   // Moderately Played
  4: "HP",   // Heavily Played
  5: "DMG",  // Damaged
  6: "U",    // Unopened
  7: "FN",   // Fine
  8: "GD",   // Good
  9: "FR",   // Fair
}

const RARITIES = [
  { value: "common", label: "Common", color: "text-gray-500" },
  { value: "uncommon", label: "Uncommon", color: "text-green-500" },
  { value: "rare", label: "Rare", color: "text-blue-500" },
  { value: "secret", label: "Secret Rare", color: "text-purple-500" },
]

const VIEW_MODES = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "gallery", label: "Gallery", icon: Grid3X3 },
  { value: "compact", label: "Compact", icon: Square },
]

const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "value-high", label: "Value (High-Low)" },
  { value: "value-low", label: "Value (Low-High)" },
  { value: "recent", label: "Recently Added" },
  { value: "condition", label: "By Condition" },
  { value: "rarity", label: "By Rarity" },
]

export default function CleanFolderDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  
  // State
  const [viewMode, setViewMode] = React.useState<"grid" | "list" | "gallery" | "compact">("grid")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("value-high")
  const [selectedCards, setSelectedCards] = React.useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [selectedCardForDetails, setSelectedCardForDetails] = React.useState<any>(null)
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)
  const [isRefreshingPrices, setIsRefreshingPrices] = React.useState(false)

  // Convex queries/actions for real data
  const collectionId = params.id as any
  const isRealCollectionId = React.useMemo(() => !/^demo-/i.test(String(params.id)), [params.id])
  const itemsData = useQuery(api.collections.listItems, isRealCollectionId ? { collectionId } : ({} as any))
  const items = React.useMemo(() => itemsData ?? [], [itemsData])
  const summary = useQuery(api.collections.collectionSummary, isRealCollectionId ? ({ collectionId } as any) : "skip") || { totalQuantity: 0, distinctProducts: 0, estimatedValue: 0 }
  const allCollections = useQuery(api.collections.listCollections, ({} as any)) || []

  const addItem = useMutation(api.collections.addItem)
  const removeItem = useMutation(api.collections.removeItem)
  const updateItemQuantity = useMutation(api.collections.updateItemQuantity)
  const updateItemFields = useMutation(api.collections.updateItemFields)

  const getCategories = useAction(api.tcg.getCategories)
  const getAllGroups = useAction(api.tcg.getAllGroups)
  const searchProducts = useAction(api.tcg.searchProducts)
  const getProductDetails = useAction(api.tcg.getProductDetails)
  const getProductPrices = useAction(api.tcg.getProductPrices)
  const getSkuPrices = useAction(api.tcg.getSkuPrices)
  const upsertPrices = useMutation(api.pricing.upsertPrices)
  const getSkus = useAction(api.tcg.getSkus)

  // Enrichment maps for product names, thumbs, and prices
  const [itemNames, setItemNames] = React.useState<Record<string, string>>({})
  const [itemThumbs, setItemThumbs] = React.useState<Record<string, string>>({})
  const [itemPrices, setItemPrices] = React.useState<Record<string, number>>({})
  const [itemUrls, setItemUrls] = React.useState<Record<string, string>>({})
  const [itemSkus, setItemSkus] = React.useState<Record<string, any[]>>({}) // productId -> SKU array
  const [lastPriceRefresh, setLastPriceRefresh] = React.useState<Date>(new Date())

  // We fetch fresh prices every time to ensure real-time accuracy

  // Helper function to get condition-specific price for a card
  const getConditionPrice = React.useCallback((productId: number, condition: string): number => {
    const pid = String(productId)
    const conditionData = CONDITIONS.find(c => c.value === condition)
    if (!conditionData) return itemPrices[pid] || 0

    const skus = itemSkus[pid] || []
    const conditionSku = skus.find(sku => sku.conditionId === conditionData.conditionId)

    if (conditionSku && conditionSku.price) {
      return conditionSku.price
    }

    // Fallback to general product price
    return itemPrices[pid] || 0
  }, [itemPrices, itemSkus])

  // Force refresh prices function
  const refreshPrices = React.useCallback(async () => {
    const pids = Array.from(new Set(items.map((it: any) => Number(it.productId)).filter(Boolean)))
    if (pids.length === 0) return

    setIsRefreshingPrices(true)
    try {
      console.log("Refreshing condition-specific prices for", pids.length, "products...")

      // Step 1: Get SKUs for all products to understand condition structure
      const skusResponse = await getSkus({ productIds: pids })
      const skusList: any[] = (skusResponse as any)?.results || (skusResponse as any)?.Results || (skusResponse as any)?.data || []

      console.log("Received", skusList.length, "SKUs")

      // Step 2: Group SKUs by product and condition
      const skuMap: Record<string, any[]> = {}
      const skuIdsToPrice: number[] = []

      skusList.forEach((sku: any) => {
        const pid = String(sku.productId)
        if (!skuMap[pid]) skuMap[pid] = []
        skuMap[pid].push(sku)
        skuIdsToPrice.push(sku.skuId || sku.productConditionId)
      })

      // Step 3: Get pricing for all relevant SKUs
      let skuPricing: any[] = []
      if (skuIdsToPrice.length > 0) {
        const skuPrices = await getSkuPrices({ skuIds: skuIdsToPrice })
        skuPricing = (skuPrices as any)?.results || (skuPrices as any)?.Results || (skuPrices as any)?.data || []
      }

      console.log("Received", skuPricing.length, "SKU price records")

      // Step 4: Build SKU map with pricing
      const enrichedSkuMap: Record<string, any[]> = {}
      Object.keys(skuMap).forEach(pid => {
        enrichedSkuMap[pid] = skuMap[pid].map((sku: any) => {
          const pricing = skuPricing.find((p: any) => p.skuId === sku.skuId)
          return {
            ...sku,
            price: pricing?.marketPrice || pricing?.midPrice || pricing?.lowPrice || 0
          }
        })
      })

      // Step 5: Fallback pricing (for products without SKU pricing)
      const prices = await getProductPrices({ productIds: pids })
      const plist: any[] = (prices as any)?.results || (prices as any)?.Results || (prices as any)?.data || []

      const priceMap: Record<string, number> = {}
      for (const rec of plist) {
        const pid = String(rec.productId ?? rec.ProductId)
        if (!pid) continue

        let market = 0
        const subType = rec.subTypeName || 'Normal'

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

      setItemSkus(enrichedSkuMap)
      setItemPrices(priceMap)
      setLastPriceRefresh(new Date())

      // Persist fetched prices to cache
      try {
        const entries = plist.map((entry: any) => ({
          productId: Number(entry.productId || entry.ProductId),
          categoryId: 0,
          currency: 'USD',
          data: entry,
        }))
        if (entries.length > 0) {
          await upsertPrices({ entries })
        }
      } catch {}

      console.log("Condition-specific price refresh complete. Updated", Object.keys(priceMap).length, "products with", Object.keys(enrichedSkuMap).length, "SKU sets")
    } catch (e) {
      console.error("Failed to refresh prices:", e)
    } finally {
      setIsRefreshingPrices(false)
    }
  }, [items, getProductPrices, upsertPrices])

  // Fetch product details and prices for items
  React.useEffect(() => {
    const pids = Array.from(new Set(items.map((it: any) => Number(it.productId)).filter(Boolean)))
    if (pids.length === 0) { setItemNames({}); setItemThumbs({}); setItemPrices({}); return }
    (async () => {
      try {
        // Always fetch fresh product details
        const details = await getProductDetails({ productIds: pids })
        const dlist: any[] = (details as any)?.results || (details as any)?.Results || (details as any)?.data || []

        const nameMap: Record<string, string> = {}
        const urlMap: Record<string, string> = {}
        for (const d of dlist) {
          const pid = String(d.productId ?? d.ProductId ?? d.product?.productId)
          if (pid) {
            nameMap[pid] = d.name ?? d.ProductName ?? d.product?.name ?? `#${pid}`
            urlMap[pid] = d.url ?? `https://www.tcgplayer.com/product/${pid}`
          }
        }

        const thumbMap: Record<string, string> = {}
        for (const pid of pids) {
          thumbMap[String(pid)] = `https://product-images.tcgplayer.com/${pid}.jpg`
        }

        setItemNames(nameMap)
        setItemThumbs(thumbMap)
        setItemUrls(urlMap)

        // Refresh prices automatically
        await refreshPrices()
      } catch (e) {
        console.error("Failed to fetch product details:", e)
      }
    })()
  }, [items, refreshPrices])

  // Build render cards from real items
  const renderCards = React.useMemo(() => {
    return items.map((it: any) => {
      const pidKey = String(it.productId)
      return {
        _id: String(it._id),
        productId: it.productId,
        name: itemNames[pidKey] ?? `#${it.productId}`,
        setName: it.groupName ?? '',
        number: '',
        quantity: it.quantity ?? 0,
        condition: it.condition ?? 'NM',
        imageUrl: itemThumbs[pidKey] ?? `https://product-images.tcgplayer.com/${it.productId}.jpg`,
        marketPrice: getConditionPrice(it.productId, it.condition ?? 'NM'),
        priceChange: 0,
        rarity: 'rare',
        foil: false,
        tcgPlayerUrl: itemUrls[pidKey] ?? `https://www.tcgplayer.com/product/${it.productId}`,
      }
    })
  }, [items, itemNames, itemThumbs, itemPrices, itemUrls, getConditionPrice])

  // Filter and sort cards
  const filteredCards = React.useMemo(() => {
    let filtered = [...renderCards]
    
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.setName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "value-high":
          return (b.marketPrice * b.quantity) - (a.marketPrice * a.quantity)
        case "value-low":
          return (a.marketPrice * a.quantity) - (b.marketPrice * b.quantity)
        case "recent":
          return b.productId - a.productId
        case "condition":
          return a.condition.localeCompare(b.condition)
        case "rarity":
          return a.rarity.localeCompare(b.rarity)
        default:
          return 0
      }
    })
    
    return filtered
  }, [renderCards, searchQuery, sortBy])

  // Derive a few client-side stats
  const topCard = React.useMemo(() => {
    return [...filteredCards].sort((a, b) => b.marketPrice - a.marketPrice)[0]
  }, [filteredCards])

  const computedTotals = React.useMemo(() => {
    const totalQuantity = filteredCards.reduce((s, c) => s + (c.quantity || 0), 0)
    const estimatedValue = filteredCards.reduce((s, c) => s + (c.marketPrice * (c.quantity || 0)), 0)
    return { totalQuantity, estimatedValue }
  }, [filteredCards])

  const folderMeta = React.useMemo(() => {
    const found = (allCollections as any[]).find(c => String(c._id) === String(collectionId))
    return {
      name: found?.name || "Collection",
      description: found?.description || "",
    }
  }, [allCollections, collectionId])

  // Dev-only helper to quickly seed a few products for testing
  async function seedTestItems() {
    const testPids = [121, 122, 123]
    try {
      await Promise.all(testPids.map(pid => addItem({ collectionId: isRealCollectionId ? collectionId : undefined, categoryId: 0, productId: pid, quantity: 1 })))
      const pr = await getProductPrices({ productIds: testPids })
      const plist: any[] = (pr as any)?.results || (pr as any)?.Results || (pr as any)?.data || []
      const entries = plist.map((entry: any) => ({
        productId: Number(entry.productId || entry.ProductId),
        categoryId: 0,
        currency: 'USD',
        data: entry,
      }))
      if (entries.length > 0) await upsertPrices({ entries })
    } catch (e) {
      console.error(e)
    }
  }

  const handleCardClick = (card: CardView, e: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return
    
    const fullCard = items.find((item: any) => String(item._id) === card._id)
    if (fullCard) {
      setSelectedCardForDetails({
        ...fullCard,
        ...card,
        imageUrl: card.imageUrl
      })
      setDetailsModalOpen(true)
    }
  }

  const handleUpdateCard = async (updates: any) => {
    if (!selectedCardForDetails) return
    try {
      const payload: any = { itemId: selectedCardForDetails._id as any }
      if (updates.quantity !== undefined) payload.quantity = updates.quantity
      if (updates.condition !== undefined) payload.condition = updates.condition
      if (updates.skuId !== undefined) payload.skuId = Number(updates.skuId)
      if (updates.notes !== undefined) payload.notes = updates.notes
      if (updates.acquiredPrice !== undefined) payload.acquiredPrice = updates.acquiredPrice
      // Persist updates
      await updateItemFields(payload)
      // Update local state for immediate feedback
      setSelectedCardForDetails({ ...selectedCardForDetails, ...updates })
    } catch (error) {
      console.error('Failed to update card:', error)
    }
  }

  const handleDeleteCard = async () => {
    if (!selectedCardForDetails) return
    try {
      await removeItem({ itemId: selectedCardForDetails._id as any })
      setDetailsModalOpen(false)
      setSelectedCardForDetails(null)
    } catch (error) {
      console.error('Failed to delete card:', error)
    }
  }

  const CardGridItem = ({ card }: { card: CardView }) => {
    const condition = CONDITIONS.find(c => c.value === card.condition)
    const rarity = RARITIES.find(r => r.value === card.rarity)

    if (viewMode === "list") {
      return (
        <div 
          className="group bg-gradient-to-r from-background/95 to-muted/20 backdrop-blur-sm rounded-lg border border-border/50 hover:border-primary/50 transition-all p-4 cursor-pointer"
          onClick={(e) => handleCardClick(card, e)}
        >
          <div className="flex items-center gap-4">
            {bulkMode && (
              <input
                type="checkbox"
                checked={selectedCards.has(card._id)}
                onChange={(e) => {
                  const newSet = new Set(selectedCards)
                  if (e.target.checked) {
                    newSet.add(card._id)
                  } else {
                    newSet.delete(card._id)
                  }
                  setSelectedCards(newSet)
                }}
                className="rounded"
              />
            )}
            <img 
              src={card.imageUrl} 
              alt={card.name}
              className="w-16 h-22 object-cover rounded-lg"
            />
            <div className="flex-1">
              <p className="font-semibold">{card.name}</p>
              <p className="text-sm text-muted-foreground">{card.setName}</p>
            </div>
        {/* No spacer needed; sticky header respects global header height */}
            <Badge className={cn("text-xs text-white", condition?.color)}>
              {condition?.label || card.condition}
            </Badge>
            <div className="text-right space-y-1">
              <p className="font-semibold">${card.marketPrice}</p>
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={async () => { try { await updateItemQuantity({ itemId: card._id as any, quantity: Math.max(0, (card.quantity - 1)) }) } catch {} }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{card.quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={async () => { try { await updateItemQuantity({ itemId: card._id as any, quantity: card.quantity + 1 }) } catch {} }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                window.open(card.tcgPlayerUrl, '_blank')
              }}
              className="text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { try { await removeItem({ itemId: card._id as any }) } catch {} }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <Card 
        className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background/95 to-muted/20 backdrop-blur-sm border-border/50 hover:border-primary/50 cursor-pointer"
        onClick={(e) => handleCardClick(card, e)}
      >
        {bulkMode && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selectedCards.has(card._id)}
              onChange={(e) => {
                const newSet = new Set(selectedCards)
                if (e.target.checked) {
                  newSet.add(card._id)
                } else {
                  newSet.delete(card._id)
                }
                setSelectedCards(newSet)
              }}
              className="rounded"
            />
          </div>
        )}
        
        <div className="relative aspect-[3/5] bg-gradient-to-br from-muted/50 to-muted/30">
          <img 
            src={card.imageUrl} 
            alt={card.name}
            className="w-full h-full object-cover"
          />
          {card.foil && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Foil
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">{card.name}</h3>
              <p className="text-sm text-muted-foreground">{card.setName} • {card.number}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs text-white", condition?.color)}>
                {condition?.label || card.condition}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {rarity?.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-2xl font-bold">${card.marketPrice}</p>
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  card.priceChange >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {card.priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{card.priceChange >= 0 ? "+" : ""}{card.priceChange}%</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={async () => { try { await updateItemQuantity({ itemId: card._id as any, quantity: Math.max(0, (card.quantity - 1)) }) } catch {} }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="text-sm text-muted-foreground min-w-[2rem] text-center">{card.quantity}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={async () => { try { await updateItemQuantity({ itemId: card._id as any, quantity: card.quantity + 1 }) } catch {} }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(card.tcgPlayerUrl, '_blank')
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => { try { await removeItem({ itemId: card._id as any }) } catch {} }}
                  className="text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        {/* Collection Header: sticky under global dashboard header */}
        <div className="sticky top-[var(--header-height)] z-40 backdrop-blur-xl bg-background/80 border-b border-muted-foreground/10">
          <div className="px-4 lg:px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/dashboard/collections")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600">
                    <FolderOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{folderMeta.name}</h1>
                    {folderMeta.description && (
                      <p className="text-muted-foreground">{folderMeta.description}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkMode(!bulkMode)}
                  className={cn(bulkMode && "bg-primary/10 border-primary")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {bulkMode ? "Exit Selection" : "Select Cards"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPrices}
                  disabled={isRefreshingPrices}
                  className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20"
                >
                  {isRefreshingPrices ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-green-500 border-t-transparent rounded-full" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Refresh Prices
                    </>
                  )}
                </Button>

                <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cards
                </Button>
                {process.env.NODE_ENV !== 'production' && (
                  <Button variant="outline" size="sm" onClick={seedTestItems}>
                    Seed Test Items
                  </Button>
                )}
                <AddCardsDialogV2
                  open={addOpen}
                  onOpenChange={setAddOpen}
                  onAddCards={async (cards) => {
                    // Add all selected cards
                    await Promise.all(cards.map(async (c: any) => {
                      const pid = Number(c.productId || c.ProductId)
                      const skuId = c.skuId ? Number(c.skuId) : undefined
                      const cat = Number(c.categoryId || c.CategoryId) || 0
                      const qty = Number(c.quantity || 1)
                      const condition = c.condition as string | undefined
                      await addItem({ collectionId: isRealCollectionId ? collectionId : undefined, categoryId: cat, productId: pid, skuId, quantity: qty, condition })
                    }))
                    // Upsert pricing cache for all distinct products
                    try {
                      const pids = Array.from(new Set(cards.map((c: any) => Number(c.productId || c.ProductId)).filter(Boolean)))
                      if (pids.length > 0) {
                        const pr = await getProductPrices({ productIds: pids })
                        const plist: any[] = (pr as any)?.results || (pr as any)?.Results || (pr as any)?.data || []
                        const entries = plist.map((entry: any) => ({
                          productId: Number(entry.productId || entry.ProductId),
                          categoryId: 0,
                          currency: 'USD',
                          data: entry,
                        }))
                        if (entries.length > 0) {
                          await upsertPrices({ entries })
                        }
                      }
                    } catch {}
                  }}
                  getCategories={() => getCategories({})}
                  getAllGroups={(categoryId: number) => getAllGroups({ categoryId })}
                  searchProducts={(params: any) => searchProducts(params)}
                  getProductDetails={(ids: number[]) => getProductDetails({ productIds: ids })}
                  getSkus={(ids: number[]) => getSkus({ productIds: ids })}
                />
                
                {/* Card Details Modal */}
                <CardDetailsModal
                  open={detailsModalOpen}
                  onOpenChange={setDetailsModalOpen}
                  card={{
                    ...selectedCardForDetails,
                    tcgPlayerUrl: selectedCardForDetails?.tcgPlayerUrl || itemUrls[String(selectedCardForDetails?.productId)] || `https://www.tcgplayer.com/product/${selectedCardForDetails?.productId}`
                  }}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                  getProductDetails={(ids: number[]) => getProductDetails({ productIds: ids })}
                  getProductPrices={(ids: number[]) => getProductPrices({ productIds: ids })}
                  getSkus={(ids: number[]) => getSkus({ productIds: ids })}
                />
              </div>
            </div>

            {/* Stats Cards (smaller, data-driven) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cards</p>
                      <p className="text-xl font-semibold">{computedTotals.totalQuantity}</p>
                      <p className="text-[11px] text-muted-foreground">{filteredCards.length} unique</p>
                    </div>
                    <Package2 className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-xl font-semibold">${computedTotals.estimatedValue.toLocaleString()}</p>
                      <p className="text-[11px] text-green-500">
                        Last updated: {lastPriceRefresh.toLocaleTimeString()}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Card Value</p>
                      <p className="text-xl font-semibold">${(computedTotals.totalQuantity ? (computedTotals.estimatedValue / computedTotals.totalQuantity) : 0).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">per card</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Most Valuable</p>
                      <p className="text-sm font-semibold line-clamp-1">{topCard?.name}</p>
                      <p className="text-[11px] text-yellow-500">${topCard?.marketPrice ?? 0}</p>
                    </div>
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Distinct Products</p>
                      <p className="text-xl font-semibold">{new Set(filteredCards.map(c => c.productId)).size}</p>
                      <p className="text-[11px] text-muted-foreground">in this view</p>
                    </div>
                    <Star className="h-6 w-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {VIEW_MODES.map((mode) => (
                    <Tooltip key={mode.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === mode.value ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "rounded-none",
                            viewMode === mode.value && "pointer-events-none"
                          )}
                          onClick={() => setViewMode(mode.value as any)}
                        >
                          <mode.icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mode.label} View</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filters */}
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="px-4 lg:px-6 py-6">
          {filteredCards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No cards found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? `No cards match "${searchQuery}"` : "Add cards to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              "grid gap-4",
              viewMode === "grid" && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
              viewMode === "list" && "grid-cols-1",
              viewMode === "gallery" && "grid-cols-1 md:grid-cols-2",
              viewMode === "compact" && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            )}>
              {filteredCards.map((card) => (
                <CardGridItem key={card._id} card={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
