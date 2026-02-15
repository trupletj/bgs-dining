"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />,
        info: <InfoIcon className="size-5 text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />,
        error: <OctagonXIcon className="size-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]" />,
        loading: <Loader2Icon className="size-5 text-blue-400 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "bg-[rgba(15,23,42,0.8)] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          title: "text-slate-100",
          description: "text-slate-400",
          success: "border-l-4 border-l-emerald-400",
          error: "border-l-4 border-l-red-400",
          warning: "border-l-4 border-l-amber-400",
          info: "border-l-4 border-l-blue-400",
          closeButton: "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
