"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Clock, Sparkles, Search, BarChart3 } from "lucide-react"
import Image from "next/image"

type Slide = {
  id: string
  title: string
  timeRange: string
  duration: number
  content: React.ReactNode
  screenshot?: string
  highlights?: string[]
}

const slides: Slide[] = [
  {
    id: "intro",
    title: "Demo Overview",
    timeRange: "0:00",
    duration: 0,
    content: (
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Collection Tracker Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A guided tour through Collection Tracker's core features: collection management,
            deck building with AI, and format validation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <Search className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Collection Management</h3>
              <p className="text-sm text-blue-700 dark:text-blue-200">Track holdings and values</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">AI Deck Building</h3>
              <p className="text-sm text-purple-700 dark:text-purple-200">Smart recommendations</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">Format Validation</h3>
              <p className="text-sm text-green-700 dark:text-green-200">Legality checks</p>
            </CardContent>
          </Card>
        </div>

        {/* Previous Work Section */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Previous Work & Development Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Starting Point</h4>
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  <div>• Used Next.js starter template</div>
                  <div>• Pre-built landing page included</div>
                  <div>• Convex/Clerk authentication setup</div>
                  <div>• <strong>No other work done outside hackathon</strong></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">AI Development Tools</h4>
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  <div>• GPT-5 Codex</div>
                  <div>• Claude Code</div>
                  <div>• Windsurf</div>
                  <div>• <strong>Entire app created using AI tools</strong></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/30 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            <Clock className="h-4 w-4 inline mr-2" />
            Total demo time: 6-8 minutes
          </p>
        </div>
      </div>
    )
  },
  {
    id: "setup",
    title: "Setup & Context",
    timeRange: "0:00 – 0:45",
    duration: 45,
    screenshot: "/images/landing-page.png",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Welcome to Collection Tracker</h2>
          <p className="text-lg text-muted-foreground">
            Collection Tracker helps players manage collections, build legal decks with AI, and understand cost.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What We'll Cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Collection</Badge>
                <span className="text-sm">Holdings and values</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Catalog</Badge>
                <span className="text-sm">Card search and prices</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">AI Builder</Badge>
                <span className="text-sm">Smart deck construction</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">✓ Real-time TCGplayer integration</div>
              <div className="text-sm">✓ Format-aware deck validation</div>
              <div className="text-sm">✓ AI-powered recommendations</div>
              <div className="text-sm">✓ Multi-game support (MTG, Pokémon, Yu-Gi-Oh!)</div>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
    highlights: [
      "Navigate to /dashboard/decks",
      "Highlight collection management capabilities",
      "Mention format validation and AI features"
    ]
  },
  {
    id: "features",
    title: "Core Features Tour",
    timeRange: "0:45 – 2:00",
    duration: 75,
    screenshot: "/images/deck-builder.png",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Core Features Overview</h2>
          <p className="text-lg text-muted-foreground">
            Explore the main interface showing tabs for Collection, Catalog, and AI tools.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Collection Tab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Shows your holdings with total quantities and current market values
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Holdings Display</span>
                  <Badge variant="outline">Live Prices</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantity Tracking</span>
                  <Badge variant="outline">Multi-Game</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Deck Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Organized sections: Main Deck, Sideboard, and Extra Deck support
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Main Deck</span>
                  <Badge variant="secondary">60 cards</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sideboard</span>
                  <Badge variant="secondary">15 cards</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Live Market Integration</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Prices sync automatically from TCGplayer with intraday refreshes.
              Track total collection value and missing card costs in real-time.
            </p>
          </CardContent>
        </Card>
      </div>
    ),
    highlights: [
      "Show Collection/Catalog/AI tabs",
      "Highlight total quantities and values",
      "Open deck builder sections (Main/Sideboard/Extra)"
    ]
  },
  {
    id: "catalog",
    title: "Catalog Search",
    timeRange: "2:00 – 3:30",
    duration: 90,
    screenshot: "/images/catalog-search.png",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Catalog Search & Card Discovery</h2>
          <p className="text-lg text-muted-foreground">
            Search cards by name, add to deck, and see pricing with owned quantity aggregation.
          </p>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Smart Search Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Search Capabilities</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• Name-based card lookup</div>
                    <div>• Format-legal filtering</div>
                    <div>• TCG-specific results</div>
                    <div>• Real-time pricing data</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Resilient Integration</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• 404 "No products" → empty results</div>
                    <div>• Graceful error handling</div>
                    <div>• Automatic fallbacks</div>
                    <div>• Rate limiting protection</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Integration Highlights</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm text-green-800 dark:text-green-200">
                <div>✓ Live price synchronization</div>
                <div>✓ Owned quantity display</div>
                <div>✓ One-click deck addition</div>
                <div>✓ Format validation</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
    highlights: [
      "Search cards by name in catalog",
      "Add cards to deck with price display",
      "Show owned quantity aggregation",
      "Demonstrate resilient search handling"
    ]
  },
  {
    id: "ai-build",
    title: "AI Deck Build",
    timeRange: "3:30 – 5:15",
    duration: 105,
    screenshot: "/images/ai-deck-builder.png",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">AI-Powered Deck Building</h2>
          <p className="text-lg text-muted-foreground">
            Let AI build format-legal decks with exact deck size targets and rule enforcement.
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enforce Format Rules</span>
                    <Badge variant="default">ON</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bias to Owned Cards</span>
                    <Badge variant="outline">OFF</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Target Deck Size</span>
                    <Badge variant="secondary">60 cards</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Format Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">MTG</Badge>
                    <span className="text-sm">Standard, Modern, Commander</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Pokémon</Badge>
                    <span className="text-sm">Standard, Expanded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Yu-Gi-Oh!</Badge>
                    <span className="text-sm">Advanced, Traditional</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">AI Building Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="text-center">
                  <div className="h-8 w-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">Plan Generation</h4>
                  <p className="text-xs text-purple-700 dark:text-purple-200">AI creates strategy based on format</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">Card Mapping</h4>
                  <p className="text-xs text-purple-700 dark:text-purple-200">"Finding cards in catalog..." with improved speed</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">Deck Assembly</h4>
                  <p className="text-xs text-purple-700 dark:text-purple-200">Legal deck with exact size target</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
    highlights: [
      "In AI tab, ensure 'Enforce Format Rules' ON and 'Bias to Owned' OFF",
      "Select TCG and format (MTG Standard, Pokémon Standard, or YGO Advanced)",
      "Click 'Build with AI' - highlight exact deck size target and legal rules",
      "Show 'Finding cards in catalog...' mapping with improved speed"
    ]
  },
  {
    id: "analysis",
    title: "Analysis & Legality",
    timeRange: "5:15 – 6:30",
    duration: 75,
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Deck Analysis & Validation</h2>
          <p className="text-lg text-muted-foreground">
            Get detailed analytics, AI insights, and format legality validation.
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Deck Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Cards</span>
                    <span className="font-medium">60</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Unique Cards</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Duplicates</span>
                    <span className="font-medium">36</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Deck Value</span>
                    <span className="font-medium text-green-600">$127.50</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-500">Format Legal</Badge>
                  <div className="text-sm text-muted-foreground">
                    AI provides narrative analysis covering:
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>• Mana curve optimization</div>
                    <div>• Synergy evaluation</div>
                    <div>• Meta positioning</div>
                    <div>• Improvement suggestions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">Format Validation Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Validation Features</h4>
                  <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <div>• <code>formats.validateDeckLegality</code> for set legality</div>
                    <div>• Real-time rule enforcement</div>
                    <div>• Copy limit validation</div>
                    <div>• Banned/restricted card checking</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Technical Benefits</h4>
                  <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <div>• Rate limiting protection</div>
                    <div>• Token caching for APIs</div>
                    <div>• Batched operations</div>
                    <div>• Optional Python proxy support</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
    highlights: [
      "Click 'Analyze Deck' to get detailed statistics",
      "Show stats (total, unique, duplicates) and AI narrative",
      "Mention formats.validateDeckLegality for set legality",
      "Highlight performance optimizations and API protection"
    ]
  }
]

