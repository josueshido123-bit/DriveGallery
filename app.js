const DEFAULT_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com';
const DEFAULT_SLIDESHOW_SECONDS = 6;

const state = {
  accessToken: '',
  clientId: '',
  items: [],
  layout: 'grid',
  theme: 'midnight',
  currentIndex: 0,
  overviewOpen: false,
  slideshowActive: false,
  slideshowTimer: null,
  previewLoading: new Set(),
  viewerLoading: new Set(),
  viewerPlaying: false,
  viewerCloseTimer: null,
  pendingAction: null,
  pendingFolderId: '',
  tokenClient: null,
};

const elements = {
  connectBtn: document.getElementById('connectBtn'),
  pickFolderBtn: document.getElementById('pickFolderBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  slideshowBtn: document.getElementById('slideshowBtn'),
  statusCat: document.getElementById('statusCat'),
  progressTrack: document.querySelector('.progress-track'),
  progressFill: document.getElementById('progressFill'),
  layoutSelect: document.getElementById('layoutSelect'),
  themeSelect: document.getElementById('themeSelect'),
  clientIdInput: document.getElementById('clientIdInput'),
  folderInput: document.getElementById('folderInput'),
  gallery: document.getElementById('gallery'),
  viewerOverlay: document.getElementById('viewerOverlay'),
  viewerBody: document.getElementById('viewerBody'),
  closeViewerBtn: document.getElementById('closeViewerBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  exitSlideshowBtn: document.getElementById('exitSlideshowBtn'),
  statusText: document.getElementById('statusText'),
  debugText: document.getElementById('debugText'),
};

window.__driveGalleryState = state;
window.__driveGalleryRenderTest = (items) => {
  state.items = items;
  state.currentIndex = 0;
  renderGallery();
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setStatus(message, tone = 'info') {
  elements.statusText.textContent = message;
  elements.debugText.textContent = message;
  if (tone === 'error') {
    elements.statusText.style.background = 'rgba(255, 87, 87, 0.18)';
    elements.statusText.style.color = '#ffd2d2';
    elements.statusCat.classList.add('active');
    elements.progressTrack.classList.add('active');
    elements.progressFill.style.width = '100%';
  } else if (tone === 'success') {
    elements.statusText.style.background = 'rgba(44, 199, 255, 0.16)';
    elements.statusText.style.color = '#b8f0ff';
    elements.statusCat.classList.remove('active');
    elements.progressTrack.classList.remove('active');
    elements.progressFill.style.width = '100%';
  } else {
    elements.statusText.style.background = 'rgba(44, 199, 255, 0.16)';
    elements.statusText.style.color = '#b8f0ff';
    elements.statusCat.classList.add('active');
    elements.progressTrack.classList.add('active');
    elements.progressFill.style.width = '70%';
  }
}

function resetProgress() {
  elements.progressFill.style.width = '0%';
  elements.progressTrack.classList.remove('active');
}

function setDebug(message) {
  if (elements.debugText) {
    elements.debugText.textContent = message;
  }
}

function formatDate(value) {
  if (!value) return 'Recently added';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently added';
  }
}

function loadClientIdFromStorage() {
  const saved = localStorage.getItem('drive-gallery-client-id');
  if (saved) {
    elements.clientIdInput.value = saved;
    state.clientId = saved;
  } else {
    elements.clientIdInput.value = DEFAULT_CLIENT_ID;
  }
}

function saveDrivePreferences(folderId) {
  const normalizedFolderId = GalleryUtils.normalizeDriveFolderReference(folderId);
  if (normalizedFolderId) {
    localStorage.setItem('drive-gallery-folder-id', normalizedFolderId);
  }
  if (state.clientId) {
    localStorage.setItem('drive-gallery-client-id', state.clientId);
  }
}

function loadFolderFromStorage() {
  const savedFolder = localStorage.getItem('drive-gallery-folder-id');
  if (savedFolder) {
    elements.folderInput.value = savedFolder;
  }
}

function applyTheme(themeName) {
  state.theme = themeName;
  document.body.dataset.theme = themeName;
  localStorage.setItem('drive-gallery-theme', themeName);
}

function loadThemeFromStorage() {
  const savedTheme = localStorage.getItem('drive-gallery-theme') || 'midnight';
  elements.themeSelect.value = savedTheme;
  applyTheme(savedTheme);
}

function attachEvents() {
  elements.connectBtn.addEventListener('click', connectDrive);
  elements.pickFolderBtn.addEventListener('click', pickFolderFromDrive);
  elements.shuffleBtn.addEventListener('click', shuffleGallery);
  elements.slideshowBtn.addEventListener('click', toggleSlideshow);
  elements.layoutSelect.addEventListener('change', (event) => {
    state.layout = event.target.value;
    renderGallery();
  });
  elements.themeSelect.addEventListener('change', (event) => {
    applyTheme(event.target.value);
  });

  elements.closeViewerBtn.addEventListener('click', closeViewer);
  elements.prevBtn.addEventListener('click', () => changeViewer(-1));
  elements.nextBtn.addEventListener('click', () => changeViewer(1));
  elements.playPauseBtn.addEventListener('click', toggleViewerPlayback);
  elements.exitSlideshowBtn.addEventListener('click', stopSlideshow);
  elements.viewerBody.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-drive]');
    if (trigger) {
      const url = trigger.getAttribute('data-open-drive');
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  });
  elements.viewerOverlay.addEventListener('click', (event) => {
    if (event.target === elements.viewerOverlay) {
      closeViewer();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (state.overviewOpen && event.key === 'Escape') {
      closeViewer();
    }
    if (state.overviewOpen && event.key === 'ArrowRight') {
      changeViewer(1);
    }
    if (state.overviewOpen && event.key === 'ArrowLeft') {
      changeViewer(-1);
    }
  });
}

function createMediaItem(file) {
  const mediaType = GalleryUtils.getMediaType(file);
  return {
    ...file,
    mediaType,
    thumbnailUrl: GalleryUtils.buildDriveThumbnailUrl(file),
    previewUrl: '',
    viewerUrl: '',
  };
}

function addAuthHeaders(headers = {}, accept = 'application/json') {
  return {
    ...headers,
    Authorization: `Bearer ${state.accessToken}`,
    Accept: accept,
  };
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google auth script failed to load.'));
    document.head.appendChild(script);
  });
}

