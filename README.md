# Drive Gallery

A client-side gallery for media stored in a Google Drive folder. It can run locally or as a public static site through GitHub Pages.

## Publish with GitHub Pages

1. Push this repository to GitHub using the `main` branch.
2. Open the repository's **Settings > Pages** page.
3. Set **Source** to **GitHub Actions**.
4. Push a commit or run the **Deploy Drive Gallery to GitHub Pages** workflow manually from the **Actions** tab.
5. Open the Pages URL shown by GitHub, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

The included workflow publishes the static files directly. No server or API key is stored in the repository.

## Run locally

1. Open the folder in a browser, or serve it locally:
   - `python -m http.server 3000`
2. Visit: http://127.0.0.1:3000/index.html

## Connect Google Drive

1. Create a Google Cloud OAuth client ID for a web application.
2. Add the exact site origin as an authorized JavaScript origin:
   - Local: `http://127.0.0.1:3000`
   - GitHub Pages: `https://YOUR-USERNAME.github.io`
3. If your app uses a repository path, also register the full Pages URL where Google requests an authorized redirect URI.
4. Enable the Google Drive API for the project.
5. Add the OAuth scope `https://www.googleapis.com/auth/drive.readonly` to the client.
6. Paste the client ID into the first input field.
7. Paste a Google Drive folder ID or share link into the third field.
8. Click Connect Drive.

> Private folders can only be viewed when the signed-in Google account has access to them. The app now uses authenticated Drive API requests so private files can be displayed without making the folder public.

## Features

- Modern Netflix-inspired gallery UI
- Hover playback for videos and GIFs without sound
- Click to open media in a full viewer
- Shuffle button
- Slideshow mode with exit control
- Grid, masonry, and list layouts
