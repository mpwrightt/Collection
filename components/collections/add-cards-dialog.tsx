"use client"

import { useState, useEffect } from "react"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Check, ChevronsUpDown, Package, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddCardsDialogProps {
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

export function AddCardsDialog({
  open,
  onOpenChange,
  onAddCards,
  getCategories,
  getAllGroups,
  searchProducts,
  getProductDetails,
  getSkus,
}: AddCardsDialogProps) {
  // TCG/Category State
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [categorySearch, setCategorySearch] = useState("")
  const [categoryOpen, setCategoryOpen] = useState(false)
  
  // Set/Group State
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [groupSearch, setGroupSearch] = useState("")
  const [groupOpen, setGroupOpen] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  
  // Card Details State
  const [cardDetails, setCardDetails] = useState<any>(null)
  const [cardSkus, setCardSkus] = useState<any[]>([])
  const [selectedSku, setSelectedSku] = useState<number | undefined>()
  const [selectedCondition, setSelectedCondition] = useState("NM")
  const [quantity, setQuantity] = useState(1)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Cart State
  const [cart, setCart] = useState<any[]>([])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Load groups when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadGroups(Number(selectedCategory))
    } else {
      setGroups([])
      setSelectedGroup("")
    }
  }, [selectedCategory])

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      const params: any = {
        productName: searchQuery,
        limit: 50,
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

  async function handleSelectCard(card: any) {
    setSelectedCard(card)
    setLoadingDetails(true)
    
    const productId = Number(card.productId || card.ProductId)
    
    try {
      const [details, skus] = await Promise.all([
        getProductDetails([productId]),
        getSkus([productId])
      ])
      
      setCardDetails(details)
      const skuList = (skus?.results || skus?.Results || skus?.data || [])
      setCardSkus(skuList)
      setSelectedSku(skuList[0]?.skuId)
    } catch (error) {
      console.error("Failed to load card details:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  function handleAddToCart() {
    if (!selectedCard) return
    
    const cartItem = {
      ...selectedCard,
      skuId: selectedSku,
      condition: selectedCondition,
      quantity,
      id: `${selectedCard.productId}-${selectedSku}-${selectedCondition}`
    }
    
    setCart([...cart, cartItem])
    
    // Reset selection
    setSelectedCard(null)
    setCardDetails(null)
    setCardSkus([])
    setSelectedSku(undefined)
    setQuantity(1)
  }

  function removeFromCart(id: string) {
    setCart(cart.filter(item => item.id !== id))
  }

  async function handleConfirmAdd() {
    if (cart.length === 0) return
    
    await onAddCards(cart)
    
    // Reset everything
    setCart([])
    setSearchResults([])
    setSearchQuery("")
    onOpenChange(false)
  }

  // Get selected category/group names for display
  const selectedCategoryName = categories.find(c => String(c.categoryId) === selectedCategory)?.name
  const selectedGroupName = groups.find(g => String(g.groupId) === selectedGroup)?.name || groups.find(g => String(g.groupId) === selectedGroup)?.groupName

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Cards to Collection</DialogTitle>
          <DialogDescription>
            Search for cards by TCG, set, and name. Select condition and quantity for each card.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TCG Category Selector */}
            <div className="space-y-2">
              <Label>Trading Card Game</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between"
                  >
                    {selectedCategoryName || "Select TCG..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search TCG..." 
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandEmpty>No TCG found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-72">
                        {categories
                          .filter(c => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((category) => (
                            <CommandItem
                              key={category.categoryId}
                              value={String(category.categoryId)}
                              onSelect={(value) => {
                                setSelectedCategory(value === selectedCategory ? "" : value)
                                setCategoryOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCategory === String(category.categoryId) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category.name}
                            </CommandItem>
                          ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Set/Group Selector */}
            <div className="space-y-2">
              <Label>Set / Expansion</Label>
              <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={groupOpen}
                    className="w-full justify-between"
                    disabled={!selectedCategory || loadingGroups}
                  >
                    {loadingGroups ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading sets...
                      </>
                    ) : (
                      <>
                        {selectedGroupName || "Select set..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search sets..." 
                      value={groupSearch}
                      onValueChange={setGroupSearch}
                    />
                    <CommandEmpty>No sets found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-72">
                        {groups
                          .filter(g => {
                            const name = g.name || g.groupName || ""
                            return !groupSearch || name.toLowerCase().includes(groupSearch.toLowerCase())
                          })
                          .map((group) => (
                            <CommandItem
                              key={group.groupId}
                              value={String(group.groupId)}
                              onSelect={(value) => {
                                setSelectedGroup(value === selectedGroup ? "" : value)
                                setGroupOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedGroup === String(group.groupId) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {group.name || group.groupName}
                            </CommandItem>
                          ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="space-y-2">
              <Label>Card Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Charizard, Black Lotus"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Search Results ({searchResults.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {searchResults.map((card) => {
                  const productId = card.productId || card.ProductId
                  const name = card.name || card.ProductName || "Unknown"
                  const imageUrl = `https://product-images.tcgplayer.com/${productId}.jpg`
                  
                  return (
                    <button
                      key={productId}
                      onClick={() => handleSelectCard(card)}
                      className={cn(
                        "rounded-lg border p-2 text-left hover:bg-muted/40 transition-all",
                        selectedCard?.productId === productId && "border-primary bg-primary/10"
                      )}
                    >
                      <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted mb-2">
                        <img
                          src={imageUrl}
                          alt={name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium line-clamp-2">{name}</p>
                        <p className="text-xs text-muted-foreground">#{productId}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected Card Details */}
          {selectedCard && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex gap-4">
                <div className="w-32">
                  <img
                    src={`https://product-images.tcgplayer.com/${selectedCard.productId || selectedCard.ProductId}.jpg`}
                    alt={selectedCard.name || selectedCard.ProductName}
                    className="w-full rounded-md"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold">{selectedCard.name || selectedCard.ProductName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCard.groupName} • #{selectedCard.productId || selectedCard.ProductId}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Condition Selector */}
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(condition => (
                            <SelectItem key={condition.value} value={condition.value}>
                              <span className={condition.color}>{condition.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SKU Selector */}
                    {cardSkus.length > 0 && (
                      <div className="space-y-2">
                        <Label>Printing/Edition</Label>
                        <Select 
                          value={selectedSku ? String(selectedSku) : ""} 
                          onValueChange={(v) => setSelectedSku(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cardSkus.map((sku: any) => (
                              <SelectItem key={sku.skuId} value={String(sku.skuId)}>
                                {sku.printing || sku.finish || `SKU ${sku.skuId}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      />
                    </div>

                    {/* Add Button */}
                    <div className="space-y-2">
                      <Label className="opacity-0">Action</Label>
                      <Button onClick={handleAddToCart} className="w-full">
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Cart ({cart.length} items)</h3>
              <div className="border rounded-lg divide-y">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <img
                      src={`https://product-images.tcgplayer.com/${item.productId || item.ProductId}.jpg`}
                      alt={item.name || item.ProductName}
                      className="h-12 w-9 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name || item.ProductName}</p>
                      <p className="text-xs text-muted-foreground">
                        {CONDITIONS.find(c => c.value === item.condition)?.label} • Qty: {item.quantity}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {cart.length} card{cart.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAdd} disabled={cart.length === 0}>
              Add to Collection ({cart.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
