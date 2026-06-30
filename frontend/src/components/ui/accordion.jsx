import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = ({ className, ...props }) => (
  <AccordionPrimitive.Item
    className={cn(
      'rounded-2xl border border-glass-border/50 bg-glass/40 backdrop-blur-xl transition-all duration-300',
      'data-[state=open]:border-glass-border/80 data-[state=open]:bg-glass-elevated/70 data-[state=open]:shadow-glass',
      className
    )}
    {...props}
  />
);

const AccordionTrigger = ({ className, children, ...props }) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={cn(
        'group flex flex-1 items-center justify-between gap-4 rounded-2xl px-4 py-4 sm:px-5 sm:py-4',
        'text-left text-sm sm:text-base font-semibold text-foreground',
        'transition-all hover:text-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

const AccordionContent = ({ className, children, ...props }) => (
  <AccordionPrimitive.Content
    className={cn(
      'overflow-hidden text-sm text-muted',
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'
    )}
    {...props}
  >
    <div className={cn('px-4 pb-5 pt-0 sm:px-5 sm:pb-6', className)}>{children}</div>
  </AccordionPrimitive.Content>
);

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
