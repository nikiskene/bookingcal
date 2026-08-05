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
- Microsoft 365 calendar event creation in `ns@iacy.com`
- Confirmation email to the guest with `crm@iacy.com` BCC'd
- Friendly reminder emails approximately 24 hours and 1 hour before the meeting
- Admin at `/admin` with simple password/session auth
- Booking-link configuration persisted in Netlify Blobs; no Supabase/database required

## Required Microsoft Graph permissions

Application permissions with admin consent:

- `Calendars.ReadWrite`
- `Mail.Send`

The Entra app already created for this project is `Niki Calendar Engine`.

## Environment variables

Set these in the Netlify/Bolt deployment environment. Never commit the client secret.

```text
MS_TENANT_ID=4f4f1ed3-ce5b-4010-8791-4d2b0209dbec
MS_CLIENT_ID=7fc43a3a-9172-4a5f-ba82-9f269ceb488f
MS_CLIENT_SECRET=<Microsoft client secret VALUE>
MS_CALENDAR_EMAIL=ns@iacy.com
CRM_BCC_EMAIL=crm@iacy.com
ADMIN_PASSWORD=<choose a strong admin password>
ADMIN_SESSION_SECRET=<long random string>
ZOOM_URL=https://www.nikiskene.com/meetonline
TEAMS_FALLBACK_URL=https://www.nikiskene.com/meetonteams
```

## Development

```bash
npm install
npm run dev
```

For the API functions and Netlify Blobs, use a Netlify-enabled environment/deployment. Production build:

```bash
npm run build
```

## Deployment

The repository includes `netlify.toml`. Connect this GitHub repository to Netlify (or let Bolt deploy it to Netlify), add the environment variables above, and deploy. The scheduled reminder function runs every 15 minutes on production deployments.

## Admin workflow

1. Open `/admin` and sign in with `ADMIN_PASSWORD`.
2. Use **Use this device timezone** whenever travelling to reset Niki's host timezone to the device timezone.
3. Edit global availability or create/duplicate booking links.
4. Each link provides a copyable public URL and iframe embed code.
5. Save changes.

Microsoft 365 remains the authoritative record of bookings. BookingCal stores only its own configuration.
