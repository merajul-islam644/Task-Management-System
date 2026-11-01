import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export const MenuContent = ({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: RadixMenu.DropdownMenuContentProps) => (
  <RadixMenu.Portal>
    <RadixMenu.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-60 min-w-44 rounded-[10px] border border-line bg-surface p-1 shadow-pop",
        "data-[state=open]:animate-[ft-pop-in_130ms_ease-out]",
        className,
      )}
      {...props}
    />
  </RadixMenu.Portal>
);

export const MenuItem = ({
  className,
  danger,
  ...props
}: RadixMenu.DropdownMenuItemProps & { danger?: boolean }) => (
  <RadixMenu.Item
    className={cn(
      "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-ink outline-none select-none",
      "data-[highlighted]:bg-surface-hover",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      danger && "text-danger data-[highlighted]:bg-danger-soft",
      className,
    )}
    {...props}
  />
);

export const MenuLabel = ({ className, ...props }: RadixMenu.DropdownMenuLabelProps) => (
  <RadixMenu.Label
    className={cn("px-2 py-1.5 text-[11px] font-medium text-ink-3", className)}
    {...props}
  />
);

export const MenuSeparator = ({ className }: { className?: string }) => (
  <RadixMenu.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} />
);

export const MenuCheckboxItem = ({
  className,
  ...props
}: RadixMenu.DropdownMenuCheckboxItemProps) => (
  <RadixMenu.CheckboxItem
    className={cn(
      "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-ink outline-none select-none",
      "data-[highlighted]:bg-surface-hover data-[state=checked]:font-medium",
      className,
    )}
    {...props}
  />
);
