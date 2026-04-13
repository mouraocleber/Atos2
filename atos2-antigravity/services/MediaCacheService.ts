import { Paths, Directory, File } from 'expo-file-system';
import { SERVER_URL } from './api';

// expo-file-system SDK 55: usa Paths.document em vez de documentDirectory
const getCacheDir = (): string => {
  try {
    return new Directory(Paths.document, 'media_cache').uri;
  } catch {
    return 'file:///media_cache/';
  }
};

const CACHE_DIR = getCacheDir();

// Inicializa o diretório de cache
const initCacheDir = async () => {
  const dir = new Directory(Paths.document, 'media_cache');
  if (!dir.exists) {
    dir.create();
  }
};

// Formata uma URL relativa para absoluta se necessário
export const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('file://')) {
    return url;
  }
  return url.startsWith('/') ? `${SERVER_URL}${url}` : `${SERVER_URL}/${url}`;
};

// Gera um nome de arquivo seguro a partir da URL
const getFilenameFromUrl = (url: string) => {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  const urlSafe = url.replace(/[^a-zA-Z0-9]/g, '_');
  return urlSafe.slice(-50) + '_' + lastPart;
};

export const getCachedMedia = async (originalUrl: string): Promise<string> => {
  if (!originalUrl) return '';

  // Se já for uma file local, não precisa de cache
  if (originalUrl.startsWith('file://') || originalUrl.startsWith('content://')) {
    return originalUrl;
  }

  const fullUrl = getFullUrl(originalUrl);
  const filename = getFilenameFromUrl(fullUrl);

  try {
    await initCacheDir();
    const cacheFile = new File(Paths.document, 'media_cache', filename);

    if (cacheFile.exists) {
      return cacheFile.uri;
    }

    // Não existe, vamos baixar e salvar na memória física
    const downloaded = await File.downloadFileAsync(fullUrl, new Directory(Paths.document, 'media_cache'));
    return downloaded.uri;
  } catch (err) {
    console.error('Error caching media: ', err);
    return fullUrl; // Fallback pra rede
  }
};

export const clearMediaCache = async () => {
  try {
    const dir = new Directory(Paths.document, 'media_cache');
    if (dir.exists) {
      dir.delete();
    }
    dir.create();
    return true;
  } catch (err) {
    console.error('Error clearing media cache:', err);
    return false;
  }
};

export const getMediaCacheSize = async (): Promise<number> => {
  try {
    const dir = new Directory(Paths.document, 'media_cache');
    if (!dir.exists) return 0;

    let totalSize = 0;
    const items = dir.list();
    for (const item of items) {
      if (item instanceof File) {
        totalSize += item.size ?? 0;
      }
    }
    return totalSize;
  } catch (err) {
    console.error('Error getting cache size:', err);
    return 0;
  }
};
