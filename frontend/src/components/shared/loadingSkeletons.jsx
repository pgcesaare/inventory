import React from "react"

export const SkeletonBlock = ({ className = "" }) => (
  <div
    className={`relative overflow-hidden rounded-lg bg-primary-border/20 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)] animate-pulse ${className}`}
  >
    <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-70 animate-pulse" />
  </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
      <div className="rounded-2xl border border-primary-border/25 bg-white p-3 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.55)]">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <div className="mt-3 space-y-2">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
)

export const DetailPanelTimelineSkeleton = () => (
  <div className="mt-4 space-y-4">
    <div className="flex items-start gap-3">
      <SkeletonBlock className="mt-1 h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
    </div>
    <div className="flex items-start gap-3">
      <SkeletonBlock className="mt-1 h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
    </div>
    <div className="flex items-start gap-3">
      <SkeletonBlock className="mt-1 h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
    </div>
  </div>
)

export const LoadDetailsSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-primary-border/25 bg-white p-4 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-10 w-56 rounded-xl" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <SkeletonBlock className="h-20 w-full rounded-xl" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
      <SkeletonBlock className="h-20 w-full rounded-xl" />
    </div>
    <div className="rounded-2xl border border-primary-border/25 bg-white p-3 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.55)]">
      <SkeletonBlock className="h-10 w-full rounded-xl" />
      <div className="mt-3 space-y-2">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <SkeletonBlock className="h-10 w-full rounded-xl" />
      </div>
    </div>
  </div>
)
