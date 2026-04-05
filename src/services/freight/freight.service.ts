import { getSeabayAirRates, getSeaRatesAirRates } from './providers/air.js';
import { getSeabayFCLRates, getSeabayEAI, getSeabayLCLRates, getSeaRatesSeaRates } from './providers/sea.js';
import { getSeaRatesLandRates } from './providers/land.js';
import { trackUnified } from './providers/track.js';
import { bookUnified } from './providers/booking.js';

export async function getAirRates(body: any) {
    // Fan out to Seabay Air and SeaRates AIR in parallel
    const results = await Promise.allSettled([
        getSeabayAirRates(body),
        // getSeaRatesAirRates(body)
    ]);
    console.log({ results });

    // Collect all normalized rates from fulfilled results
    let rates: any[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            rates = rates.concat(result.value);
        } else if (result.status === 'fulfilled' && result.value && Array.isArray(result.value.rates)) {
            rates = rates.concat(result.value.rates);
        }
        // If provider returns a single object, wrap in array
        else if (result.status === 'fulfilled' && result.value && typeof result.value === 'object') {
            rates.push(result.value);
        }
        // Ignore rejected results (error resilience)
    }

    // Remove any null/undefined
    rates = rates.filter(Boolean);

    // Sort by totalPrice ascending
    rates.sort((a, b) => {
        if (typeof a.totalPrice !== 'number' || typeof b.totalPrice !== 'number') return 0;
        return a.totalPrice - b.totalPrice;
    });

    return {
        rates,
        total: rates.length,
        asOf: new Date().toISOString()
    };
    // end getAirRates
}

export async function getSeaRates(body: any) {
    // Fan out to all 4 providers in parallel
    const results = await Promise.allSettled([
        getSeabayFCLRates(body),
        getSeabayEAI(body),
        getSeabayLCLRates(body),
        getSeaRatesSeaRates(body)
    ]);
    // Normalize, merge, sort, and return
    // ...implementation placeholder
    return { rates: [], total: 0, asOf: new Date().toISOString() };
}

export async function getLandRates(body: any) {
    // Fan out to SeaRates FTL and LTL in parallel
    const results = await Promise.allSettled([
        getSeaRatesLandRates(body, 'FTL'),
        getSeaRatesLandRates(body, 'LTL')
    ]);
    // Normalize, merge, sort, and return
    // ...implementation placeholder
    return { rates: [], total: 0, asOf: new Date().toISOString() };
}

export async function unifiedTrack(query: any) {
    return trackUnified(query);
}

export async function unifiedBooking(body: any) {
    return bookUnified(body);
}
