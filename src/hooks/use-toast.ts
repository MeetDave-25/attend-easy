import * as React from "react"
import { useState, useReducer, useEffect } from "react"

type ToastType = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactElement
  open: boolean
}

type Action =
  | { type: "ADD_TOAST"; toast: ToastType }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastType> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 2000

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function reducer(state: ToastType[], action: Action): ToastType[] {
  switch (action.type) {
    case "ADD_TOAST":
      return [action.toast, ...state].slice(0, TOAST_LIMIT)
    case "UPDATE_TOAST":
      return state.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t))
    case "DISMISS_TOAST": {
      if (action.toastId) {
        if (toastTimeouts.has(action.toastId)) return state
        const timeout = setTimeout(() => {
          toastTimeouts.delete(action.toastId!)
          dispatch({ type: "REMOVE_TOAST", toastId: action.toastId })
        }, TOAST_REMOVE_DELAY)
        toastTimeouts.set(action.toastId, timeout)
      }
      return state.map((t) =>
        t.id === action.toastId || !action.toastId ? { ...t, open: false } : t
      )
    }
    case "REMOVE_TOAST":
      return action.toastId ? state.filter((t) => t.id !== action.toastId) : []
  }
}

let listeners: Array<(state: ToastType[]) => void> = []
let memoryState: ToastType[] = []

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToastType, "id" | "open">

function toast({ ...props }: Toast) {
  const id = genId()
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true } })
  return { id, dismiss }
}

function useToast() {
  const [state, setState] = useState<ToastType[]>(memoryState)
  useEffect(() => {
    listeners.push(setState)
    return () => { listeners = listeners.filter((l) => l !== setState) }
  }, [])
  return {
    toasts: state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
