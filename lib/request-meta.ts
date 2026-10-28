// ============================================================
// REQUEST METADATA & DEVICE DETECTION ENGINE
// Executa 100% nativo em Cloudflare Workers Edge e Node.js
// Sem dependências pesadas, ultra rápido e à prova de falhas
// ============================================================

export interface RequestMetadata {
  ip: string;
  location: string;
  city: string | null;
  region: string | null;
  country: string | null;
  browser: string;
  browserName: string;
  browserVersion: string | null;
  os: string;
  osName: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  deviceModel: string;
  userAgent: string;
  referer: string | null;
  route?: string | null;
}

export function parseUserAgentString(ua: string | null | undefined): {
  browser: string;
  browserName: string;
  browserVersion: string | null;
  os: string;
  osName: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  deviceModel: string;
} {
  if (!ua || typeof ua !== 'string') {
    return {
      browser: 'Navegador Web',
      browserName: 'Desconhecido',
      browserVersion: null,
      os: 'Desconhecido',
      osName: 'Desconhecido',
      device: 'Desktop',
      deviceModel: 'Computador',
    };
  }

  // 1. Detecção de Dispositivo (Device Type & Model)
  let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  let deviceModel = 'Computador / PC';

  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    device = 'Tablet';
    deviceModel = /iPad/i.test(ua) ? 'Apple iPad' : 'Tablet Android';
  } else if (/iPhone/i.test(ua)) {
    device = 'Mobile';
    deviceModel = 'Apple iPhone';
  } else if (/iPod/i.test(ua)) {
    device = 'Mobile';
    deviceModel = 'Apple iPod';
  } else if (/Android.*Mobile|Mobile.*Android/i.test(ua)) {
    device = 'Mobile';
    if (/SM-|Samsung/i.test(ua)) deviceModel = 'Samsung Galaxy';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) deviceModel = 'Xiaomi / Redmi';
    else if (/Motorola|Moto/i.test(ua)) deviceModel = 'Motorola';
    else deviceModel = 'Smartphone Android';
  } else if (/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device = 'Mobile';
    deviceModel = 'Dispositivo Móvel';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = 'Desktop';
    deviceModel = 'Apple Mac';
  } else if (/Windows/i.test(ua)) {
    device = 'Desktop';
    deviceModel = 'PC Windows';
  } else if (/Linux/i.test(ua)) {
    device = 'Desktop';
    deviceModel = 'Estação Linux';
  }

  // 2. Detecção de Sistema Operacional (OS)
  let os = 'Desconhecido';
  let osName = 'Desconhecido';
  let match: RegExpMatchArray | null = null;

  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
    osName = 'Windows';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
    osName = 'Windows';
  } else if (/Windows NT 6\.2/i.test(ua)) {
    os = 'Windows 8';
    osName = 'Windows';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows 7';
    osName = 'Windows';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    osName = 'Windows';
  } else if ((match = ua.match(/Mac OS X (\d+[_\.\d]*)/i))) {
    const v = match[1].replace(/_/g, '.');
    os = `macOS ${v}`;
    osName = 'macOS';
  } else if ((match = ua.match(/iPhone OS (\d+[_\.\d]*)/i))) {
    const v = match[1].replace(/_/g, '.');
    os = `iOS ${v}`;
    osName = 'iOS';
  } else if ((match = ua.match(/CPU OS (\d+[_\.\d]*)/i))) {
    const v = match[1].replace(/_/g, '.');
    os = `iPadOS ${v}`;
    osName = 'iPadOS';
  } else if ((match = ua.match(/Android (\d+[\.\d]*)/i))) {
    os = `Android ${match[1]}`;
    osName = 'Android';
  } else if (/Ubuntu/i.test(ua)) {
    os = 'Ubuntu Linux';
    osName = 'Linux';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    osName = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
    osName = 'Chrome OS';
  }

  // 3. Detecção de Navegador (Browser)
  let browser = 'Navegador Web';
  let browserName = 'Desconhecido';
  let browserVersion: string | null = null;

  if ((match = ua.match(/Edg\/(\d+[\.\d]*)/i))) {
    browserName = 'Microsoft Edge';
    browserVersion = match[1].split('.')[0];
    browser = `Microsoft Edge ${browserVersion}`;
  } else if ((match = ua.match(/OPR\/(\d+[\.\d]*)/i)) || (match = ua.match(/Opera\/(\d+[\.\d]*)/i))) {
    browserName = 'Opera';
    browserVersion = match[1].split('.')[0];
    browser = `Opera ${browserVersion}`;
  } else if ((match = ua.match(/SamsungBrowser\/(\d+[\.\d]*)/i))) {
    browserName = 'Samsung Internet';
    browserVersion = match[1].split('.')[0];
    browser = `Samsung Internet ${browserVersion}`;
  } else if ((match = ua.match(/Brave\/(\d+[\.\d]*)/i))) {
    browserName = 'Brave';
    browserVersion = match[1].split('.')[0];
    browser = `Brave ${browserVersion}`;
  } else if ((match = ua.match(/Chrome\/(\d+[\.\d]*)/i))) {
    browserName = 'Google Chrome';
    browserVersion = match[1].split('.')[0];
    browser = `Google Chrome ${browserVersion}`;
  } else if ((match = ua.match(/Version\/(\d+[\.\d]*).*Safari/i))) {
    browserName = 'Safari';
    browserVersion = match[1].split('.')[0];
    browser = `Apple Safari ${browserVersion}`;
  } else if ((match = ua.match(/Firefox\/(\d+[\.\d]*)/i))) {
    browserName = 'Firefox';
    browserVersion = match[1].split('.')[0];
    browser = `Mozilla Firefox ${browserVersion}`;
  } else if (/Safari/i.test(ua)) {
    browserName = 'Safari';
    browser = 'Apple Safari';
  }

  return {
    browser,
    browserName,
    browserVersion,
    os,
    osName,
    device,
    deviceModel,
  };
}

