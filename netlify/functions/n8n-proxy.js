const fetch = require('node-fetch');

// Osnovni domen vaše n8n instance
const N8N_BASE_URL = 'https://n8n.srv1283227.hstgr.cloud/webhook/';

// MAPA: Ključ rute (koji pozivate iz Webflowa) : n8n Webhook ID
const N8N_URL_MAP = {
    'team': '527943bf-2ee5-427a-b4a5-aa6ef9bda05d',
    'player': 'd66ae0c0-ad73-4b0a-a15d-1d03f2d43877',
    'free-agent': 'e489dfe3-85e9-4108-a990-a268bd33d9e5',
    'get-tournaments': '729e0aa1-af65-430f-88bc-90b478d81f29',
    'get-divisions': '494b93d8-16f6-47b2-8954-322cd15e78c8',
};

// 1. Definicija CORS Headera
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

exports.handler = async (event) => {

    // --- PREFLIGHT ZAHTEVI ---
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: "CORS preflight request successful." }),
        };
    }

    // --- IDENTIFIKACIJA WEBHOOKA ---
    const parts = event.path.split('/');
    const targetKey = parts[parts.length - 1]; 
    const webhookId = N8N_URL_MAP[targetKey];

    if (!webhookId) {
        return { 
            statusCode: 404, 
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: `Nepoznata ciljna ruta: ${targetKey}` }) 
        };
    }

    const n8nUrl = N8N_BASE_URL + webhookId;
    const method = event.httpMethod;
    let finalN8nUrl = n8nUrl;

    // --- GET query parametri ---
    if (method === 'GET') {
        const params = new URLSearchParams(event.queryStringParameters).toString();
        if (params) finalN8nUrl = `${n8nUrl}?${params}`;
    }

    // --- DETEKCIJA MULTIPART ---
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');

    // --- HEADERI ZA FETCH ---
    const headers = {};
    if (!isMultipart) {
        // JSON request → setujemo header
        headers['Content-Type'] = 'application/json';
    }
    // Za multipart → fetch automatski koristi boundary iz browsera, NE POSTAVLJAJ Content-Type

    // --- BODY ZA FETCH ---
    let bodyToSend = null;
    if (method === 'POST' || method === 'PUT') {
        if (isMultipart) {
            bodyToSend = event.isBase64Encoded 
                ? Buffer.from(event.body, 'base64') 
                : event.body;
        } else {
            bodyToSend = event.body;
        }
    }

    // --- SERVER-TO-SERVER FETCH ---
    try {
        const response = await fetch(finalN8nUrl, {
            method,
            headers,
            body: bodyToSend,
        });

        const data = await response.text();

        return {
            statusCode: response.status,
            body: data,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': response.headers.get('content-type') || 'application/json',
            }
        };

    } catch (error) {
        console.error(`N8N Proxy Greška za ${targetKey}:`, error.message);
        return { 
            statusCode: 500, 
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: `Interna serverska greška u proxyju za ${targetKey}.` }) 
        };
    }
};
