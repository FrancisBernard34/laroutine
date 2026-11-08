import Image from "next/image"

import { cn } from "@/lib/utils"

// Both files are 500x100 (5:1). Displayed height comes from `className`
// (default h-7); the intrinsic size only reserves the aspect ratio.
// To replace the logo, overwrite the two PNGs in public/ (keep the same aspect ratio).
const WIDTH = 500
const HEIGHT = 100
// `sizes` (displayed width is at most ~140px) lets the browser pick a ~2x variant from the srcset.

/**
 * Compact brand mark (orange disc, reads on dark and light) used by the
 * collapsed sidebar rail. Same file as the PWA icon in public/.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/web-app-manifest-192x192.png"
      alt="Laroutine"
      width={192}
      height={192}
      sizes="32px"
      className={cn("size-7 rounded-full", className)}
    />
  )
}

/**
 * Theme-aware app logo. Both variants are in the markup and CSS (`dark:` =
 * `.dark` ancestor) shows one, so there is no flash or hydration mismatch.
 * The hidden one is display:none (not lazy-fetched, not in the a11y tree).
 */
export function Logo({ className }: { className?: string }) {
  const size = cn("h-7 w-auto", className)
  return (
    <>
      <Image
        src="/laroutine-black.png"
        alt="Laroutine"
        width={WIDTH}
        height={HEIGHT}
        sizes="150px"
        className={cn(size, "block dark:hidden")}
      />
      <Image
        src="/laroutine-white.png"
        alt="Laroutine"
        width={WIDTH}
        height={HEIGHT}
        sizes="150px"
        className={cn(size, "hidden dark:block")}
      />
    </>
  )
}
