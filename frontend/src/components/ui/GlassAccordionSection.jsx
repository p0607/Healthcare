import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion.jsx';
import { cn } from '../../lib/utils';

/**
 * FAQ-style block: static header left, glass accordion right (wide screens).
 */
const GlassAccordionSection = ({
  title,
  description,
  items,
  type = 'single',
  collapsible = true,
  value,
  defaultValue,
  onValueChange,
  className,
}) => {
  const accordionProps =
    type === 'multiple'
      ? { type: 'multiple', value, defaultValue, onValueChange }
      : { type: 'single', collapsible, value, defaultValue, onValueChange };

  return (
    <section className={cn('grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16', className)}>
      <div className="lg:sticky lg:top-24 h-fit space-y-3 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm sm:text-base text-muted leading-relaxed max-w-md">{description}</p>
        ) : null}
      </div>

      <Accordion {...accordionProps} className="space-y-3">
        {items.map((item) => (
          <AccordionItem key={item.value} value={item.value} id={item.id}>
            <AccordionTrigger>
              <span className="flex flex-col items-start gap-0.5 min-w-0 pr-2">
                <span>{item.title}</span>
                {item.subtitle ? (
                  <span className="text-xs font-normal text-muted">{item.subtitle}</span>
                ) : null}
              </span>
            </AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default GlassAccordionSection;
