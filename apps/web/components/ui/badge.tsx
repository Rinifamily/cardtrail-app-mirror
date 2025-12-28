import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/90 text-primary-foreground',
        secondary: 'border-transparent bg-gray-100 text-text-primary',
        outline: 'border-gray-200 text-text-primary',
        positive: 'border-transparent bg-[#fdeceb] text-positive',
        warning: 'border-transparent bg-[#fff4e6] text-[#c06c00]',
        info: 'border-transparent bg-[#e9f2ff] text-[#2b5fc7]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
