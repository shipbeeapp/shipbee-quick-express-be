import axios from 'axios';
import { geocodeLocation, getSeaRatesToken } from '../utils.js';
import { env } from '../../../config/environment.js';

// SeaRates FTL and LTL provider logic
export async function getSeaRatesLandRates(body: any, type: 'FTL' | 'LTL') {
  try {
    const token = await getSeaRatesToken(env);

    // Geocode fallback per doc: if coordinates fail → return fallback object
    const coordinatesFrom = body.coordinatesFrom ?? await geocodeLocation(body.origin, env.GOOGLE_MAPS_API_KEY);
    const coordinatesTo = body.coordinatesTo ?? await geocodeLocation(body.destination, env.GOOGLE_MAPS_API_KEY);

    if (!coordinatesFrom || !coordinatesTo) {
      return { rates: [], fallback: true, error: `Could not resolve coordinates for ${body.origin} or ${body.destination}` };
    }

    const date = body.date || new Date().toISOString().slice(0, 10);
    const weight = body.weight
    const volume = body.volume

    
    // ✅ Inline values — no variables, no dot notation
    const query = `{
            rates(
                shippingType: ${type}
                truckType: CTLT
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

    const res = await axios.post(
      'https://rates.searates.com/graphql',
      { query },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // SeaRates is slow
      }
    );

    if (res.data.errors?.length) {
      console.error(`SeaRates ${type} GraphQL error:`, res.data.errors[0]);
      return [];
    }

    const rates = (res.data?.data?.rates || []).map((r: any) => {
      const g = r.general;
      const points = r.points || [];
      return {
        shipmentId: g.shipmentId,
        shippingType: type,
        // ✅ first points[].provider with a value — same pattern as air/sea
        provider: points.find((p: any) => p?.provider)?.provider || 'SeaRates Land',
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
        modeGroup: 'land'
      };
    });

    console.log({ [`${type} rates`]: rates.length });
    return rates;

  } catch (error: any) {
    // ✅ Per doc: geocoding failure returns fallback object, not empty array
    return { rates: [], fallback: true, error: error?.message || 'SeaRates land rates failed' };
  }
}