export default function DemoPage() {
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [elapsedTime, setElapsedTime] = React.useState(0)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const currentSlideData = slides[currentSlide]

  React.useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying])

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handlePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setElapsedTime(0)
    setIsPlaying(false)
    setCurrentSlide(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Interactive Demo
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{currentSlideData.timeRange}</Badge>
                <span>•</span>
                <span>Slide {currentSlide + 1} of {slides.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handlePlay}>
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-2" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Play</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentSlide
                    ? 'bg-primary'
                    : index < currentSlide
                      ? 'bg-primary/60'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Slide Content */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold">{currentSlideData.title}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {currentSlideData.timeRange}
                  </Badge>
                </div>
                {currentSlideData.duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {Math.floor(currentSlideData.duration / 60)}:{(currentSlideData.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>

              {/* Screenshot */}
              {currentSlideData.screenshot && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted">
                      <Image
                        src={currentSlideData.screenshot}
                        alt={`${currentSlideData.title} screenshot`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content */}
              <Card>
                <CardContent className="p-6">
                  {currentSlideData.content}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Highlights */}
              {currentSlideData.highlights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentSlideData.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <div className="h-6 w-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <span className="flex-1">{highlight}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Demo Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Current Section</span>
                      <span className="font-medium">{currentSlide + 1} / {slides.length}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Elapsed Time</span>
                      <span className="font-mono">{formatTime(elapsedTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Total</span>
                      <span className="font-mono">6:00 - 8:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Navigation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                        index === currentSlide
                          ? 'bg-primary text-primary-foreground'
                          : index < currentSlide
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                            : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{slide.title}</span>
                        <span className="text-xs opacity-70">{slide.timeRange}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}