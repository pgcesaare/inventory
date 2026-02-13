import React from "react"

export const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-primary-border/20 ${className}`} />
)

export const AppBootSkeleton = () => (
  <div className="min-h-screen w-full bg-background px-6 py-8">
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SkeletonBlock className="h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
      </div>
      <SkeletonBlock className="h-20 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <SkeletonBlock className="h-72 w-full rounded-3xl" />
        <SkeletonBlock className="h-72 w-full rounded-3xl" />
        <SkeletonBlock className="h-72 w-full rounded-3xl" />
      </div>
    </div>
  </div>
)

export const RanchPageSkeleton = () => (
  <div className="w-full px-4 py-6 md:px-6">
    <div className="space-y-5">
      <SkeletonBlock className="h-28 w-full rounded-2xl" />
      <SkeletonBlock className="h-16 w-full rounded-2xl" />
      <SkeletonBlock className="h-[420px] w-full rounded-2xl" />
    </div>
  </div>
)

export const DetailPanelTimelineSkeleton = () => (
  <div className="mt-4 space-y-3">
    <SkeletonBlock className="h-16 w-full rounded-xl" />
    <SkeletonBlock className="h-16 w-full rounded-xl" />
    <SkeletonBlock className="h-16 w-full rounded-xl" />
  </div>
)
