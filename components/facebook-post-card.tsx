"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FacebookPost } from "@/lib/scrapers/types"
import { ExternalLink, ThumbsUp, User, Users } from "lucide-react"
import Image from "next/image"

export function FacebookPostCard({ post }: { post: FacebookPost }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
          >
            <Users className="mr-1 h-3 w-3" />
            {post.groupName}
          </Badge>
          {post.postedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(post.postedAt).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>
        {post.author && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            {post.author}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </p>

        {post.mediaUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-md"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {post.reactions && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="h-3 w-3" />
            {post.reactions}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem tren Facebook <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
