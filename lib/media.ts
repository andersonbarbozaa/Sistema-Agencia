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
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.avi') ||
    cleanUrl.endsWith('.mkv')
  ) {
    return 'video';
  }

  // Images
  if (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.gif') ||
    cleanUrl.endsWith('.svg') ||
    cleanUrl.includes('images.unsplash.com') ||
    cleanUrl.includes('imgur.com')
  ) {
    return 'image';
  }

  // Documents
  if (
    cleanUrl.endsWith('.pdf') ||
    cleanUrl.endsWith('.doc') ||
    cleanUrl.endsWith('.docx') ||
    cleanUrl.endsWith('.xls') ||
    cleanUrl.endsWith('.xlsx') ||
    cleanUrl.endsWith('.ppt') ||
    cleanUrl.endsWith('.pptx') ||
    cleanUrl.includes('docs.google.com') ||
    cleanUrl.includes('notion.so')
  ) {
    return 'document';
  }

  // Google Drive files can be video, image, or doc
  if (cleanUrl.includes('drive.google.com')) {
    // If it contains video keywords in title or params
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
  if (mediaType === 'video' && (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov'))) {
    return {
      embedUrl: cleanUrl,
      isIframe: false,
      canEmbed: true,
    };
  }

  // Direct image
  if (mediaType === 'image') {
    return {
      embedUrl: cleanUrl,
      isIframe: false,
      canEmbed: true,
    };
  }

  // PDF direct view in iframe
  if (cleanUrl.endsWith('.pdf')) {
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
