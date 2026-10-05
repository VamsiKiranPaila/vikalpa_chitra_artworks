# Vikalpa Chitra Artworks

A mobile-first digital gallery with a private browser-based artwork manager.

## Architecture

- GitHub Pages hosts the HTML/CSS/JavaScript application.
- Supabase stores artwork text, publication status, images and voice recordings.
- `artwork/index.html` is one reusable artwork template.
- `assets/js/app.js` reads published artworks from Supabase when configured.
- `data/artworks.js` remains as a local fallback/demo catalog.

This means adding or editing an artwork does **not** require changing HTML or committing artwork data to GitHub.

## Private artwork manager

Open:

`https://vamsikiranpaila.github.io/vikalpa_chitra_artworks/admin/`

The manager supports:
- Add/edit/delete artwork
- Upload artwork image
- Upload voice note
- Record a voice note directly in the browser
- Publish/unpublish
- Feature/unfeature
- Permanent artwork IDs such as VC-001

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-setup.sql`.
3. In Supabase Authentication, create your admin user with email/password.
4. Copy your Supabase Project URL and **anon/publishable key** into `assets/js/config.js`.
5. Never put the `service_role` key in the website.

Example:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_OR_PUBLISHABLE_KEY"
};
```

The website uses Row Level Security so the public can only read published artworks, while signed-in admins manage the archive.

## Artwork URL

Project URL:

`https://vamsikiranpaila.github.io/vikalpa_chitra_artworks/artwork/?id=VC-001`

Planned custom-domain URL:

`https://vikalpachitra.com/artwork/?id=VC-001`

Keep the artwork ID permanent once a QR code has been printed.

## Offline note

The public gallery can fall back to the local demo catalog, and the source files can be kept as an offline copy. Real Supabase content requires internet access. For an exhibition with no internet, we can add an exportable offline package or local Wi-Fi gallery in a later step.
