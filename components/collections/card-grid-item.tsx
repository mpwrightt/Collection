"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CardGridItemProps {
  card: {
    _id: string
    productId: number
    skuId?: number
    name: string
    setName?: string
    categoryName?: string
    quantity: number
    condition?: string
    language?: string
    imageUrl: string
    marketPrice?: number
    acquiredPrice?: number
    priceChange?: number
    notes?: string
  }
  viewMode: 'grid' | 'list' | 'compact'
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate?: () => void
  onQuantityChange?: (newQuantity: number) => void
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
}

const CONDITION_BADGES: Record<string, { label: string; className: string }> = {
  'NM': { label: 'Near Mint', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'LP': { label: 'Lightly Played', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'MP': { label: 'Moderately Played', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  'HP': { label: 'Heavily Played', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  'DMG': { label: 'Damaged', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
}

export function CardGridItem({
  card,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onQuantityChange,
  isSelected,
  onSelect
}: CardGridItemProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const conditionBadge = card.condition ? CONDITION_BADGES[card.condition] : null

  if (viewMode === 'list') {
    return (
      <div className={cn(
        "group relative flex items-center gap-4 p-4 rounded-lg border transition-all",
        "hover:shadow-md hover:border-primary/20",
        isSelected && "border-primary bg-primary/5"
      )}>
        {/* Selection Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4"
          />
        )}
        
        {/* Card Image */}
        <div className="h-16 w-12 rounded-md overflow-hidden bg-muted">
          {!imageError ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
              No Image
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold line-clamp-1">{card.name}</h3>
              <p className="text-sm text-muted-foreground">
                {card.setName} • #{card.productId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {conditionBadge && (
                <Badge variant="outline" className={conditionBadge.className}>
                  {conditionBadge.label}
                </Badge>
              )}
              <Badge variant="outline">Qty: {card.quantity}</Badge>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="text-right">
          {card.marketPrice && (
            <>
              <div className="font-semibold">{formatCurrency(card.marketPrice * card.quantity)}</div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(card.marketPrice)} each
              </div>
              {card.priceChange !== undefined && (
                <div className={cn(
                  "text-xs flex items-center gap-1",
                  card.priceChange > 0 ? "text-green-600" : card.priceChange < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {card.priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : 
                   card.priceChange < 0 ? <TrendingDown className="h-3 w-3" /> : 
                   <Minus className="h-3 w-3" />}
                  {Math.abs(card.priceChange)}%
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Grid View (default)
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        isSelected && "ring-2 ring-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect(e.target.checked)
            }}
            className="h-4 w-4 rounded"
          />
        </div>
      )}

      {/* Quick Actions (visible on hover) */}
      <div className={cn(
        "absolute top-2 right-2 z-10 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="secondary" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
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
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Image */}
      <div className="aspect-[3/4] relative bg-muted">
        {!imageError ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        
        {/* Quantity Badge */}
        {card.quantity > 1 && (
          <Badge 
            className="absolute bottom-2 left-2 bg-background/90 backdrop-blur"
            variant="secondary"
          >
            x{card.quantity}
          </Badge>
        )}

        {/* Condition Badge */}
        {conditionBadge && (
          <Badge 
            className={cn(
              "absolute bottom-2 right-2 backdrop-blur",
              conditionBadge.className
            )}
            variant="outline"
          >
            {card.condition}
          </Badge>
        )}
      </div>

      {/* Card Details */}
      <div className="p-4">
        <div className="space-y-2">
          {/* Name and Set */}
          <div>
            <h3 className="font-semibold line-clamp-1">{card.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {card.setName} • #{card.productId}
            </p>
          </div>

          {/* Price Information */}
          {card.marketPrice && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Market</span>
                <span className="font-semibold">{formatCurrency(card.marketPrice)}</span>
              </div>
              {card.quantity > 1 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(card.marketPrice * card.quantity)}
                  </span>
                </div>
              )}
              {card.priceChange !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  card.priceChange > 0 ? "text-green-600" : 
                  card.priceChange < 0 ? "text-red-600" : 
                  "text-muted-foreground"
                )}>
                  {card.priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : 
                   card.priceChange < 0 ? <TrendingDown className="h-3 w-3" /> : 
                   <Minus className="h-3 w-3" />}
                  <span>{card.priceChange > 0 ? '+' : ''}{card.priceChange}% today</span>
                </div>
              )}
            </div>
          )}

          {/* Quantity Controls (if enabled) */}
          {onQuantityChange && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onQuantityChange(Math.max(0, card.quantity - 1))
                  }}
                  disabled={card.quantity <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{card.quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onQuantityChange(card.quantity + 1)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
