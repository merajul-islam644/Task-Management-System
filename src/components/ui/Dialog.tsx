import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

/**
 * Centered modal. Focus is trapped and returned on close by Radix;
 * Esc closes and focus moves to the dialog per ARIA dialog pattern.
 */
export const DialogContent = ({
  className,
  children,
  size = "md",
  ...props
}: RadixDialog.DialogContentProps & { size?: "md" | "lg" }) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-overlay",
        "data-[state=open]:animate-[ft-fade-in_150ms_ease-out] data-[state=closed]:animate-[ft-fade-out_120ms_ease-in]",
      )}
    />
    <RadixDialog.Content
      className={cn(
        "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
        "rounded-card border border-line bg-surface shadow-pop",
        "data-[state=open]:animate-[ft-pop-in_160ms_ease-out] data-[state=closed]:animate-[ft-fade-out_120ms_ease-in]",
        size === "md" ? "max-w-md" : "max-w-2xl",
        className,
      )}
      {...props}
    >
      {/* Tall content scrolls inside the dialog instead of spilling past its
          bottom edge; the close button stays pinned to the dialog corner. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
      <RadixDialog.Close asChild>
        <IconButton label="Close dialog" className="absolute top-3 right-3">
          <X size={15} />
        </IconButton>
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
);

/** Right-side drawer (task details, AI assistant). */
export function SheetContent({
  className,
  children,
  width = "md",
  label,
  ...props
}: RadixDialog.DialogContentProps & { width?: "md" | "wide"; label: string }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-overlay",
          "data-[state=open]:animate-[ft-fade-in_150ms_ease-out] data-[state=closed]:animate-[ft-fade-out_120ms_ease-in]",
        )}
      />
      <RadixDialog.Content
        aria-label={label}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-surface shadow-pop outline-none",
          "data-[state=open]:animate-[ft-slide-from-right_200ms_cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-[ft-slide-to-right_150ms_ease-in]",
          width === "md" ? "max-w-md" : "max-w-xl",
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 border-b border-line px-5 py-4 pr-12", className)}>
      <RadixDialog.Title className="text-[15px] font-semibold tracking-[-0.01em]">
        {title}
      </RadixDialog.Title>
      {description ? (
        <RadixDialog.Description className="text-[13px] text-ink-2">
          {description}
        </RadixDialog.Description>
      ) : null}
      {children}
    </div>
  );
}
