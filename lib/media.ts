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

  // YouTube
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0`,
      isIframe: true,
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

  // Google Drive file preview
  const gDriveId = getGoogleDriveFileId(cleanUrl);
  if (gDriveId) {
    const isVideo =
      mediaType === 'video' ||
      /\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i.test(cleanUrl) ||
      cleanUrl.includes('video');

    if (isVideo) {
      return {
        embedUrl: `https://drive.google.com/file/d/${gDriveId}/preview`,
        isIframe: true,
        canEmbed: true,
      };
    }

    return {
      embedUrl: `https://lh3.googleusercontent.com/d/${gDriveId}`,
      isIframe: false,
      canEmbed: true,
    };
  }

  // Direct video file
  if (mediaType === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(cleanUrl)) {
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
