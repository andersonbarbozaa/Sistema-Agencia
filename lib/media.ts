import { MediaType } from '@/types';

export function detectMediaType(url: string): MediaType {
  if (!url) return 'other';
  const cleanUrl = url.toLowerCase().trim();

  // Video platforms
  if (
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('youtu.be') ||
    cleanUrl.includes('vimeo.com') ||
    cleanUrl.includes('loom.com') ||
    cleanUrl.includes('tiktok.com') ||
    /\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i.test(cleanUrl)
  ) {
    return 'video';
  }

  // Images
  if (
    /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.includes('images.unsplash.com') ||
    cleanUrl.includes('imgur.com') ||
    cleanUrl.includes('cdn.discordapp.com/attachments') ||
    cleanUrl.startsWith('data:image')
  ) {
    return 'image';
  }

  // Google Drive files: por padrão em agências são entregáveis visuais (imagem) a menos que explicitamente vídeo
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('/file/d/')) {
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i.test(cleanUrl) || cleanUrl.includes('video')) {
      return 'video';
    }
    return 'image';
  }

  // Documents
  if (
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.includes('docs.google.com/document') ||
    cleanUrl.includes('docs.google.com/spreadsheets') ||
    cleanUrl.includes('docs.google.com/presentation') ||
    cleanUrl.includes('notion.so')
  ) {
    return 'document';
  }

  return 'other';
}

export function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const match =
    cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function getEmbedInfo(url: string, mediaType: MediaType): {
  embedUrl: string | null;
  isIframe: boolean;
  canEmbed: boolean;
} {
  if (!url) return { embedUrl: null, isIframe: false, canEmbed: false };
  const cleanUrl = url.trim();

  // YouTube (supports watch?v=, youtu.be/, embed/, shorts/, live/, m.youtube, and query params)
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|(?:[a-zA-Z0-9-]+\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|(?:.*[?&]v=)))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Instagram Reels and Posts
  const igMatch = cleanUrl.match(/instagram\.com\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return {
      embedUrl: `https://www.instagram.com/reel/${igMatch[1]}/embed`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // TikTok video
  const ttMatch = cleanUrl.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (ttMatch && ttMatch[1]) {
    return {
      embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Dropbox direct streaming
  if (cleanUrl.includes('dropbox.com')) {
    const rawDropbox = cleanUrl.replace(/[?&]dl=0/, '').replace(/[?&]dl=1/, '');
    const sep = rawDropbox.includes('?') ? '&' : '?';
    return {
      embedUrl: `${rawDropbox}${sep}raw=1`,
      isIframe: false,
      canEmbed: true,
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Loom
  const loomMatch = cleanUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch && loomMatch[1]) {
    return {
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Google Drive file preview (imagens, vídeos e documentos)
  const gDriveId = getGoogleDriveFileId(cleanUrl);
  if (gDriveId) {
    return {
      embedUrl: `https://drive.google.com/file/d/${gDriveId}/preview`,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Direct video file (.mp4, .webm, .mov, .m4v, .ogv, data:video, blob:) or explicit video mediaType
  const isDirectVideo =
    mediaType === 'video' ||
    /\.(mp4|webm|mov|m4v|ogv|avi|mkv)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.startsWith('data:video') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.includes('firebasestorage.googleapis.com') ||
    (cleanUrl.includes('cloudinary.com') && cleanUrl.includes('/video/'));

  if (isDirectVideo) {
    return {
      embedUrl: cleanUrl,
      isIframe: false,
      canEmbed: true,
    };
  }

  // Direct image
  if (mediaType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('data:image')) {
    return {
      embedUrl: cleanUrl,
      isIframe: false,
      canEmbed: true,
    };
  }

  // PDF direct view in iframe
  if (/\.pdf(\?.*)?$/i.test(cleanUrl)) {
    return {
      embedUrl: cleanUrl,
      isIframe: true,
      canEmbed: true,
    };
  }

  // Default: check if generic document or other external link that might block iframe
  return {
    embedUrl: null,
    isIframe: false,
    canEmbed: false,
  };
}
