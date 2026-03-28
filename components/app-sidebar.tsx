"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Briefcase, Plus, Trash2, Users } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  useFacebookGroups,
  useAddGroup,
  useRemoveGroup,
} from "@/hooks/use-facebook-groups"

const navItems = [
  { title: "Tim viec lam", href: "/jobs", icon: Briefcase },
  { title: "Facebook Posts", href: "/facebook-post", icon: Users },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const { data: groups = [], isLoading } = useFacebookGroups()
  const addGroup = useAddGroup()
  const removeGroup = useRemoveGroup()

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return
    addGroup.mutate(
      { name: name.trim(), url: url.trim() },
      {
        onSuccess: () => {
          setName("")
          setUrl("")
        },
      }
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Briefcase className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Get Job</span>
                  <span className="text-xs text-muted-foreground">
                    Tong hop viec lam
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Trang</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Facebook Groups</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              <Input
                placeholder="Ten nhom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="URL nhom Facebook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                onClick={handleAdd}
                disabled={addGroup.isPending || !name.trim() || !url.trim()}
                size="sm"
                className="w-full"
              >
                <Plus className="mr-1 h-3 w-3" />
                {addGroup.isPending ? "Dang them..." : "Them nhom"}
              </Button>

              <div className="space-y-1 pt-2">
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Dang tai...</p>
                )}
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-md border p-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {group.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeGroup.mutate(group.id)}
                      disabled={removeGroup.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {!isLoading && groups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Chua co nhom nao.
                  </p>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
