import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-crm-ring focus-visible:ring-[3px] focus-visible:ring-crm-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-crm-primary text-crm-primary-foreground hover:bg-crm-primary/90",
        outline:
          "border-crm-border bg-transparent hover:bg-crm-secondary text-crm-foreground",
        secondary:
          "bg-crm-secondary text-crm-secondary-foreground hover:bg-crm-secondary/80",
        ghost: "hover:bg-crm-secondary text-crm-foreground",
        destructive:
          "bg-crm-destructive/10 text-crm-destructive hover:bg-crm-destructive/20",
        link: "text-crm-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        xs: "h-6 rounded-md px-2 text-xs",
        sm: "h-7 rounded-md px-2.5 text-[0.8rem]",
        lg: "h-9 px-3.5",
        icon: "size-8",
        "icon-sm": "size-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
