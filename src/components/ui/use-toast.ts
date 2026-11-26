import { createContext, useContext } from 'react'

export type ToastOptions = {
  /** Lettering that lands with the toast. `false` = none. */
  sfx?: string | false
  /** Milliseconds before it leaves on its own (the timer bar drains over this). */
  duration?: number
  /** Colour of the dot and timer; danger also shakes on landing. */
  variant?: 'info' | 'success' | 'danger'
}

export type ToastFn = (message: string, opts?: ToastOptions) => void

export const ToastContext = createContext<ToastFn>(() => {})

export const useToast = () => useContext(ToastContext)
