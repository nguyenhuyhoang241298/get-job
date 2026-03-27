"use client"

import { useState } from "react"
import { Settings, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  useFacebookGroups,
  useAddGroup,
  useRemoveGroup,
} from "@/hooks/use-facebook-groups"

export function FacebookGroupsDialog() {
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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Quan ly Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Facebook Groups</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ten nhom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="https://facebook.com/groups/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              onClick={handleAdd}
              disabled={addGroup.isPending || !name.trim() || !url.trim()}
              size="sm"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addGroup.isPending ? "Dang them..." : "Them nhom"}
            </Button>
          </div>
          <div className="space-y-2">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Dang tai...</p>
            )}
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeGroup.mutate(group.id)}
                  disabled={removeGroup.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {!isLoading && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">Chua co nhom nao.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
