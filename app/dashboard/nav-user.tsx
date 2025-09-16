"use client"

import { IconDotsVertical } from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { SignOutButton, useClerk, useUser } from "@clerk/nextjs"
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { openUserProfile } = useClerk()
  const { theme } = useTheme()
  const { user: clerkUser } = useUser();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <>
                <Avatar className="h-8 w-8 rounded-lg grayscale">
                  <AvatarImage src={clerkUser?.imageUrl || ""} alt={clerkUser?.fullName || ""} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{clerkUser?.fullName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {clerkUser?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
                <IconDotsVertical className="ml-auto size-4" />
              </>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => openUserProfile({ appearance: { baseTheme: theme === "dark" ? dark : undefined } })}
            >
              Account
            </DropdownMenuItem>
            <SignOutButton redirectUrl="/">
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
