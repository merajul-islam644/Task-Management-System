import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export const PopoverContent = ({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: RadixPopover.PopoverContentProps) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-60 min-w-44 rounded-[10px] border border-line bg-surface shadow-pop outline-none",
        "data-[state=open]:animate-[ft-pop-in_130ms_ease-out]",
        className,
      )}
      {...props}
    />
  </RadixPopover.Portal>
);
