import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';

// Garantir que as subpastas de tipos de mídia existam
const mediaDirs = {
  image: path.join(uploadDir, 'images'),
  video: path.join(uploadDir, 'videos'),
  audio: path.join(uploadDir, 'audios'),
};

Object.values(mediaDirs).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES: Record<string, string> = {
  // Imagens
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
  'image/heic': 'images',
  // Vídeos
  'video/mp4': 'videos',
  'video/quicktime': 'videos',
  'video/webm': 'videos',
  'video/3gpp': 'videos',
  // Áudios
  'audio/mpeg': 'audios',
  'audio/mp4': 'audios',
  'audio/m4a': 'audios',
  'audio/wav': 'audios',
  'audio/ogg': 'audios',
  'audio/webm': 'audios',
  'audio/x-m4a': 'audios',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = ALLOWED_MIME_TYPES[file.mimetype] || '.';
    const dest = path.join(uploadDir, subfolder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || getExtFromMime(file.mimetype);
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/heic': '.heic',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
    'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/m4a': '.m4a',
    'audio/wav': '.wav', 'audio/ogg': '.ogg', 'audio/x-m4a': '.m4a',
  };
  return map[mime] || '.bin';
}

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // Padrão 50MB
  },
});
