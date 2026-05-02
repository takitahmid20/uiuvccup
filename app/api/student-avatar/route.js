const URL_REGEX = /https?:\/\/[^\s"']+\.(?:png|jpe?g|webp)/i;

const findUrlInValue = (value) => {
  if (typeof value === 'string') {
    const match = value.match(URL_REGEX);
    return match ? match[0] : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlInValue(item);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findUrlInValue(item);
      if (found) return found;
    }
  }

  return null;
};

const extractImageUrl = (raw) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (URL_REGEX.test(trimmed)) {
    const match = trimmed.match(URL_REGEX);
    return match ? match[0] : null;
  }

  try {
    const json = JSON.parse(trimmed);
    return findUrlInValue(json);
  } catch (error) {
    return null;
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const std = (searchParams.get('std') || '').trim();

  if (!std) {
    return new Response('Missing std', { status: 400 });
  }

  const endpoint = `https://hhs.uiu.ac.bd/ci4project/api?std=${encodeURIComponent(std)}`;

  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    const text = await response.text();
    const imageUrl = extractImageUrl(text);

    if (!imageUrl) {
      return new Response('Avatar not found', { status: 404 });
    }

    return Response.redirect(imageUrl, 302);
  } catch (error) {
    return new Response('Avatar lookup failed', { status: 502 });
  }
}
