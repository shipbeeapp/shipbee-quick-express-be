import axios from 'axios';
import { generateSeabaySignature, getSeabayTimestamp, getLocode, geocodeSea } from '../utils.js';
import { getSeaRatesToken } from '../utils.js';
import { env } from '../../../config/environment.js';

// Seabay FCL (CabinGuarantee)
export async function getSeabayFCLRates(body: any) {
    try {

        const fromLocode = getLocode(body.origin);  // "Dubai" → "AEJEA"
        const toLocode = getLocode(body.destination);
        const timestamp = getSeabayTimestamp();
        const sign = generateSeabaySignature(env.SEABAY_APP_KEY, env.SEABAY_APP_SECRET, timestamp);
        const payload = {
            request: {
                From: fromLocode,
                To: toLocode,
                CargoReadyDay: (body.date || '').replace(/-/g, ''),
                currency: 'USD'
            },
            app_key: env.SEABAY_APP_KEY,
            timestamp,
            sign
        };
        console.log({ payload });

        const res = await axios.post('https://api.seabay.cn/api/CabinGuarantee/FCLPriceOne', payload, {
            headers: {
                'Content-Type': 'application/json',
                app_key: env.SEABAY_APP_KEY,
                app_secret: env.SEABAY_APP_SECRET
            },
            timeout: 10000
        });
        // succeded but empty response
        console.log({ ress: res.data });

        const rates = (res.data?.response || []).flatMap((r: any) => {
            // Each rate object expands to up to 4 cards (one per container size)
            const sizes = [
                { key: 'Price20', label: '20ft Std', code: 'ST20' },
                { key: 'Price40', label: '40ft Std', code: 'ST40' },
                { key: 'Price40hq', label: '40ft HC', code: 'HC40' },
                { key: 'Price45hq', label: '45ft HC', code: 'HC45' }
            ];
            return sizes.filter(s => r[s.key]).map(s => ({
                shipmentId: `seabay-fcl-${r.ReferenceId || r.referenceId}-${s.code}-${Date.now()}`,
                shippingType: 'FCL',
                provider: r.CarrierCode || 'Seabay FCL',
                totalPrice: Number(r[s.key]),
                totalCurrency: 'USD',
                totalTransitTime: Number(r.TT) || 0,
                validityFrom: r.ValidFrom,
                validityTo: r.ValidEnd,
                originName: r.StartCityName,
                destinationName: r.EndCityName,
                expired: false,
                indicative: false,
                spaceGuarantee: false,
                spot: false,
                individual: false,
                alternative: false,
                co2Amount: null,
                containerSize: s.label,
                modeGroup: 'sea'
            }));
        });
        return rates;
    } catch (error: any) {
        console.log({ error: error.message });

        return [];
    }
}

// Seabay FCL-EAI
export async function getSeabayEAI(body: any) {
    try {
        const fromLocode = getLocode(body.origin);
        const toLocode = getLocode(body.destination);
        const timestamp = getSeabayTimestamp();
        const sign = generateSeabaySignature(env.SEABAY_APP_KEY, env.SEABAY_APP_SECRET, timestamp);
        const payload = {
            request: {
                From: fromLocode,
                To: toLocode,
                CargoReadyDay: (body.date || '').replace(/-/g, ''),
                currency: 'USD'
            },
            app_key: env.SEABAY_APP_KEY,
            timestamp,
            sign
        };
        const res = await axios.post('https://api.seabay.cn/api/FCLPriceEAI/PriceOne', payload, {
            headers: {
                'Content-Type': 'application/json',
                app_key: env.SEABAY_APP_KEY,
                app_secret: env.SEABAY_APP_SECRET
            },
            timeout: 10000
        });
        console.log({ payload });

        console.log({ res: res.data });

        const rates = (res.data?.response || []).flatMap((r: any) => {
            // lowercase price fields
            const sizes = [
                { key: 'price20', label: '20ft Std', code: 'ST20' },
                { key: 'price40', label: '40ft Std', code: 'ST40' },
                { key: 'price40hq', label: '40ft HC', code: 'HC40' },
                { key: 'price45hq', label: '45ft HC', code: 'HC45' }
            ];
            return sizes.filter(s => r[s.key]).map(s => ({
                shipmentId: `seabay-eai-${r.ReferenceId || r.referenceId}-${s.code}-${Date.now()}`,
                shippingType: 'FCL',
                provider: 'Seabay EAI',
                totalPrice: Number(r[s.key]),
                totalCurrency: 'USD',
                totalTransitTime: Number(r.TT) || 0,
                validityFrom: r.ValidFrom || null,
                validityTo: r.ValidEnd || r.EndDate || null,
                originName: r.StartCityName,
                destinationName: r.EndCityName,
                expired: false,
                indicative: false,
                spaceGuarantee: false,
                spot: false,
                individual: false,
                alternative: false,
                co2Amount: null,
                containerSize: s.label,
                modeGroup: 'sea'
            }));
        });
        return rates;
    } catch (error: any) {
        throw error;
    }
}

