# SpatialX Solutions Website

A functioning Node.js website for SpatialX Solutions. Built to be simple to upload as a ZIP to Hostinger and run without a build step or external npm dependencies.

## What is included

- Node.js server: `server.js`
- Start script: `npm start`
- Static pages:
  - Home
  - Capabilities
  - Industries
  - Insights
  - About
  - Contact
  - Privacy
  - 404 page
- Sample insight articles
- Responsive navigation
- Contact form endpoint
- Dark spatial brand identity with light enterprise content panels
- SVG logo and favicon
- No database required
- No external images or fonts required

## Local run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

You can also choose a port:

```bash
PORT=8080 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=8080; npm start
```

## Hostinger deployment notes

Recommended Hostinger settings:

```text
Application root: spatialx-solutions-site
Startup file: server.js
Start command: npm start
Build command: leave blank
Node version: 18 or newer
```

This repo has no dependencies, so there is no required `npm install` step. Hostinger may still run install automatically, which is fine.

## Upload as ZIP

1. Upload the ZIP archive to Hostinger using the Node.js Web App deployment flow or File Manager.
2. Extract the ZIP.
3. Select `server.js` as the startup file.
4. Set the start command to `npm start`.
5. Leave build command blank.
6. Deploy.

## Contact form

The contact form posts to `/contact` and logs the submission on the Node.js server. Before using the form in production, connect it to one of these:

- Email delivery service
- CRM
- Database
- Form backend such as Formspree, Basin, or HubSpot

Search this comment in `server.js`:

```js
// This starter keeps submissions local.
```

That is the place to add production email or CRM logic.

## Main files to edit

```text
pages/index.html              Home
pages/capabilities.html       Capabilities
pages/industries.html         Industries
pages/insights.html           Insights listing
pages/about.html              About
pages/contact.html            Contact form
public/css/styles.css         Main design system
public/js/main.js             Navigation, form, filters
public/assets/                Logo and SVG visuals
```

## Brand direction used

```text
Midnight Atlas with Clear Intelligence Panels
```

Design logic:

- Dark for atmosphere and authority
- Light for comprehension and trust
- Teal as the primary accent
- Cyan only for data energy and subtle highlights
- Amber reserved for rare human emphasis

## Production checklist

- Replace `hello@spatialxsolutions.com` with the correct email address.
- Connect the contact form to a real email or CRM destination.
- Add analytics only if needed.
- Add real legal copy for Privacy if analytics, cookies, or CRM tracking are added.
- Add real case studies when ready.
- Replace placeholder insight posts with final articles.
