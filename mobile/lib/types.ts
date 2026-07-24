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

export type WeeklyQuota = { limit: number; usedThisWeek: number } | null;

export type CourseEvent = {
  id: string;
  course: { id: string; title: string; description: string | null; trainer: string };
  location: { city: string };
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  occupancy: "green" | "yellow" | "red";
  ownBookingStatus: "BOOKED" | "WAITLISTED" | null;
  ownWaitlistPosition: number | null;
  ownBookingId: string | null;
  canCancel: boolean;
  cancellationCutoffHours: number | null;
  // Kontingent der Kalenderwoche, in der DIESER Termin liegt (siehe
  // api/mobile/courses/route.ts) - nicht global, da die 14-Tage-Liste
  // mehrere Wochen ueberspannen kann.
  weeklyQuota: WeeklyQuota;
};

export type Booking = {
  id: string;
  status: "BOOKED" | "WAITLISTED";
  waitlistPosition: number | null;
  calendarEventId: string;
  course: { id: string; title: string; description: string | null; trainer: string } | null;
  event: { title: string; description: string | null } | null;
  location: { city: string };
  startsAt: string;
  endsAt: string;
  canCancel: boolean;
  cancellationCutoffHours: number | null;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  occupancy: "green" | "yellow" | "red";
};

export type Profile = {
  id: string;
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
  weeklyQuota: WeeklyQuota;
};

export type Participant = { name: string; isMe: boolean; position?: number | null };

export type ParticipantsResponse = {
  booked: Participant[];
  waitlisted: Participant[];
};

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: { city: string };
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  occupancy: "green" | "yellow" | "red";
  ownBookingStatus: "BOOKED" | "WAITLISTED" | null;
  ownWaitlistPosition: number | null;
  ownBookingId: string | null;
  canCancel: boolean;
  cancellationCutoffHours: number | null;
};

export type Favorite = {
  courseId: string;
  courseTitle: string;
  nextEvent: {
    id: string;
    startsAt: string;
    endsAt: string;
    trainer: string;
    description: string | null;
    location: { city: string };
    capacity: number;
    bookedCount: number;
    waitlistCount: number;
    occupancy: "green" | "yellow" | "red";
    ownBookingStatus: "BOOKED" | "WAITLISTED" | null;
    ownBookingId: string | null;
    canCancel: boolean;
    isFull: boolean;
    weeklyQuota: WeeklyQuota;
    cancellationCutoffHours: number | null;
  } | null;
};

export type StatsResponse = {
  totalBookings: number;
  byCourse: { courseTitle: string; count: number }[];
  weekStreak: number;
  monthlyCount: number;
  weeklyBreakdown: { weekLabel: string; count: number }[];
  recentVisits: { courseTitle: string; startsAt: string; location: string }[];
};
