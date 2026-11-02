# Leave No Mark – website

One-page site for **Leave No Mark**, window cleaning in Brunswick and surrounding suburbs (Mark Ryder, 0412 564 110).

Plain static HTML. There's no build step, framework or backend. Edit a file, commit, push, and GitHub Pages republishes in about a minute.

- Live (now): https://watstack.github.io/leave-no-mark/
- All paths are relative, so the same files work at the custom domain's root later without edits.

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

The quote form sends submissions to **leavenomark@outlook.com** through [Web3Forms](https://web3forms.com). Until the key is added, the form shows a "please call or text 0412 564 110" message instead of sending.

1. Go to https://web3forms.com and click **Create your Access Key**.
2. Enter **leavenomark@outlook.com** and submit. The access key is emailed to that inbox, so someone needs to check the Outlook inbox (and its junk folder).
3. In `index.html`, search for `WEB3FORMS_ACCESS_KEY` and replace the placeholder text inside the quotes:
   ```js
   var WEB3FORMS_ACCESS_KEY = "WEB3FORMS_ACCESS_KEY";   // before
   var WEB3FORMS_ACCESS_KEY = "a1b2c3d4-....";          // after
   ```
4. Commit, wait a minute, then send yourself a test quote from the live site.

The key is safe to have in public code: it can only send email to the address it was created for. Spam protection is a hidden "honeypot" checkbox (`botcheck`). Bots tick it, and those submissions are silently dropped. If spam becomes a problem, Web3Forms also offers hCaptcha (see their docs).

## Moving to a custom domain later

1. **CNAME file.** Add a file called `CNAME` (no extension) to the repo root containing just the domain, e.g. `leavenomark.com.au`. Alternatively, set it in **Settings → Pages → Custom domain**, which creates the file for you.
2. **DNS at your registrar:**
   - Apex domain (`leavenomark.com.au`): four **A** records pointing to
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     (optional IPv6 **AAAA**: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`)
   - `www` subdomain: a **CNAME** record pointing to `watstack.github.io` (no repo name)
   - Set up both so `www` and the bare domain each work. GitHub redirects between them.
   - Recommended: verify the domain under your GitHub account's **Settings → Pages** to prevent takeover.
3. **Enforce HTTPS.** Once DNS has propagated (minutes to a few hours), go to **Settings → Pages** and tick **Enforce HTTPS**. The certificate is free and automatic.
4. **SEO TODOs** (do these once the domain is live):
   - [ ] Add a canonical tag in `<head>` (there's a TODO comment marking the spot):
     `<link rel="canonical" href="https://YOUR-DOMAIN/">`
   - [ ] Add `<meta property="og:url" content="https://YOUR-DOMAIN/">`
   - [ ] Change the `og:image` URL from `https://watstack.github.io/leave-no-mark/assets/og-image.jpg` to `https://YOUR-DOMAIN/assets/og-image.jpg`. The old URL keeps redirecting, but the direct one is cleaner.
   - [ ] Add `"url": "https://YOUR-DOMAIN/"` and `"image": "https://YOUR-DOMAIN/assets/logo-512.png"` to the JSON-LD block
   - [ ] Add `sitemap.xml` in the repo root:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       <url><loc>https://YOUR-DOMAIN/</loc></url>
     </urlset>
     ```
   - [ ] Add `robots.txt` in the repo root:
     ```
     User-agent: *
     Allow: /
     Sitemap: https://YOUR-DOMAIN/sitemap.xml
     ```
   - [ ] Submit the sitemap in Google Search Console, and link the site from the Google Business Profile (as a service-area business, with no street address shown).

## Notes

- Mobile-first. Below 1080px wide, a sticky Call / Text / WhatsApp bar sits at the bottom of the screen.
- Lighthouse at launch scored 100 for Performance, Accessibility, Best Practices and SEO (mobile and desktop).
- Don't add reviews, star ratings, years in business or insurance/licence claims unless they're true and you can back them up.
