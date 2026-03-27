"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface JobSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  isLoading: boolean
}

export function JobSearchBar({ value, onChange, onSearch, isLoading }: JobSearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nhap tu khoa tim viec lam..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch()
          }}
          className="pl-9"
        />
      </div>
      <Button onClick={onSearch} disabled={isLoading || !value.trim()}>
        {isLoading ? "Dang tim..." : "Tim kiem"}
      </Button>
    </div>
  )
}
