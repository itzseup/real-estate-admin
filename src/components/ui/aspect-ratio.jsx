"use client"

import { AspectRatio } from "radix-ui"

function AspectRatio({
  ...props }) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
