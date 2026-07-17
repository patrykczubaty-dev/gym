// Spiegelt die JSON-Formen der /api/mobile/*-Routes im Next.js-Backend
// (app/src/app/api/mobile/**/route.ts) - bewusst als eigene, einfache Typen
// statt eines geteilten Packages, da beide Projekte unabhaengig deploybar
// bleiben sollen.

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
  contractType: string;
};

export type CourseEvent = {
  id: string;
  course: { id: string; title: string; description: string | null; trainer: string };
  location: { city: string };
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  occupancy: "green" | "yellow" | "red";
  ownBookingStatus: "BOOKED" | "WAITLISTED" | null;
  ownWaitlistPosition: number | null;
};

export type Booking = {
  id: string;
  status: "BOOKED" | "WAITLISTED";
  waitlistPosition: number | null;
  calendarEventId: string;
  course: { id: string; title: string } | null;
  location: { city: string };
  startsAt: string;
  endsAt: string;
};

export type Profile = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  status: string;
  contractType: string;
  joinedAt: string;
};

export type Contract = {
  planName: string;
  contractEndDate: string;
  cancellationPossibleUntil: string;
  cancellationEffectiveAt: string;
  cancellationReceivedAt: string | null;
  autoRenewed: boolean;
  pausedFrom: string | null;
  pausedTo: string | null;
};

export type Voucher = {
  typeLabel: string;
  remainingSessions: number;
  validUntil: string;
};

export type MeResponse = {
  profile: Profile;
  contract: Contract | null;
  voucher: Voucher | null;
};
