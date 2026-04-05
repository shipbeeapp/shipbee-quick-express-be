import axios from 'axios';
import { generateSeabaySignature, getSeabayTimestamp, extractIATACode, getSeaRatesToken } from '../utils.js';
import { env } from '../../../config/environment.js';

// Seabay Air API integration
export async function getSeabayAirRates(body: any) {
    try {
        // Extract and normalize input
        const weight = body.weight || 100;
        const volume = body.volume || 1;
        const fromIATA = extractIATACode(body.origin || '');
        const toIATA = extractIATACode(body.destination || '');
        const timestamp = getSeabayTimestamp();
        const sign = generateSeabaySignature(env.SEABAY_APP_KEY, env.SEABAY_APP_SECRET, timestamp);
        console.log({ sign });

        const payload = {
            request: {
                From: fromIATA,
                To: toIATA,
                Currency: 'USD',
                Volume: String(volume),
                Weight: String(weight)
            },
            app_key: env.SEABAY_APP_KEY,
            timestamp,
            sign
        };
        console.log({ url: 'https://api.seabay.cn/api/AirFreightPrice/queryIATANew' });

        console.log({ payload });
        console.log(`SIGN STRING: app_key=${env.SEABAY_APP_KEY}&timestamp=${timestamp}&app_secret=${env.SEABAY_APP_SECRET}`);
        const res = await axios.post('https://api.seabay.cn/api/AirFreightPrice/queryIATANew', payload, {
            headers: {
                'Content-Type': 'application/json',
                app_key: env.SEABAY_APP_KEY,
                app_secret: env.SEABAY_APP_SECRET
            },
            timeout: 10000
        });

        console.log({ res: res.data });

        const rates = (res.data?.response || []).map((r: any) => {
            const price = Number(r.Price) * weight;
            const ttClassMap = { 1: 'Express', 2: 'Best Value', 3: 'Economy', 4: 'Promo' };
            const provider = `Seabay Air · ${ttClassMap[r.TTClass] || 'Unknown'}`;
            return {
                shipmentId: `seabay-air-${r.referenceId}-${weight}-${Date.now()}`,
                shippingType: 'AIR',
                provider,
                totalPrice: price,
                totalCurrency: 'USD',
                totalTransitTime: r.TT,
                validityFrom: r.EffectTime ? parseSeabayDate(r.EffectTime) : null,
                validityTo: r.EndTime ? parseSeabayDate(r.EndTime) : null,
                originName: r.FromCity,
                destinationName: r.ToCity,
                expired: false,
                indicative: false,
                spaceGuarantee: false,
                spot: r.TTClass === 4,
                individual: false,
                alternative: false,
                co2Amount: null,
                containerSize: null,
                modeGroup: 'air'
            };
        });
        return rates;
    } catch (error: any) {
        return [];
    }
}

function parseSeabayDate(str: string) {
    // e.g. 20260401000000 or 20260401
    if (!str) return null;
    if (str.length === 8) return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}T00:00:00Z`;
    if (str.length === 14) return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}T${str.substring(8, 10)}:${str.substring(10, 12)}:${str.substring(12, 14)}Z`;
    return str;
}


export async function getSeaRatesAirRates(body: any) {
    try {
        console.log({ body });

        const token = await getSeaRatesToken(env);
        const query = `
query Rates(
    $coordinatesFrom: [Float]
    $coordinatesTo: [Float]
    $date: Date
    $weight: Float!
    $volume: Float!
) {
    rates(
        shippingType: AIR
        coordinatesFrom: $coordinatesFrom
        coordinatesTo: $coordinatesTo
        date: $date
        weight: $weight
        volume: $volume
    ) {
        points { 
            location { name country lat lng code } 
            shippingType provider 
        }
        general {
            shipmentId validityFrom validityTo individual
            totalPrice totalCurrency totalTransitTime
            totalCo2 { amount price }
            alternative expired spaceGuarantee spot indicative queryShippingType
        }
    }
}`;

        const variables = {
            coordinatesFrom: body.coordinatesFrom,
            coordinatesTo: body.coordinatesTo,
            date: body.date,
            weight: body.weight || 100,
            volume: body.volume || 1
        };
        const res = await axios.post(
            'https://rates.searates.com/graphql',
            { query, variables },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        // Log errors only if they exist
        if (res.data.errors?.length) {
            console.error('GraphQL Error:', res.data.errors[0]);
            return [];
        }

        const rates = (res.data?.data?.rates || []).map((r: any) => {
            const g = r.general;
            const points = r.points || [];
            return {
                shipmentId: g.shipmentId,
                shippingType: 'AIR',
                provider: points[0]?.provider || 'SeaRates AIR',
                totalPrice: g.totalPrice,
                totalCurrency: g.totalCurrency,
                totalTransitTime: g.totalTransitTime,
                validityFrom: g.validityFrom,
                validityTo: g.validityTo,
                originName: points[0]?.location?.name,
                destinationName: points[points.length - 1]?.location?.name,
                expired: g.expired,
                indicative: g.indicative,
                spaceGuarantee: g.spaceGuarantee,
                spot: g.spot,
                individual: g.individual,
                alternative: g.alternative,
                co2Amount: g.totalCo2?.amount || null,
                containerSize: null,
                modeGroup: 'air'
            };
        });

        return rates;

    } catch (error: any) {
        console.error('Request failed:', error.message);
        return [];
    }
}
