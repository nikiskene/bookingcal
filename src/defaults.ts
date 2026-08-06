import type { AppConfig, BookingTemplate, WeeklyAvailability } from './types';

export const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

export const blankWeek = (): WeeklyAvailability => ({
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: false, start: '09:00', end: '18:00' },
  sunday: { enabled: true, start: '16:00', end: '19:00' },
});

export const newTemplate = (): BookingTemplate => ({
  id: crypto.randomUUID(),
  name: 'New booking link',
  slug: `meeting-${Math.random().toString(36).slice(2, 7)}`,
  headline: 'Book a meeting with Niki',
  description: 'Choose the time that works best for you.',
  active: true,
  durations: [15, 30, 60],
  purposes: ['Institute of Beautiful Success', 'Tour', 'Speakercoaching', 'Other'],
  meetingMethods: ['zoom', 'teams'],
  questions: [],
  freeTextEnabled: true,
  freeTextRequired: false,
  freeTextLabel: 'Anything I should know before we meet?',
  availabilityMode: 'global',
  customAvailability: blankWeek(),
  minNoticeHours: null,
  bufferBeforeMin: null,
  bufferAfterMin: null,
  horizonDays: null,
});

export const defaultConfig = (): AppConfig => ({
  settings: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Vienna',
    globalAvailability: blankWeek(),
    minNoticeHours: 4,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    horizonDays: 60,
    zoomUrl: 'https://www.nikiskene.com/meetonline',
    teamsFallbackUrl: 'https://www.nikiskene.com/meetonteams',
  },
  templates: [{
    ...newTemplate(),
    id: 'default-niki',
    name: 'Niki — general',
    slug: 'niki',
    headline: 'Book a meeting with Niki',
    description: 'Choose a time that works for you. Times automatically appear in your timezone.',
  }],
});
