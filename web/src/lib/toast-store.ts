'use client';

import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).slice(2) }],
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Imperative helper — fire-and-forget feedback from anywhere (event handlers, API
 * callbacks) without prop-drilling. Immediate, unmistakable feedback after every
 * action closes the loop the user's brain is expecting (feedback principle / Nielsen
 * heuristic "visibility of system status").
 */
export function toast(input: Omit<Toast, 'id'>) {
  useToastStore.getState().push(input);
}
