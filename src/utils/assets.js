const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const serverOrigin = rawApiUrl.replace(/\/api\/?$/, '');

export function toAssetUrl(path = '') {
  if (!path) {
    return '';
  }

  if (path.startsWith('http')) {
    return path;
  }

  return `${serverOrigin}${path}`;
}
