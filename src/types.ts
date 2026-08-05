export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type TimeWindow = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeeklyAvailability = Record<DayKey, TimeWindow>;

export type BookingQuestion = {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
};

export type BookingTemplate = {
  id: string;
  name: string;
  slug: string;
  headline: string;
  description: string;
  active: boolean;
  durations: number[];
  purposes: string[];
  meetingMethods: Array<'zoom' | 'teams'>;
  questions: BookingQuestion[];
  freeTextEnabled: boolean;
  freeTextRequired: boolean;
  freeTextLabel: string;
  availabilityMode: 'global' | 'custom';
  customAvailability: WeeklyAvailability;
  minNoticeHours?: number | null;
  bufferBeforeMin?: number | null;
  bufferAfterMin?: number | null;
  horizonDays?: number | null;
};

export type AppSettings = {
  timezone: string;
  globalAvailability: WeeklyAvailability;
  minNoticeHours: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  horizonDays: number;
  zoomUrl: string;
  teamsFallbackUrl: string;
};

export type AppConfig = {
  settings: AppSettings;
  templates: BookingTemplate[];
};

export type PublicConfig = {
  settings: AppSettings;
  template: BookingTemplate;
};

export type Slot = {
  startUtc: string;
  endUtc: string;
};

export type BookingAnswer = {
  questionId: string;
  label: string;
  answer: string;
};
