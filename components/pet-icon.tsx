import { Bird, Cat, Dog, Fish, Rabbit, Rat, Squirrel, Turtle, type LucideIcon } from '@/components/ui/animated-icons';
import { isPetIconId, type PetIconId } from '@/lib/pet-icons';
import { cn } from '@/lib/utils';

const petIcons: Record<PetIconId, LucideIcon> = {
  dog: Dog,
  cat: Cat,
  rabbit: Rabbit,
  bird: Bird,
  fish: Fish,
  turtle: Turtle,
  rat: Rat,
  squirrel: Squirrel
};

export function PetIcon({ value, className, fallbackClassName }: { value: string; className?: string; fallbackClassName?: string }) {
  if (!isPetIconId(value)) {
    return <span className={cn('leading-none', fallbackClassName)}>{value}</span>;
  }

  const Icon = petIcons[value];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.75} />;
}
