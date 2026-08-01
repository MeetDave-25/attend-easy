import * as React from "react"
import { Toaster as SonnerToaster } from "sonner"

const Sonner = () => {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "rounded-2xl font-medium shadow-lg border",
        },
      }}
    />
  )
}

export { Sonner }
