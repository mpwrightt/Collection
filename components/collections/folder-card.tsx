"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  MoreVertical, 
  Folder, 
  Edit3, 
  Trash2, 
  Copy, 
  FolderOpen,
  TrendingUp,
  Package,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FolderCardProps {
  folder: {
    _id: string
    name: string
    itemCount: number
    estimatedValue?: number
    lastUpdated?: string
    color?: string
    icon?: string
  }
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
  onDuplicate?: () => void
  isLoading?: boolean
}

export function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  onDuplicate,
  isLoading
}: FolderCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        "bg-gradient-to-br from-background to-muted/20",
        "border-muted-foreground/10"
      )}
      onClick={onOpen}
    >
      {/* Colored accent bar */}
      <div 
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60"
        style={{ 
          background: folder.color ? 
            `linear-gradient(to right, ${folder.color}, ${folder.color}99)` : 
            undefined 
        }}
      />
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
      </div>

      <div className="relative p-6">
        {/* Header with icon and actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              {folder.icon === 'folder-open' ? (
                <FolderOpen className="h-6 w-6" />
              ) : (
                <Folder className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">
                {folder.name}
              </h3>
              {folder.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(folder.lastUpdated)}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                size="icon" 
                variant="ghost" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cards</span>
            </div>
            <span className="font-semibold tabular-nums">
              {folder.itemCount.toLocaleString()}
            </span>
          </div>
          
          {folder.estimatedValue !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Value</span>
              </div>
              <span className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                {formatCurrency(folder.estimatedValue)}
              </span>
            </div>
          )}
          
          {/* Value change indicator (mock for now) */}
          {folder.estimatedValue && folder.estimatedValue > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Today's Change
                </span>
              </div>
              <span className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                +2.3%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
