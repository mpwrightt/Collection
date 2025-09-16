"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Image,
  Filter,
  SortAsc,
  Download,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CollectionHeaderProps {
  viewMode: 'grid' | 'list' | 'gallery'
  onViewModeChange: (mode: 'grid' | 'list' | 'gallery') => void
  onSearch: (query: string) => void
  onCreateFolder: () => void
  onImport?: () => void
  onExport?: () => void
  sortBy: string
  onSortChange: (sort: string) => void
  totalFolders: number
  totalCards: number
  totalValue: number
}

export function CollectionHeader({
  viewMode,
  onViewModeChange,
  onSearch,
  onCreateFolder,
  onImport,
  onExport,
  sortBy,
  onSortChange,
  totalFolders,
  totalCards,
  totalValue,
}: CollectionHeaderProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Folders</p>
              <p className="text-2xl font-bold">{totalFolders}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold">{totalCards.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Image className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-green-500">$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            className="pl-10"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Middle Controls */}
        <div className="flex gap-2 flex-1 justify-center">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "rounded-none",
                viewMode === 'grid' && "pointer-events-none"
              )}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "rounded-none border-x",
                viewMode === 'list' && "pointer-events-none"
              )}
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'gallery' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "rounded-none",
                viewMode === 'gallery' && "pointer-events-none"
              )}
              onClick={() => onViewModeChange('gallery')}
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="cards">Cards (High-Low)</SelectItem>
              <SelectItem value="cards-asc">Cards (Low-High)</SelectItem>
              <SelectItem value="value">Value (High-Low)</SelectItem>
              <SelectItem value="value-asc">Value (Low-High)</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="created">Recently Created</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onImport && (
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button onClick={onCreateFolder}>
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>
    </div>
  )
}
