"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Target, Settings, Loader2 } from "lucide-react"

interface SetTargetDialogProps {
  collectionId: string
  collectionName: string
  trigger?: React.ReactNode
}

export function SetTargetDialog({ collectionId, collectionName, trigger }: SetTargetDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedSetId, setSelectedSetId] = React.useState<string>("")
  const [targetType, setTargetType] = React.useState<string>("complete")
  const [notes, setNotes] = React.useState<string>("")
  const [priority, setPriority] = React.useState<number>(2)
  const [isLoading, setIsLoading] = React.useState(false)

  // Queries
  const sets = useQuery(api.sets.listSets) ?? []
  const existingTarget = useQuery(api.sets.getUserCollectionTargets, {
    collectionId: collectionId as any
  })

  // Mutations
  const createTarget = useMutation(api.sets.createCollectionTarget)

  const pokemonSets = sets.filter(set => set.categoryId === 3) // Pokemon category
  const mtgSets = sets.filter(set => set.categoryId === 1) // MTG category

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("Submit clicked - selectedSetId:", selectedSetId, "targetType:", targetType)

    if (!selectedSetId) {
      console.log("No set selected - aborting")
      return
    }

    setIsLoading(true)
    try {
      console.log("Creating target with:", {
        collectionId: collectionId,
        setId: selectedSetId,
        targetType,
        priority,
        notes: notes || undefined,
      })

      const result = await createTarget({
        collectionId: collectionId as any,
        setId: selectedSetId,
        targetType,
        priority,
        notes: notes || undefined,
      })

      console.log("Target created successfully:", result)

      setOpen(false)
      // Reset form
      setSelectedSetId("")
      setTargetType("complete")
      setNotes("")
      setPriority(2)
    } catch (error) {
      console.error("Failed to create collection target:", error)
      // Don't close the dialog on error so user can retry
    } finally {
      setIsLoading(false)
    }
  }

  const currentTarget = existingTarget?.[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            {currentTarget ? "Update Target" : "Set Target"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Set Completion Target
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Collection</Label>
            <p className="text-sm text-muted-foreground">{collectionName}</p>
          </div>

          {currentTarget && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Target</span>
                <Badge variant="secondary">{currentTarget.targetType}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Set ID: {currentTarget.setId}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setId">Target Set</Label>
              <Select value={selectedSetId} onValueChange={(value) => {
                console.log("Set selected:", value);
                setSelectedSetId(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a set to complete..." />
                </SelectTrigger>
                <SelectContent>
                  {pokemonSets.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Pokemon Sets
                      </div>
                      {pokemonSets.map((set) => (
                        <SelectItem key={set.setId} value={set.setId}>
                          <div className="flex items-center justify-between w-full">
                            <span>{set.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {set.totalCards} cards
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {mtgSets.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Magic: The Gathering Sets
                      </div>
                      {mtgSets.map((set) => (
                        <SelectItem key={set.setId} value={set.setId}>
                          <div className="flex items-center justify-between w-full">
                            <span>{set.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {set.totalCards} cards
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {sets.length === 0 && (
                    <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                      No sets available. Import set data first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetType">Completion Type</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Complete Set</SelectItem>
                  <SelectItem value="holos_only">Holos & Rares Only</SelectItem>
                  <SelectItem value="rares_only">Rares Only</SelectItem>
                  <SelectItem value="custom">Custom Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority.toString()} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High Priority</SelectItem>
                  <SelectItem value="2">Medium Priority</SelectItem>
                  <SelectItem value="3">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this completion goal..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedSetId || isLoading}
                className="flex-1"
                onClick={() => console.log("Button clicked - selectedSetId:", selectedSetId, "isLoading:", isLoading)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {currentTarget ? "Update Target" : "Set Target"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}