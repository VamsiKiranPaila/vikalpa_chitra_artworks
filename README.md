# Vikalpa Chitra Artworks · Scalable Gallery

This gallery is data-driven and offline-friendly. Artwork details live in `data/artworks.js`, while `artwork/index.html` is a single reusable artwork template.

## Add artwork
1. Add the artwork image under `assets/images/`.
2. Add the artist voice recording under `assets/audio/`.
3. Add one artwork object to `data/artworks.js`.
4. Commit the change. GitHub Pages republishes automatically.

## Artwork URLs
Online project-site pattern:
`https://vamsikiranpaila.github.io/vikalpa_chitra_artworks/artwork/?id=VC-001`

Planned custom-domain pattern:
`https://vikalpachitra.com/artwork/?id=VC-001`

The artwork ID stays the same when the image, story or voice recording is updated, so printed QR codes can remain valid.

## Offline
The catalog is loaded from a local JavaScript file rather than fetching remote data, so the static files can be opened locally. Visitor phones scanning QR codes still need a local Wi-Fi/server setup when there is no internet.

## Scale
There is one artwork template, not one HTML file per painting. 20, 50, or 100+ artworks are added as data and media rather than new page templates.