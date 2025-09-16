"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Folder, FolderOpen, Package, Star, Shield, Zap } from "lucide-react"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    description: string
    color: string
    icon: string
  }) => void
}

const FOLDER_COLORS = [
  { label: "Blue", value: "#3B82F6", className: "bg-blue-500" },
  { label: "Purple", value: "#8B5CF6", className: "bg-purple-500" },
  { label: "Green", value: "#10B981", className: "bg-green-500" },
  { label: "Red", value: "#EF4444", className: "bg-red-500" },
  { label: "Orange", value: "#F97316", className: "bg-orange-500" },
  { label: "Pink", value: "#EC4899", className: "bg-pink-500" },
  { label: "Yellow", value: "#EAB308", className: "bg-yellow-500" },
  { label: "Teal", value: "#14B8A6", className: "bg-teal-500" },
]

const FOLDER_ICONS = [
  { label: "Folder", value: "folder", icon: Folder },
  { label: "Folder Open", value: "folder-open", icon: FolderOpen },
  { label: "Package", value: "package", icon: Package },
  { label: "Star", value: "star", icon: Star },
  { label: "Shield", value: "shield", icon: Shield },
  { label: "Lightning", value: "zap", icon: Zap },
]

export function CreateFolderDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(FOLDER_COLORS[0].value)
  const [icon, setIcon] = useState(FOLDER_ICONS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      })
      // Reset form
      setName("")
      setDescription("")
      setColor(FOLDER_COLORS[0].value)
      setIcon(FOLDER_ICONS[0].value)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your card collection
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pokemon Collection, Vintage Cards"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this folder..."
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="color">Folder Color</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-8 w-8 rounded-md ${c.className} ${
                      color === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="icon">Folder Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDER_ICONS.map((i) => {
                    const Icon = i.icon
                    return (
                      <SelectItem key={i.value} value={i.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{i.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
