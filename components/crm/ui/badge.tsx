import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-crm-primary focus-visible:ring-[3px] focus-visible:ring-crm-ring/50 aria-invalid:border-crm-destructive aria-invalid:ring-crm-destructive/20 dark:aria-invalid:ring-crm-destructive/40 [&>svg]:pointer-events-none [&>svg]:!size-3",
  {
    variants: {
      variant: {
        default:
          "bg-crm-primary text-crm-primary-foreground [a]:hover:bg-crm-primary/80",
        secondary:
          "bg-crm-secondary text-crm-secondary-foreground [a]:hover:bg-crm-secondary/80",
        destructive:
          "bg-crm-destructive/10 text-crm-destructive focus-visible:ring-crm-destructive/20 dark:bg-crm-destructive/20 dark:focus-visible:ring-crm-destructive/40 [a]:hover:bg-crm-destructive/20",
        outline:
          "border-crm-border text-crm-foreground [a]:hover:bg-crm-secondary [a]:hover:text-crm-muted",
        ghost:
          "hover:bg-crm-secondary hover:text-crm-muted dark:hover:bg-crm-secondary/50",
        link: "text-crm-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