async function completeAuthWithToken(accessToken) {
  try {
    state.accessToken = accessToken;

    if (state.pendingAction === 'pickFolder') {
      await pickFolderFromDrive();
    } else if (state.pendingFolderId) {
      saveDrivePreferences(state.pendingFolderId);
      await loadFolderFiles(state.pendingFolderId);
    }

    state.pendingAction = null;
    state.pendingFolderId = '';
    return true;
  } catch (error) {
    setStatus(error.message, 'error');
    setDebug(error.message);
    return false;
  }
}

async function connectDrive() {
  const clientId = elements.clientIdInput.value.trim();
  const folderInputValue = elements.folderInput.value.trim();
  const folderId = GalleryUtils.normalizeDriveFolderReference(folderInputValue);

  if (!clientId || clientId === DEFAULT_CLIENT_ID) {
    setStatus('Add your Google OAuth client ID to enable Drive authentication.', 'error');
    return;
  }

  const shouldPickFolder = !folderId;
  state.pendingAction = shouldPickFolder ? 'pickFolder' : 'loadFolder';
  state.pendingFolderId = folderId;

  try {
    resetProgress();
    state.clientId = clientId;
    setStatus('Opening Google sign-in…');

    await loadGoogleScript();
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services did not load.');
    }

    if (!state.tokenClient) {
      state.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        include_granted_scopes: true,
        prompt: 'select_account',
        callback: async (response) => {
          if (response.error) {
            const message = response.error === 'access_denied'
              ? 'Google blocked the sign-in because the OAuth app is not fully verified for external users yet. Add your Google account as a test user or complete OAuth verification.'
              : `Google sign-in failed: ${response.error}`;
            setStatus(message, 'error');
            setDebug(message);
            return;
          }

          if (!response.access_token) {
            setStatus('Google sign-in returned no access token.', 'error');
            setDebug('Google sign-in returned no access token.');
            return;
          }

          await completeAuthWithToken(response.access_token);
        },
      });
    }

    setDebug('Using Google popup token flow.');
    state.tokenClient.requestAccessToken();
  } catch (error) {
    elements.progressFill.style.width = '100%';
    setStatus(error.message, 'error');
    setDebug(error.message);
  }
}

