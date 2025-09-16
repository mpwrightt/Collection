"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function fmtDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export function RecentItems() {
  const items = useQuery(api.dashboard.getRecentItems, { limit: 10 }) || []

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-muted-foreground text-sm">No items yet. Add cards from the Collections page.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Product ID</th>
                    <th className="text-left py-2 pr-4">SKU</th>
                    <th className="text-left py-2 pr-4">Qty</th>
                    <th className="text-left py-2 pr-4">Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it._id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(it.createdAt)}</td>
                      <td className="py-2 pr-4">{it.productId}</td>
                      <td className="py-2 pr-4">{it.skuId ?? "-"}</td>
                      <td className="py-2 pr-4">{it.quantity}</td>
                      <td className="py-2 pr-4">{it.collectionName ?? "Unassigned"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
