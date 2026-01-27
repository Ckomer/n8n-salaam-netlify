const fetch = require('node-fetch');

const N8N_WEBHOOK =
  'https://n8n.srv1283227.hstgr.cloud/webhook/865aa07b-ee66-45bb-bd08-fe465adb1c62';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
    };
  }

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        // 🔥 BITNO: prosleđujemo ORIGINALNI Content-Type
        'Content-Type': event.headers['content-type'],
      },
      // 🔥 BITNO: raw body
      body: event.body,
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': response.headers.get('content-type') || 'text/plain',
      },
      body: text,
    };
  } catch (err) {
    console.error('Upload proxy error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: 'Upload failed',
    };
  }
};