async function loadGooglePickerApi() {
  if (window.google?.picker && window.gapi?.client) {
    return;
  }

  if (!window.gapi) {
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google API script failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google API script failed to load.'));
      document.head.appendChild(script);
    });
  }

  await new Promise((resolve, reject) => {
    window.gapi.load('picker', {
      callback: () => resolve(),
      onerror: () => reject(new Error('Google Picker failed to initialize.')),
    });
  });

  if (!window.gapi.client) {
    await new Promise((resolve, reject) => {
      window.gapi.load('client', {
        callback: () => resolve(),
        onerror: () => reject(new Error('Google client library failed to initialize.')),
      });
    });
  }

  if (!window.gapi.client.getToken()) {
    window.gapi.client.setToken({ access_token: state.accessToken });
  }

  if (!window.gapi.client.drive) {
    await window.gapi.client.init({
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
  }
}

async function pickFolderFromDrive() {
  if (!state.accessToken) {
    state.pendingAction = 'pickFolder';
    state.pendingFolderId = '';
    await connectDrive();
    return;
  }

  try {
    await loadGoogleScript();
    await loadGooglePickerApi();

    const picker = new window.google.picker.PickerBuilder()
      .addView(new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true))
      .setOAuthToken(state.accessToken)
      .setCallback(handleFolderSelection)
      .build();

    picker.setVisible(true);
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function handleFolderSelection(data) {
  if (data.action === window.google.picker.Action.PICKED) {
    const folder = data.docs?.[0];
    if (!folder?.id) {
      setStatus('No folder was selected.', 'error');
      return;
    }

    const folderId = folder.id;
    elements.folderInput.value = folderId;
    saveDrivePreferences(folderId);
    void loadFolderFiles(folderId);
  } else if (data.action === window.google.picker.Action.CANCEL) {
    setStatus('Folder selection cancelled.', 'info');
  }
}

async function loadFolderFiles(folderId) {
  setStatus('Loading your Drive folder…');
  elements.progressFill.style.width = '40%';

  try {
    const files = await loadFolderFilesViaDriveApi(folderId);
    const mediaFiles = (files || [])
      .map(createMediaItem)
      .filter((item) => item.mediaType !== 'other' || item.name);

    if (state.items.length) {
      state.items.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    }

    const hydratedItems = mediaFiles.map((item) => ({
      ...item,
      previewUrl: item.mediaType === 'video' ? '' : item.thumbnailUrl,
      viewerUrl: '',
    }));
    state.items = hydratedItems;
    state.currentIndex = 0;
    renderGallery();
    void preloadVideoPreviews(hydratedItems);
    void preloadViewerImages(hydratedItems);

    if (hydratedItems.length > 0) {
      elements.gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setDebug(`Loaded ${hydratedItems.length} supported items; ${state.items.filter((item) => item.previewUrl).length} with previews`);
    if (hydratedItems.length === 0) {
      elements.progressFill.style.width = '100%';
      setStatus('No supported media files were found in that folder.', 'error');
    } else {
      elements.progressFill.style.width = '100%';
      setStatus(`Loaded ${hydratedItems.length} media items from your Drive folder.`, 'success');
    }
  } catch (error) {
    elements.progressFill.style.width = '100%';
    setStatus(error.message, 'error');
    setDebug(error.message);
  }
}

async function loadFolderFilesViaDriveApi(folderId) {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,size,webViewLink,thumbnailLink,webContentLink)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000`;

  const response = await fetch(url, {
    headers: addAuthHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Drive request failed (${response.status})`;
    setDebug(`Folder list failed: ${response.status} ${text}`);
    if (response.status === 401 || response.status === 403) {
      message = 'Google Drive access was denied. Make sure the signed-in account has access to the folder and that the Drive API is enabled.';
    } else if (response.status === 404) {
      message = 'The folder or file could not be found.';
    } else if (text) {
      message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  const result = await response.json();
  setDebug(`Folder list response: ${result.files?.length || 0} items`);
  if (Array.isArray(result.files) && result.files.length > 0) {
    return result.files;
  }

  if (window.gapi?.client?.drive) {
    await window.gapi.client.setToken({ access_token: state.accessToken });
    const gapiResponse = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id,name,mimeType,createdTime,size,webViewLink,thumbnailLink,webContentLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1000,
      orderBy: 'createdTime desc',
    });
    const gapiFiles = gapiResponse.result.files || [];
    setDebug(`Google client fallback found ${gapiFiles.length} items`);
    if (gapiFiles.length > 0) {
      return gapiFiles;
    }
  }

  return [];
}

async function loadDriveMediaUrl(item) {
  if (!item?.id) return '';

  const thumbnailUrl = GalleryUtils.buildDriveThumbnailUrl(item);
  if (item.mediaType !== 'video') {
    return thumbnailUrl;
  }

  if (!state.accessToken) {
    return '';
  }

  try {
    const response = await fetch(GalleryUtils.buildPreviewUrl(item), {
      headers: addAuthHeaders({}, '*/*'),
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${item.name}: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    return '';
  }
}

async function loadFullMediaUrl(item) {
  if (!item?.id || !state.accessToken) return '';

  try {
    const response = await fetch(GalleryUtils.buildPreviewUrl(item), {
      headers: addAuthHeaders({}, '*/*'),
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${item.name}: ${response.status}`);
    }

    return URL.createObjectURL(await response.blob());
  } catch (error) {
    console.error(error);
    return '';
  }
}

async function loadVideoPreview(index, card = null, rerenderViewer = false) {
  const item = state.items[index];
  if (!item || item.mediaType !== 'video' || item.previewUrl || state.previewLoading.has(item.id)) return;

  state.previewLoading.add(item.id);
  try {
    const previewUrl = await loadDriveMediaUrl(item);
    const currentIndex = state.items.findIndex((entry) => entry.id === item.id);
    if (currentIndex >= 0 && previewUrl) {
      state.items[currentIndex] = { ...state.items[currentIndex], previewUrl };
      const targetCard = card || elements.gallery.querySelector(`.tile-card[data-index="${currentIndex}"]`);
      updateGalleryCard(currentIndex);
      if (targetCard?.matches(':hover')) {
        targetCard.querySelector('video')?.play().catch(() => {});
      }
      if (rerenderViewer && state.currentIndex === currentIndex) renderViewer();
    }
  } catch (error) {
    console.error(error);
  } finally {
    state.previewLoading.delete(item.id);
  }
}

async function preloadVideoPreviews(items) {
  const videoIndexes = items
    .map((item, index) => (item.mediaType === 'video' ? index : -1))
    .filter((index) => index >= 0);
  let nextIndex = 0;

  async function loadNext() {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= videoIndexes.length) return;
    await loadVideoPreview(videoIndexes[index]);
    await loadNext();
  }

  await Promise.all([loadNext(), loadNext()]);
}

async function loadViewerMedia(index) {
  const item = state.items[index];
  if (!item || item.mediaType === 'video' || item.viewerUrl || state.viewerLoading.has(item.id)) return;

  state.viewerLoading.add(item.id);
  try {
    const viewerUrl = await loadFullMediaUrl(item);
    if (!viewerUrl || state.items[index]?.id !== item.id) return;

    state.items[index] = { ...state.items[index], viewerUrl };
    if (state.currentIndex === index && state.overviewOpen) {
      renderViewer();
    }
  } finally {
    state.viewerLoading.delete(item.id);
  }
}

async function preloadViewerImages(items) {
  const imageIndexes = items
    .map((item, index) => (item.mediaType === 'video' ? -1 : index))
    .filter((index) => index >= 0);
  let nextIndex = 0;

  async function loadNext() {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= imageIndexes.length) return;
    await loadViewerMedia(imageIndexes[index]);
    await loadNext();
  }

  await Promise.all([loadNext(), loadNext(), loadNext()]);
}

async function loadDriveViewerUrl(item) {
  if (!item?.id) return '';

  if (item.mediaType === 'video') {
    return '';
  }

  return '';
}

function renderMediaMarkup(item) {
  if (!item.previewUrl) {
    if (item.thumbnailUrl) {
      return `<img src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" />`;
    }

    const kind = item.mediaType === 'video' ? 'Video' : 'Image';
    return `
      <div class="media-placeholder">
        <span>${escapeHtml(item.name)}</span>
        <small>${escapeHtml(kind)}</small>
      </div>
    `;
  }

  if (item.mediaType === 'video') {
    const poster = item.thumbnailUrl ? ` poster="${escapeHtml(item.thumbnailUrl)}"` : '';
    return `<video src="${item.previewUrl}"${poster} preload="metadata" muted loop playsinline></video>`;
  }

  return `<img src="${item.previewUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />`;
}

function bindVideoHover(card) {
  const index = Number(card.dataset.index || 0);
  const item = state.items[index];
  if (item?.mediaType !== 'video' || card.dataset.hoverBound === 'true') return;

  card.dataset.hoverBound = 'true';
  card.addEventListener('pointerenter', () => {
    const video = card.querySelector('video');
    if (video) {
      video.play().catch(() => {});
    } else {
      void loadVideoPreview(index, card);
    }
  });
  card.addEventListener('pointerleave', () => {
    const video = card.querySelector('video');
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  });
}

function bindCardEvents(card) {
  card.addEventListener('click', () => {
    const index = Number(card.dataset.index || 0);
    openViewer(index);
  });
  bindVideoHover(card);
}

function updateGalleryCard(index) {
  const card = elements.gallery.querySelector(`.tile-card[data-index="${index}"]`);
  const artwork = card?.querySelector('.artwork');
  const item = state.items[index];
  if (!card || !artwork || !item) return;

  artwork.innerHTML = renderMediaMarkup(item);
  bindVideoHover(card);
}

function renderGallery() {
  try {
    console.log('renderGallery start', { count: state.items.length, layout: state.layout, container: Boolean(elements.gallery) });
    if (!elements.gallery) {
      console.error('Gallery container is missing');
      return;
    }

    elements.gallery.className = `gallery ${state.layout}`;
    if (!state.items.length) {
      elements.gallery.innerHTML = `
        <div class="empty-state">
          <div>
            <h2>No media yet</h2>
            <p>Connect a Google Drive folder to fill this gallery with videos, images, and GIFs.</p>
          </div>
        </div>
      `;
      return;
    }

    const cardsMarkup = state.items
      .map((item, index) => {
        const mediaMarkup = renderMediaMarkup(item);
        return `
          <article class="tile-card" data-index="${index}" data-item-id="${escapeHtml(item.id || '')}">
            <div class="artwork">
              ${mediaMarkup}
            </div>
            <div class="card-meta">
              <h3>${escapeHtml(item.name)}</h3>
              <p>${formatDate(item.createdTime)}</p>
            </div>
          </article>
        `;
      })
      .join('');

    elements.gallery.innerHTML = cardsMarkup;
    console.log('renderGallery inserted cards', { count: state.items.length, markupLength: cardsMarkup.length });

    elements.gallery.querySelectorAll('.tile-card').forEach((card) => {
      bindCardEvents(card);
    });
  } catch (error) {
    console.error('renderGallery failed', error);
    if (elements.gallery) {
      elements.gallery.innerHTML = `
        <div class="empty-state">
          <div>
            <h2>Render failed</h2>
            <p>${escapeHtml(error.message || 'Unknown error')}</p>
          </div>
        </div>
      `;
    }
  }
}

function animateGalleryReorder(previousPositions) {
  elements.gallery.querySelectorAll('.tile-card').forEach((card) => {
    const itemId = card.dataset.itemId;
    const previous = previousPositions.get(itemId);
    if (!previous) return;

    const current = card.getBoundingClientRect();
    const deltaX = previous.left - current.left;
    const deltaY = previous.top - current.top;
    if (!deltaX && !deltaY) return;

    card.animate([
      { transform: `translate(${deltaX}px, ${deltaY}px)` },
      { transform: 'translate(0, 0)' },
    ], {
      duration: 460,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  });
}

function openViewer(index) {
  if (!state.items.length) return;
  state.currentIndex = (index + state.items.length) % state.items.length;
  window.clearTimeout(state.viewerCloseTimer);
  renderViewer();
  elements.viewerOverlay.classList.remove('closing');
  elements.viewerOverlay.classList.add('active');
  elements.viewerOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  state.overviewOpen = true;
  if (state.items[state.currentIndex]?.mediaType === 'video' && !state.items[state.currentIndex].previewUrl) {
    void loadVideoPreview(state.currentIndex, null, true);
  } else {
    void loadViewerMedia(state.currentIndex);
  }
}

function renderViewer(direction = 1) {
  const item = state.items[state.currentIndex];
  if (!item) return;

  const mediaUrl = item.viewerUrl || item.previewUrl;
  const openInDriveUrl = item.webViewLink || item.webContentLink || '';
  const content = item.mediaType === 'video'
    ? `<div class="viewer-content viewer-transition-${direction < 0 ? 'prev' : 'next'}">
        <video controls autoplay muted playsinline src="${mediaUrl}"></video>
        ${openInDriveUrl ? `<button class="secondary viewer-open-link" data-open-drive="${escapeHtml(openInDriveUrl)}">Open in Drive</button>` : ''}
      </div>`
    : `<div class="viewer-content viewer-transition-${direction < 0 ? 'prev' : 'next'}">
        <img src="${mediaUrl}" alt="${escapeHtml(item.name)}" />
        ${openInDriveUrl ? `<button class="secondary viewer-open-link" data-open-drive="${escapeHtml(openInDriveUrl)}">Open in Drive</button>` : ''}
      </div>`;

  elements.viewerBody.innerHTML = content;
  const media = elements.viewerBody.querySelector(item.mediaType === 'video' ? 'video' : 'img');
  if (item.mediaType === 'video') {
    media.addEventListener('ended', () => {
      if (state.slideshowActive) {
        showNextSlideshowItem();
      }
    });
    media.addEventListener('play', () => {
      state.viewerPlaying = true;
      elements.playPauseBtn.textContent = 'Pause';
    });
    media.addEventListener('pause', () => {
      state.viewerPlaying = false;
      elements.playPauseBtn.textContent = 'Play';
    });
  }
}

function closeViewer() {
  elements.viewerOverlay.classList.remove('active');
  elements.viewerOverlay.classList.add('closing');
  elements.viewerOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  state.overviewOpen = false;
  state.viewerCloseTimer = window.setTimeout(() => {
    elements.viewerOverlay.classList.remove('closing');
  }, 260);
  if (state.slideshowActive) {
    elements.playPauseBtn.textContent = 'Pause';
  }
}

function toggleViewerPlayback() {
  const media = elements.viewerBody.querySelector('video');
  if (!media) return;
  if (media.paused) {
    media.play().catch(() => {});
  } else {
    media.pause();
  }
}

function changeViewer(direction) {
  if (!state.items.length) return;
  state.currentIndex = (state.currentIndex + direction + state.items.length) % state.items.length;
  renderViewer(direction);
  const item = state.items[state.currentIndex];
  if (item?.mediaType === 'video' && !item.previewUrl) {
    void loadVideoPreview(state.currentIndex, null, true);
  } else {
    void loadViewerMedia(state.currentIndex);
  }
}

function shuffleGallery() {
  if (!state.items.length) return;
  state.items = GalleryUtils.shuffleItems(state.items);
  const previousPositions = new Map(
    [...elements.gallery.querySelectorAll('.tile-card')].map((card) => [card.dataset.itemId, card.getBoundingClientRect()]),
  );
  state.currentIndex = 0;
  if (state.overviewOpen) {
    renderViewer();
  }
  renderGallery();
  animateGalleryReorder(previousPositions);
  setStatus('Gallery shuffled.', 'success');
}

function toggleSlideshow() {
  if (!state.items.length) return;
  if (state.slideshowActive) {
    stopSlideshow();
    return;
  }

  state.slideshowActive = true;
  elements.slideshowBtn.textContent = 'Stop Slideshow';
  setStatus('Slideshow started.', 'success');
  if (!state.overviewOpen) {
    openViewer(state.currentIndex);
  } else {
    renderViewer();
  }
  advanceSlideshow();
}

function showNextSlideshowItem() {
  state.currentIndex = (state.currentIndex + 1) % state.items.length;
  renderViewer(1);
  const nextItem = state.items[state.currentIndex];
  if (nextItem?.mediaType === 'video' && !nextItem.previewUrl) {
    void loadVideoPreview(state.currentIndex, null, true);
  } else {
    void loadViewerMedia(state.currentIndex);
  }
  advanceSlideshow();
}

function advanceSlideshow() {
  if (!state.slideshowActive || !state.items.length) return;
  clearTimeout(state.slideshowTimer);
  if (state.items[state.currentIndex]?.mediaType === 'video') return;

  const delay = DEFAULT_SLIDESHOW_SECONDS * 1000;
  state.slideshowTimer = window.setTimeout(() => {
    if (state.slideshowActive) showNextSlideshowItem();
  }, delay);
}

function stopSlideshow() {
  clearTimeout(state.slideshowTimer);
  state.slideshowActive = false;
  elements.slideshowBtn.textContent = 'Start Slideshow';
  setStatus('Slideshow stopped.', 'success');
}

async function restorePreviousSession() {
  const savedFolder = localStorage.getItem('drive-gallery-folder-id');
  const savedClientId = localStorage.getItem('drive-gallery-client-id');

  if (!savedClientId || !savedFolder) {
    return;
  }

  elements.folderInput.value = savedFolder;
  elements.clientIdInput.value = savedClientId;
  state.clientId = savedClientId;
  setStatus('Restoring your last Drive folder…');
  await connectDrive();
}

function init() {
  console.log('init start', { galleryPresent: Boolean(document.getElementById('gallery')) });
  loadClientIdFromStorage();
  loadFolderFromStorage();
  loadThemeFromStorage();
  attachEvents();
  renderGallery();
  void restorePreviousSession();
}

document.addEventListener('DOMContentLoaded', init);
