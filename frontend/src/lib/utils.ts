import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes and formats asset paths into browser-loadable URLs.
 * Handles Windows absolute paths, relative upload paths, and prepends
 * the backend API host when configured in production.
 */
export function formatAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const backendBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

  if (path.startsWith('/uploads/')) {
    return backendBase ? `${backendBase}${path}` : path;
  }

  const match = path.match(/[/\\]uploads[/\\](.+)$/i);
  if (match) {
    const cleanRel = `/uploads/${match[1].replace(/\\/g, '/')}`;
    return backendBase ? `${backendBase}${cleanRel}` : cleanRel;
  }

  return path;
}

