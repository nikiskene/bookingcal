# BookingCal

Focused personal scheduling tool for Niki Skene. Microsoft 365 remains the calendar source of truth. BookingCal does not keep a booking database.

## What it does

- Public booking links at `/book/:slug`
- Viewer times automatically displayed in the viewer's browser/device timezone
- Host availability anchored to Niki's current timezone
- Default availability: Mon–Fri 09:00–18:00, Sunday 16:00–19:00
- 15 / 30 / 60 minute booking options
- Per-link purpose options, meeting methods, questions, free-text field and custom availability
- Zoom via `https://www.nikiskene.com/meetonline`
- Microsoft Teams online meetings generated through Microsoft Graph, with fallback link support
- Microsoft 365 calendar event creation
- Confirmation email to the guest with CRM BCC support
- Friendly reminder emails approximately 24 hours and 1 hour before the meeting
- Admin at `/admin` with Bolt Database authentication
- Booking-link configuration persisted in Bolt Database

## Required Microsoft Graph permissions

Application permissions with admin consent:

- `Calendars.ReadWrite`
- `Mail.Send`

## Environment variables

Set these in the deployment environment. Never commit the real credential values.

```text
MS_TENANT_ID=<Microsoft tenant ID>
MS_CLIENT_ID=<Microsoft application/client ID>
MS_CLIENT_SECRET=<Microsoft client secret VALUE>
MS_CALENDAR_EMAIL=<calendar mailbox>
CRM_BCC_EMAIL=<CRM BCC mailbox>
VITE_SUPABASE_URL=<provided by Bolt Database>
VITE_SUPABASE_ANON_KEY=<provided by Bolt Database>
ZOOM_URL=https://www.nikiskene.com/meetonline
TEAMS_FALLBACK_URL=https://www.nikiskene.com/meetonteams
```

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Deployment

The repository includes `netlify.toml`. Connect this GitHub repository to Netlify, add the environment variables above, and deploy. The scheduled reminder function runs on production deployments.

## Admin workflow

1. Open `/admin` and sign in.
2. Use **Set timezone to this device** whenever travelling to reset the host timezone.
3. Edit global availability or create/duplicate booking links.
4. Each link provides a copyable public URL and iframe embed code.
5. Save changes.

Microsoft 365 remains the authoritative record of bookings. BookingCal stores only its own configuration.
