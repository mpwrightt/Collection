"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { CreateFolderDialog } from "@/components/collections/create-folder-dialog"
import { SetTargetDialog } from "@/components/collections/set-target-dialog"
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Star,
  Sparkles,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Filter,
  Settings2,
  Download,
  Upload,
  FolderPlus,
  Grid3X3,
  Square,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Eye,
  ChevronRight,
  Zap,
  Shield,
  Trophy,
  Crown,
  Gem,
  Target,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Simple global semaphore to throttle concurrent folder progress fetches
const MAX_PROGRESS_CONCURRENCY = 4
let progressInFlight = 0
const progressWaiters: Array<() => void> = []
async function acquireProgressSlot() {
  if (progressInFlight < MAX_PROGRESS_CONCURRENCY) {
    progressInFlight++
    return
  }
  await new Promise<void>((resolve) => progressWaiters.push(resolve))
  progressInFlight++
}
function releaseProgressSlot() {
  progressInFlight = Math.max(0, progressInFlight - 1)
  const next = progressWaiters.shift()
  if (next) next()
}

interface CollectionFolder {
  _id: string
  name: string
  itemCount: number
  estimatedValue?: number
  averageValue?: number
  totalQuantity?: number
  distinctProducts?: number
  completionPercentage?: number
  missingCards?: number
  lastUpdated?: string | number
  summaryUpdatedAt?: number
  valueChange?: number
  icon?: string
  color?: string
  tags?: string[]
  featured?: boolean
  grade?: 'S' | 'A' | 'B' | 'C'
}

type CollectionSummary = {
  collectionId: string
  totalQuantity: number
  distinctProducts: number
  estimatedValue: number
  averageValue: number
  completionPercentage: number
  missingCards: number
  setName: string | null
  setAbbreviation: string | null
  targetCardCount: number
  ownedTargetCards: number
  latestItemUpdatedAt: number
  updatedAt: number
}

type CollectionSetProgress = {
  completionPercentage: number
  missingCards: number
  setName: string | null
  setAbbreviation: string | null
  targetCardCount: number
  ownedTargetCards: number
}

const VIEW_MODES = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "gallery", label: "Gallery", icon: Grid3X3 },
  { value: "compact", label: "Compact", icon: Square },
]

const SORT_OPTIONS = [
  { value: "value-high", label: "Value (High to Low)" },
  { value: "value-low", label: "Value (Low to High)" },
  { value: "recent", label: "Recently Updated" },
  { value: "name", label: "Name (A-Z)" },
  { value: "cards", label: "Most Cards" },
  { value: "trending", label: "Trending" },
]

const GRADE_BADGES = {
  'S': { color: "from-yellow-400 to-amber-600", label: "Elite", icon: Crown },
  'A': { color: "from-purple-400 to-purple-600", label: "Excellent", icon: Gem },
  'B': { color: "from-blue-400 to-blue-600", label: "Good", icon: Shield },
  'C': { color: "from-gray-400 to-gray-600", label: "Standard", icon: Package },
}

// Demo mode enabled when Convex url is not configured at build time
const DEMO_MODE = !process.env.NEXT_PUBLIC_CONVEX_URL
// Only show debug pricing controls in non-production environments
const SHOW_DEBUG_PRICING = process.env.NODE_ENV !== 'production'

