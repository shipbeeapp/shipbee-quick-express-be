import crypto from 'crypto';
import axios from 'axios';

// Seabay signature generator
export function generateSeabaySignature(appKey: string, appSecret: string, timestamp: string) {
    const str = `app_key=${appKey}&timestamp=${timestamp}&app_secret=${appSecret}`;
    return crypto.createHash('md5').update(str).digest('hex').toLowerCase();
}

// Timestamp in yyyyMMddHHmmss
export function getSeabayTimestamp(date = new Date()) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

// SeaRates token cache (in-memory)
let seaRatesToken: string | null = null;
let seaRatesTokenExpiry: number = 0;

export async function getSeaRatesToken(env: any) {
    const now = Date.now();
    if (seaRatesToken && seaRatesTokenExpiry - now > 5 * 60 * 1000) {
        return seaRatesToken;
    }
    const url = `https://www.searates.com/auth/platform-token?id=${env.SEARATES_PLATFORM_ID}&api_key=${env.SEARATES_API_KEY}&login=${env.SEARATES_LOGIN}&password=${env.SEARATES_PASSWORD}`;

    const res = await axios.get(url);
    const token = typeof res.data === 'string' ? res.data : res.data['s-token'];
    seaRatesToken = token;
    seaRatesTokenExpiry = now + 60 * 60 * 1000; // 1 hour TTL
    return token;
}

// IATA code extraction from display name
export function extractIATACode(displayName: string) {
    const match = displayName.match(/-\s*([A-Z]{3})\s*$/);
    if (match) return match[1];
    // fallback: first 3 alpha chars of city name
    const city = displayName.replace(/[^a-zA-Z ]/g, '').split(' ')[0];
    return (city.substring(0, 3).toUpperCase() + 'XXX').substring(0, 3);
}

// LOCODE lookup (stub, fill with real data)
const LOCODE_MAP: Record<string, string> = {
    'dubai': 'AEJEA',
    'jebel ali': 'AEJEA',
    'abu dhabi': 'AEAUH',
    'sharjah': 'AESHJ',
    'shanghai': 'CNSHA',
    'shenzhen': 'CNSZX',
    'guangzhou': 'CNGUA',
    'ningbo': 'CNNBO',
    'tianjin': 'CNTXG',
    'qingdao': 'CNTAO',
    'xiamen': 'CNXMN',
    'dalian': 'CNDLC',
    'jeddah': 'SAJED',
    'dammam': 'SADMM',
    'riyadh': 'SARUH',
    'doha': 'QADOH',
    'kuwait': 'KWKWI',
    'bahrain': 'BHBAH',
    'manama': 'BHBAH',
    'muscat': 'OMMCT',
    'sohar': 'OMSOH',
    'salalah': 'OMSLL',
    'mumbai': 'INBOM',
    'nhava sheva': 'INNSA',
    'chennai': 'INMAA',
    'kolkata': 'INCCU',
    'mundra': 'INMUN',
    'karachi': 'PKKAR',
    'chittagong': 'BDCGP',
    'colombo': 'LKCMB',
    'singapore': 'SGSIN',
    'port klang': 'MYPKG',
    'klang': 'MYPKG',
    'bangkok': 'THBKK',
    'laem chabang': 'THLCH',
    'ho chi minh': 'VNSGN',
    'hanoi': 'VNHAN',
    'jakarta': 'IDJKT',
    'tanjung priok': 'IDJKT',
    'busan': 'KRBSN',
    'seoul': 'KRSEL',
    'tokyo': 'JPTYO',
    'yokohama': 'JPYOK',
    'osaka': 'JPOSA',
    'nagoya': 'JPNGO',
    'hamburg': 'DEHAM',
    'bremen': 'DEBRE',
    'rotterdam': 'NLRTM',
    'antwerp': 'BEANR',
    'london': 'GBLON',
    'felixstowe': 'GBFXT',
    'southampton': 'GBSOU',
    'barcelona': 'ESBCN',
    'valencia': 'ESVLC',
    'genoa': 'ITGOA',
    'le havre': 'FRLEH',
    'marseille': 'FRMRS',
    'istanbul': 'TRIST',
    'mersin': 'TRMER',
    'alexandria': 'EGALY',
    'port said': 'EGPSD',
    'mombasa': 'KEMBA',
    'durban': 'ZADUR',
    'cape town': 'ZACPT',
    'new york': 'USNYC',
    'los angeles': 'USLAX',
    'long beach': 'USLGB',
    'houston': 'USHOU',
    'savannah': 'USSAV',
    'vancouver': 'CAVAN',
    'montreal': 'CAMTR',
    'santos': 'BRSTS',
    'sydney': 'AUSYD',
    'melbourne': 'AUMEL',
};

export function getLocode(displayName: string): string {
    if (!displayName) return '';

    // 1. Try to extract 5-letter LOCODE directly e.g. "Dubai - AEJEA"
    const locodeMatch = displayName.match(/\b([A-Z]{2}[A-Z0-9]{3})\b/);
    if (locodeMatch) return locodeMatch[1];

    // 2. Normalize: lowercase, strip special chars
    const normalized = displayName.toLowerCase().replace(/[^a-z\s]/g, '').trim();

    // 3. Exact match first
    if (LOCODE_MAP[normalized]) return LOCODE_MAP[normalized];

    // 4. Partial match — e.g. "Dubai Port" still matches "dubai"
    for (const [key, code] of Object.entries(LOCODE_MAP)) {
        if (normalized.includes(key)) return code;
    }

    console.warn(`No LOCODE found for: "${displayName}"`);
    return '';
}