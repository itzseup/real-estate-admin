"use client"

import { useState, useEffect } from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map()

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// Here you can write a custom reducer
export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id
            ? { ...t, ...action.toast }
            : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        for (const toast of state.toasts) {
          addToRemoveQueue(toast.id)
        }
      }
      return {
        ...state,
        toasts: state.toasts.map((t) => ({
          ...t,
          open: false,
        })),
      }
    }

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners = []
let memoryState = { toasts: [] }

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function useToast(options = {}) {
  const [state, setState] = useState(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const { ...rest } = options

  const actionWithIcon = {
    ...rest,
    ...(options.action || {}),
  }

  useEffect(() => {
    if (options.open) {
      dispatch({
        type: "ADD_TOAST",
        toast: { ...options, ...actionWithIcon },
      })
    }
  }, [options, actionWithIcon])

  return {
    ...state,
    toast: (props) => {
      dispatch({
        type: "ADD_TOAST",
        toast: { ...props },
      })
    },
    dismiss: (toastId) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
    update: (id, props) =>
      dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id },
      }),
  }
}

useToast.dismiss = (toastId) => dispatch({ type: "DISMISS_TOAST", toastId })
useToast.update = (id, props) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
useToast.toast = (props) => dispatch({ type: "ADD_TOAST", toast: { ...props } })

export { useToast }
