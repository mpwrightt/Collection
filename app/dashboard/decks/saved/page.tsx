"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

function formatCurrency(value?: number) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(ts?: number) {
  if (!ts) return "—"
  try { return new Date(ts).toLocaleString() } catch { return "—" }
}

const TCG_LABELS: Record<string, string> = {
  mtg: "Magic: The Gathering",
  pokemon: "Pokemon TCG",
  ygo: "Yu-Gi-Oh!",
}

export default function SavedDecksPage() {
  const router = useRouter()
  const decks = useQuery(api.decks.listDecks, {}) as any[] | undefined
  const deleteDeck = useMutation(api.decks.deleteDeck)

  const [search, setSearch] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = decks ?? []
    if (!q) return list
    return list.filter((d) => String(d.name || "").toLowerCase().includes(q))
  }, [decks, search])

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>My Decks</CardTitle>
            <p className="text-sm text-muted-foreground">View, open, or remove your saved decks.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search decks by name"
              className="w-64"
            />
            <Button onClick={() => router.push("/dashboard/decks")}>
              <Plus className="h-4 w-4 mr-2" /> New Deck
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!decks ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading decks...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              {search ? "No decks match your search." : "You haven't saved any decks yet. Start by creating a new deck."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((deck) => {
                    const counts = deck.counts || { total: 0, main: 0, sideboard: 0, extra: 0 }
                    return (
                      <TableRow key={String(deck._id)}>
                        <TableCell className="font-medium">{deck.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{TCG_LABELS[String(deck.tcg)] || deck.tcg}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium mr-1">{counts.total}</span>
                            <span className="text-muted-foreground">(Main {counts.main}{counts.sideboard || counts.extra ? `, SB+EX ${counts.sideboard + counts.extra}` : ""})</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(deck.estimatedValue)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(deck.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/dashboard/decks/${String(deck._id)}`}>
                              <Button size="sm" variant="outline">Analyze</Button>
                            </Link>
                            <Link href={`/dashboard/decks?deck=${String(deck._id)}`}>
                              <Button size="sm" variant="outline">Open</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deletingId === String(deck._id)}
                              onClick={async () => {
                                const ok = window.confirm(`Delete deck "${deck.name}"? This cannot be undone.`)
                                if (!ok) return
                                setDeletingId(String(deck._id))
                                try {
                                  await deleteDeck({ deckId: deck._id as any } as any)
                                } catch (e) {
                                  console.error("Failed to delete deck", e)
                                } finally {
                                  setDeletingId(null)
                                }
                              }}
                            >
                              {deletingId === String(deck._id) ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Deleting...</span>
                              ) : (
                                <span className="flex items-center gap-2"><Trash2 className="h-3 w-3" /> Delete</span>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
