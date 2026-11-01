import * as RadixSwitch from "@radix-ui/react-switch";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Switch = ({ className, ...props }: RadixSwitch.SwitchProps) => (
  <RadixSwitch.Root
    className={cn(
      "relative h-[18px] w-8 shrink-0 rounded-full border border-line-strong bg-surface transition-colors duration-150",
      "data-[state=checked]:border-accent-solid data-[state=checked]:bg-accent-solid",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      className,
    )}
    {...props}
  >
    <RadixSwitch.Thumb className="block h-3 w-3 translate-x-0.5 rounded-full bg-ink-3 transition-transform duration-150 data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-white" />
  </RadixSwitch.Root>
);

export const Checkbox = ({ className, ...props }: RadixCheckbox.CheckboxProps) => (
  <RadixCheckbox.Root
    className={cn(
      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-line-strong bg-surface transition-colors duration-150",
      "hover:border-ink-3 data-[state=checked]:border-accent-solid data-[state=checked]:bg-accent-solid data-[state=indeterminate]:border-accent-solid data-[state=indeterminate]:bg-accent-solid",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      className,
    )}
    {...props}
  >
    <RadixCheckbox.Indicator className="text-white">
      {props.checked === "indeterminate" ? (
        <Minus size={11} strokeWidth={3} />
      ) : (
        <Check size={11} strokeWidth={3} />
      )}
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
);