// Demo data for testing
const DEMO_FOLDERS = [
  {
    _id: "demo-1",
    name: "Vintage Pokemon Collection",
    itemCount: 342,
    estimatedValue: 15420.50,
    valueChange: 12.3,
    lastUpdated: new Date().toISOString(),
    icon: "folder",
    color: "from-yellow-500 to-amber-600",
    tags: ["pokemon", "vintage", "1st edition"],
    featured: true,
    grade: 'S' as const
  },
  {
    _id: "demo-2",
    name: "Modern MTG Masters",
    itemCount: 156,
    estimatedValue: 8250.00,
    valueChange: -2.1,
    lastUpdated: new Date(Date.now() - 86400000).toISOString(),
    icon: "folder",
    color: "from-purple-500 to-purple-600",
    tags: ["magic", "modern", "competitive"],
    featured: false,
    grade: 'A' as const
  },
  {
    _id: "demo-3",
    name: "Yu-Gi-Oh Tournament Deck",
    itemCount: 89,
    estimatedValue: 3420.75,
    valueChange: 5.7,
    lastUpdated: new Date(Date.now() - 172800000).toISOString(),
    icon: "folder",
    color: "from-blue-500 to-blue-600",
    tags: ["yugioh", "tournament", "meta"],
    featured: true,
    grade: 'B' as const
  },
  {
    _id: "demo-4",
    name: "One Piece Card Game",
    itemCount: 234,
    estimatedValue: 6890.25,
    valueChange: 18.9,
    lastUpdated: new Date().toISOString(),
    icon: "folder",
    color: "from-red-500 to-red-600",
    tags: ["one-piece", "new", "trending"],
    featured: true,
    grade: 'A' as const
  }
]