export function extractRequestMeta(req: Request | any, routeHint?: string): RequestMetadata {
  let headers: Headers;

  if (req?.headers instanceof Headers) {
    headers = req.headers;
  } else if (req?.headers && typeof req.headers.get === 'function') {
    headers = req.headers;
  } else if (req instanceof Headers) {
    headers = req;
  } else {
    headers = new Headers(req?.headers || {});
  }

  // IP Resolution
  const cfIp = headers.get('cf-connecting-ip');
  const xRealIp = headers.get('x-real-ip');
  const xForwardedFor = headers.get('x-forwarded-for');
  let ip = cfIp || xRealIp || (xForwardedFor ? xForwardedFor.split(',')[0].trim() : '') || '127.0.0.1';

  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // Cloudflare Geolocation Headers
  const city = headers.get('cf-ipcity') || null;
  const region = headers.get('cf-region') || headers.get('cf-region-code') || null;
  const country = headers.get('cf-ipcountry') || null;

  // Local / Intranet Check
  const isLocal =
    ip === '127.0.0.1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.31.');

  let location = 'Localização não identificada';
  if (city && country) {
    location = region ? `${city}, ${region} - ${country}` : `${city} - ${country}`;
  } else if (country) {
    location = country === 'BR' ? 'Brasil' : country;
  } else if (isLocal) {
    location = 'Rede Local / Intranet';
  }

  const userAgent = headers.get('user-agent') || '';
  const referer = headers.get('referer') || null;

  let route = routeHint;
  if (!route && typeof req?.url === 'string') {
    try {
      const u = new URL(req.url);
      route = u.pathname;
    } catch {}
  }

  const parsed = parseUserAgentString(userAgent);

  return {
    ip,
    location,
    city,
    region,
    country,
    ...parsed,
    userAgent,
    referer,
    route: route || null,
  };
}
