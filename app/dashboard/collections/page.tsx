"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

export default function CollectionsPage() {
  const folders = useQuery(api.collections.listCollectionsWithCounts, { parentId: undefined }) || []
  const createCollection = useMutation(api.collections.createCollection)
  const updateCollection = useMutation(api.collections.updateCollection)
  const deleteCollection = useMutation(api.collections.deleteCollection)
  const router = useRouter()

  const [newName, setNewName] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createCollection({ name: newName.trim() })
    setNewName("")
  }

  async function onRename(id: string) {
    const name = window.prompt("Rename folder", "")
    if (!name) return
    setBusyId(id)
    try { await updateCollection({ collectionId: id as any, name }) } finally { setBusyId(null) }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this folder? It must be empty.")) return
    setBusyId(id)
    try { await deleteCollection({ collectionId: id as any }) } finally { setBusyId(null) }
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <SignedOut>
        <Card>
          <CardHeader>
            <CardTitle>Sign in to manage your folders</CardTitle>
          </CardHeader>
          <CardContent>
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </SignedOut>

      <SignedIn>
        <Card>
          <CardHeader>
            <CardTitle>Your Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="flex gap-2 mb-4">
              <div className="flex-1">
                <Label htmlFor="new-folder" className="sr-only">Folder name</Label>
                <Input id="new-folder" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New folder name" />
              </div>
              <Button type="submit">Create</Button>
            </form>

            {folders.length === 0 ? (
              <div className="text-sm text-muted-foreground">No folders yet. Create one above.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {folders.map((f: any) => (
                  <Card
                    key={f._id}
                    role="button"
                    onClick={() => router.push(`/dashboard/collections/${f._id}`)}
                    className="group cursor-pointer hover:shadow-md transition"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate group-hover:underline">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{f.itemCount} cards</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => onRename(f._id)} disabled={busyId === String(f._id)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(f._id)} disabled={busyId === String(f._id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/collections/${f._id}`}>Open</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SignedIn>
    </div>
  )
}
