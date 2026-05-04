export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Upload image
    if (request.method === 'POST' && url.pathname === '/upload') {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return new Response('No file provided', { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return new Response('Invalid file type', { status: 400 });
      }

      const key = `uploads/${Date.now()}-${file.name}`;
      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      return new Response(JSON.stringify({
        url: `https://images.jleachphotography.com/${key}`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
