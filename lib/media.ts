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

  // Documents
  if (
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.includes('docs.google.com') ||
    cleanUrl.includes('notion.so')
  ) {
    return 'document';
  }

  // Google Drive files can be video, image, or doc
  if (cleanUrl.includes('drive.google.com')) {
    return 'document';
  }

  return 'other';
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
  if (cleanUrl.includes('drive.google.com/file/d/')) {
    const fileIdMatch = cleanUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`,
        isIframe: true,
        canEmbed: true,
      };
    }
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
