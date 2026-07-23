(function (global) {
  function getMediaType(item) {
    if (!item || !item.name) return 'other';
    const name = item.name.toLowerCase();
    const mimeType = (item.mimeType || '').toLowerCase();
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif' || name.endsWith('.gif')) return 'gif';
    if (mimeType.startsWith('image/')) return 'image';

    const extension = (name.split('.').pop() || '').toLowerCase();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'tiff', 'tif'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp', 'mpeg', 'mpg'];

    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    if (name.includes('.jpg') || name.includes('.jpeg') || name.includes('.png') || name.includes('.gif') || name.includes('.mp4') || name.includes('.mov')) {
      return name.includes('.mp4') || name.includes('.mov') ? 'video' : 'image';
    }
    return 'other';
  }

  function shuffleItems(items) {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function parseFolderId(rawValue) {
    const value = (rawValue || '').trim();
    if (!value) return '';

    const folderMatch = value.match(/\/folders\/([^/?#]+)/i);
    if (folderMatch) return folderMatch[1];

    const idMatch = value.match(/[?&]id=([^&#]+)/i);
    if (idMatch) return idMatch[1];

    return value;
  }

  function normalizeDriveFolderReference(rawValue) {
    return parseFolderId(rawValue);
  }

  function buildPreviewUrl(item) {
    if (!item || !item.id) return '';
    return buildDriveMediaRequestUrl(item.id);
  }

  function buildDriveMediaRequestUrl(fileId) {
    if (!fileId) return '';
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  }

  function buildDriveThumbnailUrl(item) {
    if (!item) return '';
    return item.thumbnailLink || item.webContentLink || '';
  }

  function buildDriveVideoUrl(item) {
    if (!item) return '';
    if (item.webContentLink) {
      return item.webContentLink;
    }
    if (item.thumbnailLink) {
      return item.thumbnailLink;
    }
    return buildPreviewUrl(item);
  }

  function normalizeRedirectUri(redirectUri, location) {
    if (redirectUri) {
      try {
        const parsed = new URL(redirectUri);
        return parsed.toString().replace(/\/$/, '');
      } catch {
        return redirectUri;
      }
    }

    const origin = location?.origin || '';
    const pathname = location?.pathname || '/';
    const cleanedPath = pathname.replace(/\/index\.html?$/i, '');
    const hasTrailingSlash = pathname.endsWith('/') && cleanedPath !== '';

    if (!cleanedPath || cleanedPath === '/') {
      return `${origin}/`;
    }

    return `${origin}${cleanedPath}${hasTrailingSlash ? '/' : ''}`;
  }

  const api = {
    getMediaType,
    shuffleItems,
    parseFolderId,
    normalizeDriveFolderReference,
    buildPreviewUrl,
    buildDriveMediaRequestUrl,
    buildDriveThumbnailUrl,
    buildDriveVideoUrl,
    normalizeRedirectUri,
  };

  global.GalleryUtils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
