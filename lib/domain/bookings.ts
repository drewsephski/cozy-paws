export type BookingStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const bookingTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function parseBookingStatus(value: unknown): BookingStatus | null {
  if (typeof value !== 'string' || !(value in bookingTransitions)) return null;
  return value as BookingStatus;
}

export function allowedBookingTransitions(status: BookingStatus): readonly BookingStatus[] {
  return bookingTransitions[status];
}
