"use client";

export function CardSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-[#1a1a1e] bg-[#121214] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-[#1a1a1e]" />
        <div className="h-5 w-20 rounded-full bg-[#1a1a1e]" />
      </div>
      <div className="h-4 w-32 rounded bg-[#1a1a1e]" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-[#1a1a1e]" />
        <div className="h-3 w-24 rounded bg-[#1a1a1e]" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-2 p-3">
      <div className="h-4 w-24 rounded bg-[#1a1a1e] mb-3" />
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-[#1a1a1e]" />
        <div className="h-5 w-5 rounded bg-[#1a1a1e]" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-[#1a1a1e]" />
        <div className="h-5 w-20 rounded-full bg-[#1a1a1e]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#1a1a1e]" />
        <div className="h-3 w-3/4 rounded bg-[#1a1a1e]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-48 rounded bg-[#1a1a1e]" />
        <div className="h-3 w-36 rounded bg-[#1a1a1e]" />
      </div>
      <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-3 space-y-2">
        <div className="h-4 w-20 rounded bg-[#1a1a1e]" />
        <div className="h-3 w-full rounded bg-[#1a1a1e]" />
        <div className="h-3 w-2/3 rounded bg-[#1a1a1e]" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0b]">
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ff2d2d] border-t-transparent" />
        <p className="text-sm text-[#555]">Loading map...</p>
      </div>
    </div>
  );
}
