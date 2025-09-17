"use client"

import { IconCirclePlusFilled, IconCards, IconFolderPlus, IconPlus, type Icon } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { useOptimistic, useTransition, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname)
  const [isPending, startTransition] = useTransition()

  // Quick create states
  const [openNewCollection, setOpenNewCollection] = useState(false)
  const [collectionName, setCollectionName] = useState("")
  const [creating, setCreating] = useState(false)
  const [openQuickAdd, setOpenQuickAdd] = useState(false)
  const [quickProductId, setQuickProductId] = useState("")
  const [quickQty, setQuickQty] = useState("1")
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickCategoryId, setQuickCategoryId] = useState<string>("1") // 1=MTG, 2=YGO, 3=Pokemon, 0=Other

  const saveDeck = useMutation(api.decks.saveDeck)
  const createCollection = useMutation(api.collections.createCollection)
  const addItem = useMutation(api.collections.addItem)

  const handleNavigation = (url: string) => {
    startTransition(() => {
      setOptimisticPath(url)
      router.push(url)
    })
  }

  const handleCreateDeck = async () => {
    try {
      const id = await saveDeck({
        name: "New Deck",
        tcg: "mtg",
        cards: [],
      } as any)
      router.push(`/dashboard/decks?deck=${String(id)}`)
    } catch (e) {
      console.error("Failed to create deck", e)
      router.push("/dashboard/decks")
    }
  }

  const handleCreateCollection = async () => {
    const name = collectionName.trim()
    if (!name) return
    setCreating(true)
    try {
      await createCollection({ name } as any)
      setOpenNewCollection(false)
      setCollectionName("")
      router.push("/dashboard/collections")
    } catch (e) {
      console.error("Failed to create collection", e)
    } finally {
      setCreating(false)
    }
  }

  const handleQuickAdd = async () => {
    const pid = Number(quickProductId)
    const qty = Math.max(1, Math.floor(Number(quickQty)))
    if (!Number.isFinite(pid)) return
    setQuickSaving(true)
    try {
      await addItem({ productId: pid, quantity: qty, categoryId: Number(quickCategoryId) } as any)
      setOpenQuickAdd(false)
      setQuickProductId("")
      setQuickQty("1")
      setQuickCategoryId("1")
      router.push("/dashboard/collections")
    } catch (e) {
      console.error("Failed to add item", e)
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2" data-pending={isPending ? "" : undefined}>
        {/* Quick create button */}
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Quick Create"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                >
                  <IconCirclePlusFilled />
                  <span>Quick Create</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={handleCreateDeck}>
                  <IconCards className="mr-2 h-4 w-4" /> New Deck
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenNewCollection(true)}>
                  <IconFolderPlus className="mr-2 h-4 w-4" /> New Collection Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenQuickAdd(true)}>
                  <IconPlus className="mr-2 h-4 w-4" /> Quick Add Card (by Product ID)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Main navigation items */}
        <SidebarMenu>
          {items.map((item) => {
            // Use optimistic path for instant feedback
            const isActive = optimisticPath === item.url || (optimisticPath === '/dashboard' && item.url === '/dashboard')
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  tooltip={item.title}
                  isActive={isActive}
                  onClick={() => handleNavigation(item.url)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
      {/* New Collection dialog */}
      <Dialog open={openNewCollection} onOpenChange={setOpenNewCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="collection-name">Name</Label>
            <Input id="collection-name" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} placeholder="e.g., Pokemon - Base Set" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewCollection(false)}>Cancel</Button>
            <Button onClick={handleCreateCollection} disabled={creating || !collectionName.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Quick Add Card dialog */}
      <Dialog open={openQuickAdd} onOpenChange={setOpenQuickAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="quick-product-id">Product ID</Label>
              <Input id="quick-product-id" inputMode="numeric" value={quickProductId} onChange={(e) => setQuickProductId(e.target.value)} placeholder="e.g., 12345" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quick-qty">Quantity</Label>
              <Input id="quick-qty" inputMode="numeric" value={quickQty} onChange={(e) => setQuickQty(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1">
              <Label>TCG Category</Label>
              <Select value={quickCategoryId} onValueChange={setQuickCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select TCG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Magic: The Gathering</SelectItem>
                  <SelectItem value="3">Pokemon TCG</SelectItem>
                  <SelectItem value="2">Yu-Gi-Oh!</SelectItem>
                  <SelectItem value="0">Other / Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenQuickAdd(false)}>Cancel</Button>
            <Button onClick={handleQuickAdd} disabled={quickSaving || !quickProductId.trim()}>
              {quickSaving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
}
