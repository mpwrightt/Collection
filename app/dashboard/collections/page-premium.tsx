"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
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

interface CollectionFolder {
  _id: string
  name: string
  itemCount: number
  estimatedValue: number
  valueChange: number
  lastUpdated: string
  icon: string
  color: string
  tags: string[]
  featured?: boolean
  grade?: 'S' | 'A' | 'B' | 'C'
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

export default function PremiumCollectionsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"grid" | "list" | "gallery" | "compact">("grid")
  const [sortBy, setSortBy] = React.useState("value-high")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  // Convex queries
  const folders = useQuery(api.collections.listCollectionsWithCounts, { parentId: undefined }) || []
  const collectionStats = useQuery(api.collections.getCollectionStats) || { 
    totalCards: 0, 
    totalValue: 0, 
    totalFolders: folders.length 
  }

  // Process folders with mock enhanced data
  const enhancedFolders = React.useMemo(() => {
    return folders.map((folder: any) => ({
      ...folder,
      estimatedValue: Math.random() * 10000,
      valueChange: (Math.random() - 0.5) * 20,
      lastUpdated: folder.updatedAt || folder.createdAt,
      icon: "folder",
      color: "from-blue-500 to-blue-600",
      tags: ["pokemon", "vintage"],
      featured: Math.random() > 0.7,
      grade: ['S', 'A', 'B', 'C'][Math.floor(Math.random() * 4)] as any
    }))
  }, [folders])

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

  // Calculate portfolio stats
  const portfolioStats = React.useMemo(() => {
    const totalValue = filteredFolders.reduce((sum, f) => sum + f.estimatedValue, 0)
    const totalChange = filteredFolders.reduce((sum, f) => sum + (f.estimatedValue * f.valueChange / 100), 0)
    const totalCards = filteredFolders.reduce((sum, f) => sum + f.itemCount, 0)
    const topGainer = [...filteredFolders].sort((a, b) => b.valueChange - a.valueChange)[0]
    const topLoser = [...filteredFolders].sort((a, b) => a.valueChange - b.valueChange)[0]

    return {
      totalValue,
      totalChange,
      changePercent: totalValue > 0 ? (totalChange / totalValue) * 100 : 0,
      totalCards,
      totalFolders: filteredFolders.length,
      topGainer,
      topLoser,
      averageValue: filteredFolders.length > 0 ? totalValue / filteredFolders.length : 0
    }
  }, [filteredFolders])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const PremiumFolderCard = ({ folder }: { folder: CollectionFolder }) => {
    const grade = GRADE_BADGES[folder.grade || 'C']
    const GradeIcon = grade.icon

    return (
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:scale-[1.02] hover:shadow-2xl",
          "bg-gradient-to-br from-background/95 via-background/80 to-muted/20",
          "backdrop-blur-xl border-muted-foreground/10",
          folder.featured && "ring-2 ring-primary/50"
        )}
        onClick={() => router.push(`/dashboard/collections/${folder._id}`)}
      >
        {/* Featured Badge */}
        {folder.featured && (
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

        <CardContent className="p-6 relative">
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
                  {folder.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  Quick View
                </DropdownMenuItem>
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
                <p className="text-3xl font-bold">{formatCurrency(folder.estimatedValue)}</p>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  folder.valueChange >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {folder.valueChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{folder.valueChange >= 0 ? "+" : ""}{folder.valueChange.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Collection Grade */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center gap-2">
                <GradeIcon className={cn("h-5 w-5 bg-gradient-to-br", grade.color, "text-transparent bg-clip-text")} />
                <span className="text-sm font-medium">Collection Grade</span>
              </div>
              <Badge className={cn("bg-gradient-to-r", grade.color, "text-white border-0")}>
                {folder.grade} - {grade.label}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Avg Value</span>
                <span className="font-medium">
                  {formatCurrency(folder.estimatedValue / Math.max(folder.itemCount, 1))}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {new Date(folder.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Collection Completeness</span>
                <span>78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
          </div>

          {/* Hover Action */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-primary/60 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
        </CardContent>
      </Card>
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

                {/* Top Gainer */}
                {portfolioStats.topGainer && (
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Top Gainer</p>
                          <p className="text-lg font-bold mt-1 line-clamp-1">
                            {portfolioStats.topGainer.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-500">
                              +{portfolioStats.topGainer.valueChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Trophy className="h-8 w-8 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Loser */}
                {portfolioStats.topLoser && portfolioStats.topLoser.valueChange < 0 && (
                  <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Top Loser</p>
                          <p className="text-lg font-bold mt-1 line-clamp-1">
                            {portfolioStats.topLoser.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            <span className="text-xs font-medium text-red-500">
                              {portfolioStats.topLoser.valueChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Activity className="h-8 w-8 text-red-500" />
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
                {filteredFolders.map((folder) => (
                  <PremiumFolderCard key={folder._id} folder={folder} />
                ))}
              </div>
            )}
          </div>
        </SignedIn>
      </div>
    </TooltipProvider>
  )
}
