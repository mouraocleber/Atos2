import { Paths, Directory, File } from 'expo-file-system';
import { SERVER_URL } from './api';

// Verifica se os componentes modernos do expo-file-system estão disponíveis no ambiente atual
const isModernFsSupported = () => {
  return typeof Paths !== 'undefined' && typeof Directory !== 'undefined' && typeof File !== 'undefined';
};

// expo-file-system SDK 55: usa Paths.document em vez de documentDirectory
const getCacheDir = (): string => {
  try {
    if (isModernFsSupported() && Paths.document) {
      return new Directory(Paths.document, 'media_cache').uri;
    }
  } catch (err) {
    console.warn('[MediaCacheService] Failed to get cache directory path:', err);
  }
  return 'file:///media_cache/';
};

const CACHE_DIR = getCacheDir();

// Inicializa o diretório de cache com detecção de corrupção
const initCacheDir = async () => {
  if (!isModernFsSupported() || !Paths.document) return;
  try {
    const dir = new Directory(Paths.document, 'media_cache');
    if (dir.exists) {
      try {
        dir.list(); // Tenta listar a pasta para testar se é um diretório válido
      } catch {
        // Se falhar ao listar, significa que o caminho é um arquivo comum. Deleta e recria como diretório!
        dir.delete();
        dir.create();
      }
    } else {
      dir.create();
    }
  } catch (err) {
    console.error('Error initializing cache dir:', err);
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

  // Se a nova API de arquivos não for suportada (ex: web ou ambiente sem New Architecture), retorna a URL original
  if (!isModernFsSupported() || !Paths.document) {
    return fullUrl;
  }

  const filename = getFilenameFromUrl(fullUrl);

  try {
    await initCacheDir();
    const cacheDir = new Directory(Paths.document, 'media_cache');
    const cacheFile = new File(cacheDir, filename);

    if (cacheFile.exists) {
      return cacheFile.uri;
    }

    // Não existe, vamos baixar e salvar na memória física
    const downloaded = await File.downloadFileAsync(fullUrl, cacheFile);
    return downloaded.uri;
  } catch (err) {
    console.error('Error caching media: ', err);
    return fullUrl; // Fallback pra rede
  }
};

export const clearMediaCache = async () => {
  if (!isModernFsSupported() || !Paths.document) return false;
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
  if (!isModernFsSupported() || !Paths.document) return 0;
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

