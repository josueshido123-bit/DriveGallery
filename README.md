# Drive Gallery

A local, modern gallery for media stored in a Google Drive folder.

## Run locally

1. Open the folder in a browser, or serve it locally:
   - `python -m http.server 3000`
2. Visit: http://127.0.0.1:3000/index.html

## Connect Google Drive

1. Create a Google Cloud OAuth client ID for a web application.
2. Add `http://127.0.0.1:3000` as an authorized JavaScript origin.
3. Enable the Google Drive API for the project.
4. Add the OAuth scope `https://www.googleapis.com/auth/drive.readonly` to the client.
5. Paste the client ID into the first input field.
6. Paste a Google Drive folder ID or share link into the second field.
7. Click Connect Drive.

> Private folders can only be viewed when the signed-in Google account has access to them. The app now uses authenticated Drive API requests so private files can be displayed without making the folder public.

## Features

- Modern Netflix-inspired gallery UI
- Hover playback for videos and GIFs without sound
- Click to open media in a full viewer
- Shuffle button
- Slideshow mode with exit control
- Grid, masonry, and list layouts
