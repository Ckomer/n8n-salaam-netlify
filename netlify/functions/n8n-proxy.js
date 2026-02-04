const fetch = require('node-fetch');

// Osnovni domen vaše n8n instance
const N8N_BASE_URL = 'https://n8n.srv1283227.hstgr.cloud/webhook/';

// MAPA: Ključ rute (koji pozivate iz Webflowa) : n8n Webhook ID
const N8N_URL_MAP = {
    'team': '527943bf-2ee5-427a-b4a5-aa6ef9bda05d',
    'player': 'ac5b5b10-3682-4390-95cf-e0c8012094df',
    'free-agent': 'ff1a5b3e-8be7-482d-842f-6188c0181d43',
    'get-tournaments': '729e0aa1-af65-430f-88bc-90b478d81f29',
    'get-divisions': '494b93d8-16f6-47b2-8954-322cd15e78c8',
    'get-teams': '51366529-87a1-4005-a3ca-8f771cf819df',
    'get-games': '3901fc41-6425-4ce1-8255-0cc4f054d7b3',
};
// 1. Definicija CORS Headera
const CORS_HEADERS = {
    // Ovo dozvoljava pristup SVIM domenima. Za veću sigurnost, 
    // zamenite '*' sa 'https://airportexecutive.webflow.io'
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept', // Dodajte sve headere koje šaljete
};


exports.handler = async (event) => {
    
    // --- RUKOVODJENJE PREFLIGHT ZAHTEVIMA (OPTIONS) ---
    // Preflight zahtev je ono što uzrokuje CORS grešku, mora se obraditi prvi.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS, // Vraćamo samo headere
            body: JSON.stringify({ message: "CORS preflight request successful." }),
        };
    }
    // --------------------------------------------------


    // 1. Identifikacija ciljnog webhooka
    const parts = event.path.split('/');
    const targetKey = parts[parts.length - 1]; 

    const webhookId = N8N_URL_MAP[targetKey];
    
    // U slučaju nepoznate rute
    if (!webhookId) {
        return { 
            statusCode: 404, 
            headers: CORS_HEADERS, // Vraćamo CORS headere
            body: JSON.stringify({ message: `Nepoznata ciljna ruta: ${targetKey}` }) 
        };
    }

    const n8nUrl = N8N_BASE_URL + webhookId;
    const method = event.httpMethod;
    let finalN8nUrl = n8nUrl;
    
    // Rukovodjenje GET zahtevima i query parametrima
    if (method === 'GET') {
        const params = new URLSearchParams(event.queryStringParameters).toString();
        if (params) {
            finalN8nUrl = `${n8nUrl}?${params}`;
        }
    }

    // Postavljanje header-a za prosleđivanje ka n8n
    const headers = {
        'Content-Type': 'application/json',
    };

    // 2. Server-to-Server poziv ka n8n
    try {
        const response = await fetch(finalN8nUrl, {
            method: method,
            headers: headers,
            body: (method === 'POST' || method === 'PUT') ? event.body : null, 
        });

        // 3. Vraćanje odgovora klijentu
        const data = await response.text(); 
        
        return {
            statusCode: response.status,
            body: data, 
            headers: {
                ...CORS_HEADERS, // SADA DODAJEMO CORS HEADERE
                'Content-Type': response.headers.get('content-type') || 'application/json',
            }
        };

    } catch (error) {
        console.error(`N8N Proxy Greška za ${targetKey}:`, error.message);
        return { 
            statusCode: 500, 
            headers: CORS_HEADERS, // Dodajemo CORS headere i na greške
            body: JSON.stringify({ message: `Interna serverska greška u proxyju za ${targetKey}.` }) 
        };
    }
};