# Vikalpa Chitra Artworks · Scalable Gallery

The gallery is data-driven. Artwork pages use one reusable template and `data/artworks.json`.

## Add an artwork
1. Add an image under `assets/images/`.
2. Add an MP3 under `assets/audio/`.
3. Add one object to `data/artworks.json`.
4. Commit/push the change.

## Permanent artwork URLs
`https://vamsikiranpaila.github.io/vikalpa_chitra_artworks/artwork/?id=VC-001`

When `vikalpachitra.com` is connected, the same structure becomes:
`https://vikalpachitra.com/artwork/?id=VC-001`

## Why this scales
You do NOT create a new HTML page for each artwork. There is one reusable artwork template. Adding 20, 50, or 100 works only adds data and media files.