export default function CollectionsPage() {
  const router = useRouter()
  
  // Convex queries and mutations
  const folders = useQuery(api.collections.listCollectionsWithCounts, { parentId: undefined }) || []
  const summaries = useQuery(api.collections.listCollectionSummaries, {}) || []
  const createCollection = useMutation(api.collections.createCollection)
  const updateCollection = useMutation(api.collections.updateCollection)
  const deleteCollection = useMutation(api.collections.deleteCollection)
  const addPricingForUserCards = useMutation(api.debug.addPricingForUserCards)
  const refreshAllPrices = useAction(api.collections.refreshAllPricesAndSummaries)
  const getCollectionSetProgress = useAction(api.collections.getCollectionSetProgress)

  // Get collection stats
  
  // UI State
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'gallery' | 'compact'>('grid')
  const [sortBy, setSortBy] = React.useState('value-high')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const summariesMap = React.useMemo(() => {
    const map = new Map<string, CollectionSummary>()
    for (const summary of summaries as any[]) {
      map.set(String(summary.collectionId), {
        collectionId: String(summary.collectionId),
        totalQuantity: summary.totalQuantity ?? 0,
        distinctProducts: summary.distinctProducts ?? 0,
        estimatedValue: summary.estimatedValue ?? 0,
        averageValue: summary.averageValue ?? 0,
        completionPercentage: summary.completionPercentage ?? 0,
        missingCards: summary.missingCards ?? 0,
        setName: summary.setName ?? null,
        setAbbreviation: summary.setAbbreviation ?? null,
        targetCardCount: summary.targetCardCount ?? 0,
        ownedTargetCards: summary.ownedTargetCards ?? 0,
        latestItemUpdatedAt: summary.latestItemUpdatedAt ?? 0,
        updatedAt: summary.updatedAt ?? 0
      })
    }
    return map
  }, [summaries])

  const progressCacheRef = React.useRef<Map<string, CollectionSetProgress>>(new Map())

  // Auto-refresh SKU pricing and summaries once on page load (no button)
  React.useEffect(() => {
    let did = false
    if (DEMO_MODE) return
    const run = async () => {
      if (did) return
      did = true
      try {
        await refreshAllPrices({})
      } catch (e) {
        console.warn('Auto price refresh failed:', e)
      }
    }
    run()
  }, [refreshAllPrices])

  // Process folders with enhanced data using real pricing data
  const enhancedFolders = React.useMemo(() => {
    const base = folders as any[]
    const colorOptions = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-green-500 to-green-600",
      "from-orange-500 to-orange-600",
      "from-red-500 to-red-600",
      "from-indigo-500 to-indigo-600",
      "from-pink-500 to-pink-600",
      "from-teal-500 to-teal-600"
    ]

    return base.map((folder: any) => {
      const summary = summariesMap.get(String(folder._id))
      // Extract color from labels if available
      const colorLabel = folder.labels?.find((label: string) => label.startsWith('color:'))
      const extractedColor = colorLabel ? colorLabel.replace('color:', '') : null

      return {
        ...folder,
        estimatedValue: summary?.estimatedValue ?? 0,
        averageValue: summary?.averageValue ?? 0,
        totalQuantity: summary?.totalQuantity ?? folder.itemCount ?? 0,
        distinctProducts: summary?.distinctProducts ?? undefined,
        completionPercentage: summary?.completionPercentage ?? 0,
        missingCards: summary?.missingCards ?? undefined,
        summaryUpdatedAt: summary?.updatedAt ?? undefined,
        valueChange: 0, // We don't track historical data yet
        lastUpdated: summary?.updatedAt || folder.updatedAt || folder.createdAt || Date.now(),
        icon: "folder",
        color: extractedColor || colorOptions[Math.abs(folder._id?.charCodeAt?.(0) || 0) % colorOptions.length],
        tags: (folder.labels || []).filter((label: string) => !label.startsWith('color:') && !label.startsWith('icon:')),
        featured: false, // Will be determined by value
        grade: 'C' as const // Will be calculated based on value
      }
    })
  }, [folders, summariesMap])

  // Filter and sort folders
  const filteredFolders = React.useMemo(() => {
    let filtered = [...enhancedFolders]
    
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "value-high":
          return b.estimatedValue - a.estimatedValue
        case "value-low":
          return a.estimatedValue - b.estimatedValue
        case "recent":
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        case "name":
          return a.name.localeCompare(b.name)
        case "cards":
          return b.itemCount - a.itemCount
        case "trending":
          return Math.abs(b.valueChange) - Math.abs(a.valueChange)
        default:
          return 0
      }
    })
    
    return filtered
  }, [enhancedFolders, searchQuery, sortBy])

  async function handleCreateFolder(data: { 
    name: string
    description: string
    color: string
    icon: string 
  }) {
    setIsLoading(true)
    try {
      await createCollection({ 
        name: data.name,
        description: data.description,
        labels: [`color:${data.color}`, `icon:${data.icon}`]
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRenameFolder(id: string) {
    const folder = folders.find((f: any) => f._id === id)
    const name = window.prompt("Rename folder", folder?.name || "")
    if (!name) return
    
    setBusyId(id)
    try {
      await updateCollection({ collectionId: id as any, name })
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteFolder(id: string) {
    const folder = folders.find((f: any) => f._id === id)
    if (!window.confirm(`Delete "${folder?.name}"? This folder must be empty.`)) return
    
    setBusyId(id)
    try {
      await deleteCollection({ collectionId: id as any })
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicateFolder(id: string) {
    const folder = folders.find((f: any) => f._id === id)
    if (!folder) return
    
    setBusyId(id)
    try {
      await createCollection({ 
        name: `${folder.name} (Copy)`,
        description: folder.description,
        labels: folder.labels
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleOpenFolder = (id: string) => {
    router.push(`/dashboard/collections/${id}`)
  }

  // Calculate portfolio stats using real collection stats API
  const portfolioStats = React.useMemo(() => {
    const summaries = Array.from(summariesMap.values())
    const totalValue = summaries.reduce((sum, summary) => sum + (summary.estimatedValue ?? 0), 0)
    const totalCards = summaries.reduce((sum, summary) => sum + (summary.totalQuantity ?? 0), 0)
    const totalFolders = folders.length

    return {
      totalValue,
      totalChange: 0,
      changePercent: 0,
      totalCards,
      totalFolders,
      topGainer: null,
      topLoser: null,
      averageValue: totalFolders > 0 ? totalValue / totalFolders : 0
    }
  }, [summariesMap, folders])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const PremiumFolderCard = ({ folder, summary }: { folder: CollectionFolder, summary?: CollectionSummary }) => {
    const estimatedValue = summary?.estimatedValue ?? folder.estimatedValue ?? 0

    // Use the actual grade calculation based on card conditions
    const calculatedGrade = useQuery(api.collections.calculateCollectionGrade, { collectionId: folder._id as any })
    const grade: 'S' | 'A' | 'B' | 'C' = calculatedGrade || 'C'

    const gradeBadge = GRADE_BADGES[grade]
    const GradeIcon = gradeBadge.icon

    // Determine if collection should be featured
    const isFeatured = estimatedValue > 5000

    const averageValue = summary?.averageValue ?? folder.averageValue ?? (folder.itemCount ? estimatedValue / Math.max(folder.itemCount, 1) : 0)
    const updatedAt = summary?.updatedAt ?? (typeof folder.lastUpdated === "number" ? folder.lastUpdated : (folder.lastUpdated ? new Date(folder.lastUpdated).getTime() : Date.now()))
    const completionPercentageRaw = summary?.completionPercentage ?? folder.completionPercentage ?? 0
    const completionPercentage = Math.min(100, Math.max(0, completionPercentageRaw))
    const missingCards = summary?.missingCards ?? folder.missingCards ?? 0
    const setName = summary?.setName ?? null
    const setAbbreviation = summary?.setAbbreviation ?? null
    const summaryTargetCardCount = summary?.targetCardCount ?? 0
    const summaryOwnedTargetCards = summary?.ownedTargetCards ?? 0

    const baseTargetCardCount = React.useMemo(() => {
      if (summaryTargetCardCount > 0) return summaryTargetCardCount
      if (completionPercentage > 0 && completionPercentage < 100 && missingCards > 0) {
        const denom = 1 - completionPercentage / 100
        const total = denom > 0 ? Math.round(missingCards / denom) : 0
        return Number.isFinite(total) ? total : 0
      }
      if (completionPercentage === 100 && summaryOwnedTargetCards > 0) {
        return summaryOwnedTargetCards
      }
      return 0
    }, [summaryTargetCardCount, completionPercentage, missingCards, summaryOwnedTargetCards])

    const baseOwnedTargetCards = React.useMemo(() => {
      if (summaryOwnedTargetCards > 0) return summaryOwnedTargetCards
      if (baseTargetCardCount > 0) {
        return Math.max(0, baseTargetCardCount - missingCards)
      }
      return 0
    }, [summaryOwnedTargetCards, baseTargetCardCount, missingCards])

    const cachedProgress = progressCacheRef.current.get(String(folder._id)) ?? null
    const [asyncProgress, setAsyncProgress] = React.useState<CollectionSetProgress | null>(cachedProgress)
    const [progressLoading, setProgressLoading] = React.useState(false)
    const [progressError, setProgressError] = React.useState<string | null>(null)

    React.useEffect(() => {
      if (asyncProgress) return
      const cacheHit = progressCacheRef.current.get(String(folder._id))
      if (cacheHit) {
        setAsyncProgress(cacheHit)
        return
      }
      const summaryHasProgress = completionPercentage > 0 || summaryTargetCardCount > 0 || summaryOwnedTargetCards > 0
      if (summaryHasProgress) return

      let cancelled = false
      setProgressLoading(true)
      setProgressError(null)
      ;(async () => {
        // small jitter to avoid stampede on first render
        await new Promise((r) => setTimeout(r, 50 + Math.floor(Math.random() * 200)))
        await acquireProgressSlot()
        try {
          const result = await getCollectionSetProgress({ collectionId: folder._id as any })
          if (cancelled) return
          if (result) {
            const normalized: CollectionSetProgress = {
              completionPercentage: Number.isFinite(result.completionPercentage) ? result.completionPercentage : 0,
              missingCards: result.missingCards ?? 0,
              setName: result.setName ?? null,
              setAbbreviation: result.setAbbreviation ?? null,
              targetCardCount: result.targetCardCount ?? 0,
              ownedTargetCards: result.ownedTargetCards ?? 0,
            }
            progressCacheRef.current.set(String(folder._id), normalized)
            setAsyncProgress(normalized)
          }
        } catch (error) {
          if (cancelled) return
          console.error('Failed to load collection set progress', error)
          setProgressError('Could not load set progress')
        } finally {
          releaseProgressSlot()
          if (!cancelled) setProgressLoading(false)
        }
      })()

      return () => {
        cancelled = true
      }
    }, [asyncProgress, completionPercentage, summaryTargetCardCount, summaryOwnedTargetCards, folder._id, getCollectionSetProgress])

    React.useEffect(() => {
      if (asyncProgress) {
        progressCacheRef.current.set(String(folder._id), asyncProgress)
      }
    }, [asyncProgress, folder._id])

    const effectiveProgress = React.useMemo(() => {
      const fallback: CollectionSetProgress = {
        completionPercentage,
        missingCards,
        setName,
        setAbbreviation,
        targetCardCount: baseTargetCardCount,
        ownedTargetCards: baseOwnedTargetCards,
      }
      if (!asyncProgress) return fallback
      return {
        completionPercentage: Number.isFinite(asyncProgress.completionPercentage) ? asyncProgress.completionPercentage : fallback.completionPercentage,
        missingCards: asyncProgress.missingCards ?? fallback.missingCards,
        setName: asyncProgress.setName ?? fallback.setName,
        setAbbreviation: asyncProgress.setAbbreviation ?? fallback.setAbbreviation,
        targetCardCount: asyncProgress.targetCardCount > 0 ? asyncProgress.targetCardCount : fallback.targetCardCount,
        ownedTargetCards: asyncProgress.ownedTargetCards > 0 ? asyncProgress.ownedTargetCards : fallback.ownedTargetCards,
      }
    }, [asyncProgress, completionPercentage, missingCards, setName, setAbbreviation, baseTargetCardCount, baseOwnedTargetCards])

    const displayCompletion = Math.min(100, Math.max(0, effectiveProgress.completionPercentage))
    const displayMissing = effectiveProgress.missingCards
    const displayTargetCount = effectiveProgress.targetCardCount
    const displayOwnedCount = effectiveProgress.ownedTargetCards
    const displaySetName = effectiveProgress.setName ?? null
    const displaySetAbbr = effectiveProgress.setAbbreviation ?? null
    const hasTargetCounts = displayTargetCount > 0

    return (
      <div 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:scale-[1.02] hover:shadow-2xl",
          "bg-gradient-to-br from-background/95 via-background/80 to-muted/20",
          "backdrop-blur-xl border-muted-foreground/10 rounded-lg border",
          isFeatured && "ring-2 ring-primary/50"
        )}
        onClick={() => router.push(`/dashboard/collections/${folder._id}`)}
      >
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Flame className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        {/* Background Gradient Effect */}
        <div className={cn(
          "absolute inset-0 opacity-10 bg-gradient-to-br",
          folder.color
        )} />

        <div className="p-6 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl bg-gradient-to-br",
                folder.color,
                "text-white shadow-lg"
              )}>
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{folder.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {folder.itemCount} cards
                  </Badge>
                  {folder.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}>
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  Quick View
                </DropdownMenuItem>
                <SetTargetDialog
                  collectionId={folder._id}
                  collectionName={folder.name}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Target className="h-4 w-4 mr-2" />
                      Set Target
                    </DropdownMenuItem>
                  }
                />
                {SHOW_DEBUG_PRICING && (
                  <DropdownMenuItem onClick={async () => {
                    try {
                      console.log("Adding pricing for collection:", folder._id);
                      const result = await addPricingForUserCards({ collectionId: folder._id as any });
                      console.log("Pricing added:", result);
                      alert(`Added pricing for ${result.pricingEntriesCreated} products!`);
                    } catch (error) {
                      console.error("Failed to add pricing:", error);
                      alert("Failed to add pricing");
                    }
                  }}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Fix Pricing
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Value Display */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold">{formatCurrency(estimatedValue)}</p>
              </div>
            </div>

            {/* Collection Grade */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center gap-2">
                <GradeIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Collection Grade</span>
              </div>
              <Badge className={cn("bg-gradient-to-r", gradeBadge.color, "text-white border-0")}>
                {grade} - {gradeBadge.label}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Avg Value</span>
                <span className="font-medium">
                  {formatCurrency(averageValue)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {new Date(updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1 truncate">
                  {displaySetName ? (
                    <>
                      <span className="truncate">{displaySetName}</span>
                      {displaySetAbbr && (
                        <span className="uppercase opacity-70">({displaySetAbbr})</span>
                      )}
                      <span className="shrink-0">Completion</span>
                    </>
                  ) : (
                    "Collection Progress"
                  )}
                </span>
                <span>{Math.round(displayCompletion)}%</span>
              </div>
              <Progress value={displayCompletion} className="h-2" />
              {progressLoading && !hasTargetCounts ? (
                <p className="text-xs text-muted-foreground mt-1">Calculating set progress…</p>
              ) : hasTargetCounts ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {displayOwnedCount} / {displayTargetCount} cards
                  {displayMissing > 0 ? ` • ${displayMissing} missing` : ""}
                </p>
              ) : displayMissing > 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {displayMissing} cards missing
                </p>
              ) : progressError ? (
                <p className="text-xs text-muted-foreground mt-1">{progressError}</p>
              ) : null}
            </div>
          </div>

          {/* Hover Action */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-primary/60 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <SignedOut>
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="max-w-lg w-full bg-gradient-to-br from-background to-muted/20 border-muted-foreground/10">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                    <Package className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Premium Collection Tracker</h1>
                  <p className="text-muted-foreground">
                    The most advanced TCG collection management platform
                  </p>
                </div>
                <SignInButton mode="modal">
                  <Button size="lg" className="w-full bg-gradient-to-r from-primary to-primary/80">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </SignInButton>
              </CardContent>
            </Card>
          </div>
        </SignedOut>

        <SignedIn>
          <>
          {/* Premium Header */}
          <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-muted-foreground/10">
            <div className="px-4 lg:px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    My Collections
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your premium TCG portfolio
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </div>

              {/* Portfolio Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Total Value Card */}
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Portfolio Value</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatCurrency(portfolioStats.totalValue)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {portfolioStats.totalChange >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                          )}
                          <span className={cn(
                            "text-xs font-medium",
                            portfolioStats.totalChange >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {portfolioStats.changePercent >= 0 ? "+" : ""}{portfolioStats.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Cards */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cards</p>
                        <p className="text-2xl font-bold mt-1">
                          {portfolioStats.totalCards.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Across {portfolioStats.totalFolders} folders
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Average Value */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Folder</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatCurrency(portfolioStats.averageValue)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Per folder</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Most Valuable Collection */}
                {filteredFolders.length > 0 && (
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Most Valuable</p>
                          <p className="text-lg font-bold mt-1 line-clamp-1">
                            {filteredFolders.length > 0 ? filteredFolders[0].name : "None"}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <DollarSign className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-500">
                              Top Collection
                            </span>
                          </div>
                        </div>
                        <Trophy className="h-8 w-8 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Controls Bar */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 backdrop-blur"
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
                    <SelectTrigger className="w-[200px]">
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

          {/* Folders Grid */}
          <div className="px-4 lg:px-6 py-6">
            {filteredFolders.length === 0 ? (
              <Card className="border-dashed bg-gradient-to-br from-background to-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-4 mb-4">
                    <Package className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No folders found" : "Start your collection"}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    {searchQuery 
                      ? `No folders match "${searchQuery}"`
                      : "Create your first folder to start organizing your TCG collection"
                    }
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create First Folder
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                "grid gap-6",
                viewMode === "grid" && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                viewMode === "list" && "grid-cols-1",
                viewMode === "gallery" && "grid-cols-1 lg:grid-cols-2",
                viewMode === "compact" && "grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {filteredFolders.map((folder) => {
                  const summary = summariesMap.get(String(folder._id))
                  return (
                    <PremiumFolderCard key={folder._id} folder={folder} summary={summary} />
                  )
                })}
              </div>
            )}
          </div>
          </>
        </SignedIn>

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateFolder}
        />
      </div>
    </TooltipProvider>
  )
}
