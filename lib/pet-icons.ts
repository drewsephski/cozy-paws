export const petIconOptions = [
  { id: 'dog', label: 'Dog' },
  { id: 'cat', label: 'Cat' },
  { id: 'rabbit', label: 'Rabbit' },
  { id: 'bird', label: 'Bird' },
  { id: 'fish', label: 'Fish' },
  { id: 'turtle', label: 'Turtle' },
  { id: 'rat', label: 'Small pet' },
  { id: 'squirrel', label: 'Squirrel' }
] as const;

export type PetIconId = (typeof petIconOptions)[number]['id'];

export function isPetIconId(value: string): value is PetIconId {
  return petIconOptions.some((option) => option.id === value);
}
