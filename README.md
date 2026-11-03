# KRISHAN WEBDESIGNERC – Website

Premium dark, animated web-design agency website. Plain HTML/CSS/JS front end with a
**zero-dependency Node server** (no `npm install` packages, no build step).

```
public/            the website (index.html, privacy.html, terms.html, css/, js/)
server/index.js    static file server + POST /api/contact (email delivery)
render.yaml        Render blueprint
.env.example       environment variables
```

## Run locally

```bash
node -v            # needs Node 18+
cp .env.example .env   # then fill in the email settings (see below)
npm start          # http://localhost:3000
```

## Contact form email (required for the form to deliver)

The form posts to `/api/contact`, which emails the enquiry using [Resend](https://resend.com)
(free tier available). **Until these variables are set the form will show an honest
"not connected" message and offer WhatsApp instead – it never pretends a message was sent.**

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | yes | API key from resend.com → API Keys |
| `CONTACT_TO_EMAIL` | yes | Where enquiries arrive (comma-separate for several) |
| `CONTACT_FROM_EMAIL` | no | Defaults to `KRISHAN WEBDESIGNERC <onboarding@resend.dev>`. Resend's default sender can only deliver to the email you signed up to Resend with. To send to any address, verify your domain in Resend and use e.g. `KRISHAN WEBDESIGNERC <hello@yourdomain.com>` |

Spam protection built in: honeypot field, server-side validation, 5 requests / 10 minutes per IP.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. Render dashboard → **New → Blueprint** → select the repo (uses `render.yaml`),
   **or** **New → Web Service** and enter:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Under **Environment**, add `RESEND_API_KEY`, `CONTACT_TO_EMAIL` (and optionally `CONTACT_FROM_EMAIL`).
4. Deploy. Visit `/api/health` – it should return `{"ok":true,"emailConfigured":true}`.
5. Submit the contact form once to confirm the email arrives.

Render's free plan sleeps after inactivity, so the first visit after a quiet period can take ~30–50 seconds.

## Things you may want to edit

| What | Where |
|---|---|
| Starting price (₹6,949) | `public/index.html` (search `6,949`), plus the WhatsApp text in `public/js/app.js` (`WA_MESSAGES.price`) and `public/privacy.html`/meta tags if needed |
| WhatsApp number / messages | `public/js/app.js` (`WA_NUMBER`, `WA_MESSAGES`) and the `href`s in `index.html` |
| Demo projects | `public/index.html` (`#work` section) and `PROJECTS` in `public/js/app.js` |
| Testimonials | `public/index.html` (`#testimonials`) – remove the "Sample placeholder" tags when you add real ones |
| FAQ answers | `public/index.html` (`#faq`) – please confirm they match how you actually work |
| Colours | CSS variables at the top of `public/css/styles.css` |

## Before going live

- Replace the sample testimonials with real feedback (never invent reviews).
- Review the Privacy Policy and Terms pages and adjust them to your real business terms.
- Add your domain to `<link rel="canonical">`, Open Graph image and a `sitemap.xml` once you have a domain.
