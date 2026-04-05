import axios from 'axios';
import { getSeaRatesToken } from '../utils.js';
import { env } from '../../../config/environment.js';

// SeaRates FTL and LTL provider logic
export async function getSeaRatesLandRates(body: any, type: 'FTL' | 'LTL') {
  try {
    const token = await getSeaRatesToken(env);
    const query = `query Rates($input: RatesInput!) {
      rates(
        shippingType: ${type}
        truckType: ${type}
        coordinatesFrom: $input.coordinatesFrom
        coordinatesTo: $input.coordinatesTo
        date: $input.date
        weight: $input.weight
        volume: $input.volume
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
    const variables = {
      input: {
        coordinatesFrom: body.coordinatesFrom,
        coordinatesTo: body.coordinatesTo,
        date: body.date,
        weight: body.weight || 500,
        volume: body.volume || 5
      }
    };
    const res = await axios.post('https://rates.searates.com/graphql', {
      query,
      variables
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    const rates = (res.data?.data?.rates || []).map((r: any) => {
      const g = r.general;
      const points = r.points || [];
      return {
        shipmentId: g.shipmentId,
        shippingType: type,
        provider: points[0]?.provider || 'SeaRates Land',
        totalPrice: g.totalPrice,
        totalCurrency: g.totalCurrency,
        totalTransitTime: g.totalTransitTime,
        validityFrom: g.validityFrom,
        validityTo: g.validityTo,
        originName: points[0]?.location?.name,
        destinationName: points[points.length-1]?.location?.name,
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
    return rates;
  } catch (error: any) {
    // If geocoding fails or no rates, return fallback
    return { rates: [], fallback: true, error: error?.message || 'SeaRates land rates failed' };
  }
}
