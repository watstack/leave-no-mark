# Leave No Mark – website

One-page site for **Leave No Mark**, window cleaning in Brunswick and surrounding suburbs (Mark Ryder, 0412 564 110).

Plain static HTML. There's no build step, framework or backend. Edit a file, commit, push, and GitHub Pages republishes in about a minute.

- Live: https://leavenomark.org (the old https://watstack.github.io/leave-no-mark/ link redirects here)
- All paths are relative, so the files work at any address without edits.

```
index.html              the whole page (HTML, CSS and JS in one file)
assets/logo.svg         logo (also logo-512.png)
assets/favicon.svg      browser tab icon (+ favicon-32.png fallback)
assets/apple-touch-icon.png   iPhone home-screen icon
assets/og-image.jpg     preview image when the link is shared (1200×630)
assets/fonts/           self-hosted Nunito + DM Sans (SIL Open Font License)
assets/photos/          put before/after photos here
.nojekyll               tells GitHub Pages to serve files as-is
```

## Editing text

Open `index.html` (on GitHub, click the file, then the pencil icon) and change the words between the tags. For example:

- Hero heading: search for `<h1>`
- Services: search for `class="svc"`
- Offer: search for `10% off`
- Availability: search for `Available weekday`

The phone number and email appear in several places. Use find-and-replace (`0412564110`, `0412 564 110`, `leavenomark@outlook.com`) and update the JSON-LD block in `<head>` too.

Page title and Google description are the `<title>` and `<meta name="description">` near the top of the file. The matching `og:` tags control link previews.

## Swapping in before/after photos

The four striped boxes under **Before & after** are placeholders. Search `index.html` for `PHOTO PLACEHOLDER`.

1. Crop each photo square. Export it as **WebP** at about **800×800** using https://squoosh.app (free, in the browser; aim for under 150 KB).
2. Upload it to `assets/photos/`, e.g. `assets/photos/photo-1.webp`.
3. Replace the matching placeholder line:
   ```html
   <div class="ph">PHOTO 1<br>before / after</div><!-- PHOTO PLACEHOLDER 1 -->
   ```
   with:
   ```html
   <div class="ph"><img src="assets/photos/photo-1.webp" alt="Before and after: front windows of a Brunswick terrace" width="800" height="800" loading="lazy" decoding="async"></div>
   ```
   Keep `width`/`height` (it stops the page jumping as photos load) and `loading="lazy"`. Write a real `alt` description for each photo.

Only use photos of real jobs that you have permission to show.

## Quote form setup (Web3Forms, free)

The quote form sends submissions to **leavenomark@outlook.com** through [Web3Forms](https://web3forms.com). The key is already set up. These steps are only needed if it ever has to be replaced. If a submission fails, the form shows a "please call or text 0412 564 110" message.

1. Go to https://web3forms.com and click **Create your Access Key**.
2. Enter **leavenomark@outlook.com** and submit. The access key is emailed to that inbox, so someone needs to check the Outlook inbox (and its junk folder).
3. In `index.html`, search for `WEB3FORMS_ACCESS_KEY` and replace the placeholder text inside the quotes:
   ```js
   var WEB3FORMS_ACCESS_KEY = "a1b2c3d4-....";
   ```
4. Commit, wait a minute, then send yourself a test quote from the live site.

The key is safe to have in public code: it can only send email to the address it was created for. Spam protection is a hidden "honeypot" checkbox (`botcheck`). Bots tick it, and those submissions are silently dropped. If spam becomes a problem, Web3Forms also offers hCaptcha (see their docs).

## Analytics (Umami, free)

Page views and quote-form progress are tracked with [Umami Cloud](https://cloud.umami.is) on the free Hobby plan (100K events a month, 6 months of history). No cookies, so no cookie banner, and no names, phone numbers or emails are ever sent. Tracking only runs on `leavenomark.org`, so local previews don't count.

**Setup (once):**

1. Sign up at https://cloud.umami.is and choose the free **Hobby** plan.
2. **Settings → Websites → Add website**: name `Leave No Mark`, domain `leavenomark.org`.
3. Click **Edit** on the website and copy the **Website ID**.
4. In `index.html`, search for `UMAMI_WEBSITE_ID` and paste it between the quotes:
   ```js
   var UMAMI_WEBSITE_ID = "a1b2c3d4-....";
   ```
5. Commit, open the live site, and check **Realtime** in Umami shows your visit.
6. Stop your own visits counting: on the live site, open the browser console and run `localStorage.setItem('umami.disabled', 1)` (once per browser).

**Events tracked:**

| Event | When |
|---|---|
| (page view) | Automatic, every visit |
| `quote-1-started` | Next on step 1 (with which services were picked) |
| `quote-2-details` | Reached step 2 |
| `quote-3-property` | Reached step 3 |
| `quote-4-contact` | Reached step 4 (name / phone / email) |
| `quote-5-sent` | Quote sent successfully (with services, property, when) |
| `quote-validation-error` | Tried to send without a name, or without a phone or email |
| `quote-send-failed` | Web3Forms didn't accept it, so the "please call" message showed |
| `contact-call` / `contact-text` / `contact-whatsapp` / `contact-email` / `contact-instagram` | Tapped that link, with `location` (hero, sticky bar, footer, quote form, thank you, form error, header) |

**Funnel report:** in Umami go to **Reports → Funnel**, pick a window of 1 hour, and add steps: URL `/`, then events `quote-1-started`, `quote-2-details`, `quote-3-property`, `quote-4-contact`, `quote-5-sent`. It shows how many visitors reach each step and where they drop off.

Calls and texts are probably the bigger lead source, so look at the `contact-*` events alongside the funnel.

## Custom domain: leavenomark.org

The domain is registered at Namecheap. These are already set up:

- `CNAME` file in the repo root containing `leavenomark.org`. Don't delete it, or the domain stops working.
- Namecheap DNS records (**Advanced DNS → Host Records**):
  - four **A** records, Host `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - **CNAME** record, Host `www` → `watstack.github.io`
- Canonical tag, `og:url`, `og:image` and JSON-LD all use `https://leavenomark.org/`
- `sitemap.xml` and `robots.txt` in the repo root

Still to do:

- [ ] Tick **Enforce HTTPS** in **Settings → Pages**. It's greyed out until GitHub has issued the certificate, which takes up to about an hour after the domain is added.
- [ ] Optional: verify the domain in your GitHub account (**Settings → Pages → Add a domain**) and add the TXT record it gives you at Namecheap. This stops anyone else from claiming the domain on GitHub.
- [ ] Add the site to [Google Search Console](https://search.google.com/search-console) and submit `https://leavenomark.org/sitemap.xml`.
- [ ] Add `https://leavenomark.org` to the Google Business Profile (as a service-area business, with no street address shown).

If the domain ever changes, update the `CNAME` file, then search the repo for `leavenomark.org` and replace it everywhere.

## Notes

- Mobile-first. Below 1080px wide, a sticky Call / Text / WhatsApp bar sits at the bottom of the screen.
- Lighthouse at launch scored 100 for Performance, Accessibility, Best Practices and SEO (mobile and desktop).
- Don't add reviews, star ratings, years in business or insurance/licence claims unless they're true and you can back them up.
