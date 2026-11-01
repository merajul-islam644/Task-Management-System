import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: Toast[];
  push: (title: string, options?: { description?: string; variant?: ToastVariant }) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (title, options) => {
    const id = `toast_${++counter}`;
    const toast: Toast = {
      id,
      title,
      description: options?.description,
      variant: options?.variant ?? "success",
    };
    set((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push(title, { description, variant: "success" }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push(title, { description, variant: "error" }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push(title, { description, variant: "info" }),
};