// Seabay LCL
export async function getSeabayLCLRates(body: any) {
    try {
        const fromLocode = getLocode(body.origin);
        const toLocode = getLocode(body.destination);
        const timestamp = getSeabayTimestamp();
        const sign = generateSeabaySignature(env.SEABAY_APP_KEY, env.SEABAY_APP_SECRET, timestamp);
        const today = new Date().toISOString().slice(0, 10);
        const payload = {
            request: {
                From: fromLocode,
                To: toLocode,
                CargoReadyDay: (body.date || today).replace(/-/g, ''),
                Weight: String(body.weight || 100),
                Volume: String(body.volume || 1),
                Currency: 'USD'
            },
            app_key: env.SEABAY_APP_KEY,
            timestamp,
            sign
        };
        console.log({ payload });

        const res = await axios.post('https://api.seabay.cn/api/nLCLPrice/TwoPoint', payload, {
            headers: {
                'Content-Type': 'application/json',
                app_key: env.SEABAY_APP_KEY,
                app_secret: env.SEABAY_APP_SECRET
            },
            timeout: 10000
        });
        console.log({ lclResponse: res }); // see full structure

        const rates = (res.data?.response || []).map((r: any) => {
            // Price extraction order
            const price = r?.remarks?.totalCharges?.value || r?.totalCharges?.value || r?.price?.value || r?.totalPrice || 0;
            const carrier = r?.connection?.carrier || r?.carrier || r?.provider || 'Seabay LCL';
            const transitTime = r?.remarks?.transitTime || r?.transitTime || 0;
            return {
                shipmentId: `seabay-lcl-${r.ReferenceId || r.referenceId}-${Date.now()}`,
                shippingType: 'LCL',
                provider: carrier,
                totalPrice: Number(price),
                totalCurrency: 'USD',
                totalTransitTime: Number(transitTime),
                validityFrom: r.ValidFrom || null,
                validityTo: r.ValidEnd || null,
                originName: r.StartCityName,
                destinationName: r.EndCityName,
                expired: false,
                indicative: false,
                spaceGuarantee: false,
                spot: false,
                individual: false,
                alternative: false,
                co2Amount: null,
                containerSize: null,
                modeGroup: 'sea'
            };
        });
        return rates;
    } catch (error: any) {
        console.error('Seabay LCL failed:', error?.response?.data || error.message);

        return [];
    }
}

// SeaRates FCL+LCL (GraphQL)
export async function getSeaRatesSeaRates(body: any) {
    try {
        const token = await getSeaRatesToken(env);

        // ✅ Clean — no double geocode
        const coordinatesFrom = body.coordinatesFrom ?? await geocodeSea(body.origin, env.GOOGLE_MAPS_API_KEY);
        const coordinatesTo = body.coordinatesTo ?? await geocodeSea(body.destination, env.GOOGLE_MAPS_API_KEY);

        if (!coordinatesFrom || !coordinatesTo) {
            console.error('SeaRates sea: could not resolve coordinates', {
                origin: body.origin, coordinatesFrom,
                destination: body.destination, coordinatesTo
            });
            return [];
        }

        const date = body.date || new Date().toISOString().slice(0, 10);
        const weight = body.weight || 100;
        const volume = body.volume || 1;
        const container = body.container || 'ST20';

        const containerSizeMap: Record<string, string> = {
            ST20: '20ft Std',
            ST40: '40ft Std',
            HC40: '40ft HC',
            HC45: '45ft HC'
        };

        const fclQuery = `{
            rates(
                shippingType: FCL
                coordinatesFrom: [${coordinatesFrom}]
                coordinatesTo: [${coordinatesTo}]
                date: "${date}"
                container: ${container}
            ) {
                points { location { name country lat lng code } shippingType provider }
                general {
                    shipmentId validityFrom validityTo individual
                    totalPrice totalCurrency totalTransitTime
                    totalCo2 { amount price }
                    alternative expired spaceGuarantee spot indicative queryShippingType
                }
            }
        }`;

        const lclQuery = `{
            rates(
                shippingType: LCL
                coordinatesFrom: [${coordinatesFrom}]
                coordinatesTo: [${coordinatesTo}]
                date: "${date}"
                weight: ${weight}
                volume: ${volume}
            ) {
                points { location { name country lat lng code } shippingType provider }
                general {
                    shipmentId validityFrom validityTo individual
                    totalPrice totalCurrency totalTransitTime
                    totalCo2 { amount price }
                    alternative expired spaceGuarantee spot indicative queryShippingType
                }
            }
        }`;

        console.log({ coordinatesFrom, coordinatesTo, date, container });

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const [fclRes, lclRes] = await Promise.all([
            axios.post('https://rates.searates.com/graphql', { query: fclQuery }, { headers, timeout: 30000 }),
            axios.post('https://rates.searates.com/graphql', { query: lclQuery }, { headers, timeout: 30000 })
        ]);

        if (fclRes.data.errors?.length) console.error('FCL GraphQL error:', fclRes.data.errors[0]);
        if (lclRes.data.errors?.length) console.error('LCL GraphQL error:', lclRes.data.errors[0]);

        const normalize = (res: any, shippingType: 'FCL' | 'LCL') =>
            (res.data?.data?.rates || []).map((r: any) => {
                const g = r.general;
                const points = r.points || [];
                return {
                    shipmentId: g.shipmentId,
                    shippingType,
                    provider: points.find((p: any) => p?.provider)?.provider || 'SeaRates',
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
                    containerSize: shippingType === 'FCL'
                        ? (containerSizeMap[container] || container)
                        : null,
                    modeGroup: 'sea'
                };
            });

        const rates = [
            ...normalize(fclRes, 'FCL'),
            ...normalize(lclRes, 'LCL')
        ];

        return rates;

    } catch (error: any) {
        console.error('SeaRates sea failed:', error.message);
        return [];
    }
}