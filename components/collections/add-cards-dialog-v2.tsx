"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  X, 
  Loader2, 
  Package,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
// Debounce hook inline to avoid import issues
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

interface AddCardsDialogV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCards: (cards: any[]) => Promise<void>
  getCategories: () => Promise<any>
  getAllGroups: (categoryId: number) => Promise<any>
  searchProducts: (params: any) => Promise<any>
  getProductDetails: (productIds: number[]) => Promise<any>
  getSkus: (productIds: number[]) => Promise<any>
}

const CONDITIONS = [
  { value: "NM", label: "Near Mint", color: "text-green-600" },
  { value: "LP", label: "Lightly Played", color: "text-blue-600" },
  { value: "MP", label: "Moderately Played", color: "text-yellow-600" },
  { value: "HP", label: "Heavily Played", color: "text-orange-600" },
  { value: "DMG", label: "Damaged", color: "text-red-600" },
]

export function AddCardsDialogV2({
  open,
  onOpenChange,
  onAddCards,
  getCategories,
  getAllGroups,
  searchProducts,
  getProductDetails,
  getSkus,
}: AddCardsDialogV2Props) {
  const [activeTab, setActiveTab] = useState("search")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Filter State
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  
  // Cart State
  const [cart, setCart] = useState<any[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [bulkCondition, setBulkCondition] = useState("NM")
  const [bulkQuantity, setBulkQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  
  // Load categories on mount
  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])
  
  // Load groups when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadGroups(Number(selectedCategory))
    } else {
      setGroups([])
      setSelectedGroup("")
    }
  }, [selectedCategory])
  
  // Auto-search when query or filters change
  useEffect(() => {
    if (debouncedSearch || selectedCategory) {
      performSearch()
    } else {
      setSearchResults([])
      setHasSearched(false)
    }
  }, [debouncedSearch, selectedCategory, selectedGroup])
  
  async function loadCategories() {
    try {
      const result = await getCategories()
      const list = (result?.Results ?? result?.results ?? result?.data ?? []) as any[]
      setCategories(list)
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }
  
  async function loadGroups(categoryId: number) {
    setLoadingGroups(true)
    try {
      const result = await getAllGroups(categoryId)
      const list = (result?.Results ?? result?.results ?? result?.data ?? []) as any[]
      setGroups(list)
    } catch (error) {
      console.error("Failed to load groups:", error)
      setGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }
  
  async function performSearch() {
    if (!debouncedSearch && !selectedCategory) return
    
    setSearching(true)
    setHasSearched(true)
    try {
      const params: any = {
        productName: debouncedSearch || "",
        limit: 100,
        offset: 0
      }
      if (selectedCategory) {
        params.categoryId = Number(selectedCategory)
      }
      if (selectedGroup) {
        params.groupId = Number(selectedGroup)
      }
      
      const result = await searchProducts(params)
      const items = (result?.results || result?.Results || result?.data || [])
      setSearchResults(items)
    } catch (error) {
      console.error("Search failed:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }
  
  function toggleCardSelection(card: any) {
    const cardId = String(card.productId || card.ProductId)
    const newSelection = new Set(selectedCards)
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId)
    } else {
      newSelection.add(cardId)
    }
    setSelectedCards(newSelection)
  }
  
  async function addSelectedToCart() {
    const selected = searchResults.filter(card => 
      selectedCards.has(String(card.productId || card.ProductId))
    )
    
    if (selected.length === 0) return
    
    setAddingToCart(true)
    try {
      // Get SKUs for selected cards
      const productIds = selected.map(c => Number(c.productId || c.ProductId))
      const skusRes = await getSkus(productIds)
      const skuMap = new Map<number, any[]>()
      
      const skuList = skusRes?.results || skusRes?.Results || skusRes?.data || []
      for (const sku of skuList) {
        const pid = sku.productId
        if (!skuMap.has(pid)) skuMap.set(pid, [])
        skuMap.get(pid)!.push(sku)
      }
      
      // Add to cart with default SKU
      const cartItems = selected.map(card => {
        const pid = Number(card.productId || card.ProductId)
        const skus = skuMap.get(pid) || []
        return {
          ...card,
          skuId: skus[0]?.skuId,
          condition: bulkCondition,
          quantity: bulkQuantity,
          id: `${pid}-${skus[0]?.skuId || 'default'}-${bulkCondition}`
        }
      })
      
      setCart([...cart, ...cartItems])
      setSelectedCards(new Set())
      setActiveTab("cart")
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setAddingToCart(false)
    }
  }
  
  function updateCartItem(id: string, updates: any) {
    setCart(cart.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }
  
  function removeFromCart(id: string) {
    setCart(cart.filter(item => item.id !== id))
  }
  
  async function handleConfirmAdd() {
    if (cart.length === 0) return
    
    await onAddCards(cart)
    setCart([])
    setSearchResults([])
    setSearchQuery("")
    setSelectedCards(new Set())
    onOpenChange(false)
  }
  
  const selectedCategoryName = categories.find(c => String(c.categoryId) === selectedCategory)?.name
  const selectedGroupName = groups.find(g => String(g.groupId) === selectedGroup)?.name || 
                          groups.find(g => String(g.groupId) === selectedGroup)?.groupName
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Add Cards to Collection</DialogTitle>
          <DialogDescription>
            Search for cards to add to your collection
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 px-6 shrink-0">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Search Cards
            </TabsTrigger>
            <TabsTrigger value="cart" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cart.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col mt-0">
            {/* Search Bar */}
            <div className="px-6 py-4 border-b space-y-4 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by card name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={cn(selectedCategory && "bg-primary/10")}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Filters */}
              {filtersOpen && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Trading Card Game</Label>
                    <Select value={selectedCategory || "_all"} onValueChange={(value) => setSelectedCategory(value === "_all" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All TCGs" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="_all">All TCGs</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.categoryId} value={String(cat.categoryId)}>
                            {cat.name || cat.displayName || `Category ${cat.categoryId}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Set / Expansion</Label>
                    <Select 
                      value={selectedGroup || "_all"} 
                      onValueChange={(value) => setSelectedGroup(value === "_all" ? "" : value)}
                      disabled={!selectedCategory || loadingGroups}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingGroups ? "Loading..." : "All Sets"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="_all">All Sets</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.groupId} value={String(group.groupId)}>
                            {group.name || group.groupName || `Set ${group.groupId}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Bulk Actions */}
              {selectedCards.size > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {selectedCards.size} cards selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Select value={bulkCondition} onValueChange={setBulkCondition}>
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              <span className={c.color}>{c.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setBulkQuantity(Math.max(1, bulkQuantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={bulkQuantity}
                          onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 1)}
                          className="h-8 w-16 text-center"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setBulkQuantity(bulkQuantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={addSelectedToCart}
                    disabled={addingToCart}
                  >
                    {addingToCart && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                    Add to Cart
                  </Button>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            <ScrollArea className="flex-1 px-6 py-4">
              {searching ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[3/4] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className={cn(
                  "grid gap-4",
                  viewMode === "grid" 
                    ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" 
                    : "grid-cols-1"
                )}>
                  {searchResults.map((card) => {
                    const productId = card.productId || card.ProductId
                    const name = card.name || card.ProductName || "Unknown"
                    const imageUrl = `https://product-images.tcgplayer.com/${productId}.jpg`
                    const isSelected = selectedCards.has(String(productId))
                    
                    if (viewMode === "list") {
                      return (
                        <div
                          key={productId}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleCardSelection(card)}
                        >
                          <div className="relative">
                            <img
                              src={imageUrl}
                              alt={name}
                              className="w-16 h-20 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-card.png"
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                                <Check className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-muted-foreground">
                              {card.groupName} • #{productId}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={productId}
                        className={cn(
                          "group relative rounded-lg border cursor-pointer transition-all overflow-hidden",
                          isSelected 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "hover:shadow-md"
                        )}
                        onClick={() => toggleCardSelection(card)}
                      >
                        <div className="aspect-[3/4] bg-gradient-to-br from-muted/50 to-muted/30">
                          <img
                            src={imageUrl}
                            alt={name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-card.png"
                            }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-2">
                                <Check className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-medium line-clamp-2">{name}</p>
                          <p className="text-xs text-muted-foreground">#{productId}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : hasSearched ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No cards found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Try adjusting your search or filters to find cards
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Search for cards</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Enter a card name or select a category to start searching
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="cart" className="flex-1 overflow-hidden flex flex-col mt-0">
            <ScrollArea className="flex-1 px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Cart is empty</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Search for cards and add them to your cart
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("search")}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Cards
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                      <img
                        src={`https://product-images.tcgplayer.com/${item.productId || item.ProductId}.jpg`}
                        alt={item.name || item.ProductName}
                        className="w-20 h-28 object-cover rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-medium">{item.name || item.ProductName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.groupName} • #{item.productId || item.ProductId}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select 
                            value={item.condition} 
                            onValueChange={(value) => updateCartItem(item.id, { condition: value })}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITIONS.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                  <span className={c.color}>{c.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(item.id, { 
                                quantity: Math.max(1, item.quantity - 1) 
                              })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.id, { 
                                quantity: parseInt(e.target.value) || 1 
                              })}
                              className="h-8 w-16 text-center"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(item.id, { 
                                quantity: item.quantity + 1 
                              })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <div className="text-sm text-muted-foreground">
            {activeTab === "cart" 
              ? `${cart.length} card${cart.length !== 1 ? 's' : ''} in cart`
              : `${searchResults.length} card${searchResults.length !== 1 ? 's' : ''} found`
            }
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === "cart" && cart.length > 0 && (
              <Button onClick={handleConfirmAdd}>
                Add to Collection ({cart.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
