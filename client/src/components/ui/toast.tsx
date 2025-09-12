// components/ui/toast.tsx - Production-ready toast system
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

// Utility function with fallback
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// Constants for better maintainability
const TOAST_VIEWPORT_CLASSNAME = "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"

const TOAST_BASE_CLASSNAME = "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all duration-200"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(TOAST_VIEWPORT_CLASSNAME, className)}
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

const toastVariants = cva(TOAST_BASE_CLASSNAME, {
  variants: {
    variant: {
      default: "border-gray-200 bg-white text-gray-900 shadow-md",
      destructive: "border-red-200 bg-red-50 text-red-900 shadow-md",
      success: "border-green-200 bg-green-50 text-green-900 shadow-md",
      warning: "border-yellow-200 bg-yellow-50 text-yellow-900 shadow-md",
      info: "border-blue-200 bg-blue-50 text-blue-900 shadow-md",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface ToastProps extends 
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
  VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  action?: React.ReactNode
  showCloseButton?: boolean
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant, title, description, action, showCloseButton = true, children, ...props }, ref) => {
  const Icon = React.useMemo(() => {
    switch (variant) {
      case 'success': return CheckCircle
      case 'destructive': return AlertCircle
      case 'warning': return AlertTriangle
      case 'info': return Info
      default: return null
    }
  }, [variant])

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        {Icon && (
          <Icon 
            className={cn(
              "h-5 w-5 flex-shrink-0 mt-0.5",
              variant === 'success' && "text-green-600",
              variant === 'destructive' && "text-red-600",
              variant === 'warning' && "text-yellow-600",
              variant === 'info' && "text-blue-600"
            )}
          />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <ToastTitle className="text-sm font-semibold leading-5 mb-1 truncate">
              {title}
            </ToastTitle>
          )}
          {description && (
            <ToastDescription className="text-sm leading-4 break-words">
              {description}
            </ToastDescription>
          )}
          {children}
        </div>
      </div>

      {action && (
        <div className="flex-shrink-0 ml-3">
          {action}
        </div>
      )}

      {showCloseButton && (
        <ToastClose className="flex-shrink-0" />
      )}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-70 transition-opacity hover:text-gray-600 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
      className
    )}
    aria-label="Close notification"
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

// Export types
export type { ToastProps }
export type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}