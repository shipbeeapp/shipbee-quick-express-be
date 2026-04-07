import axios from 'axios';
import { env } from '../../../config/environment.js';

// Helper: Normalize tracking response
function normalizeTracking(data: any, mode: string) {
  if (!data) return { found: false };
  if (mode === 'vessel') {
    return {
      found: !!data.mmsi,
      mmsi: data.mmsi,
      vesselName: data.vesselName,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      heading: data.heading,
      course: data.course,
      rateOfTurn: data.rateOfTurn,
      navStatus: data.navStatus
    };
  }
  if (mode === 'flight') {
    return {
      found: !!data.icao24,
      icao24: data.icao24,
      callsign: data.callsign,
      originCountry: data.originCountry,
      longitude: data.longitude,
      latitude: data.latitude,
      baroAltitude: data.baroAltitude,
      onGround: data.onGround,
      velocity: data.velocity,
      trueTrack: data.trueTrack,
      geoAltitude: data.geoAltitude
    };
  }
  // air, sea, land, parcel
  return {
    found: !!data.found,
    trackingNo: data.trackingNo,
    status: data.status,
    carrier: data.carrier,
    lastEvent: data.lastEvent,
    lastTime: data.lastTime,
    lastLocation: data.lastLocation,
    latitude: data.latitude,
    longitude: data.longitude,
    eventCount: data.eventCount,
    recentEvents: data.recentEvents
  };
}

export async function trackUnified(query: any) {
  try {
    const mode = (query.mode || '').toLowerCase();
    if (!mode) return { found: false, error: 'Missing mode param' };
    // 1. Air tracking
    console.log({ query });

    if (mode === 'air') {
      const res = await axios.get('https://tracking.searates.com/air', {
        params: {
          api_key: env.SEARATES_API_KEY,
          number: String(query.number),
          path: false
        },
        timeout: 10000
      });
      console.log({ res: res.data });

      return normalizeTracking(res.data, 'air');
    }
    // 2. Sea tracking
    if (mode === 'sea') {
      const res = await axios.get('https://tracking.searates.com/tracking', {
        params: {
          api_key: env.SEARATES_API_KEY,
          number: query.number,
          sealine: query.sealine || 'auto',
          route: true,
          ais: true
        },
        timeout: 10000
      });
      console.log({ res: JSON.stringify(res.data) });
      return normalizeTracking(res.data, 'sea');
    }
    // 3. Land/parcel tracking (17track)
    if (mode === 'land' || mode === 'parcel') {
      // Step 1: Register
      try {
        await axios.post('https://api.17track.net/track/v2.2/register?lang=en', [{ number: query.number }], {
          headers: { '17token': env.TRACK17_API_KEY },
          timeout: 10000
        });
      } catch (e) { /* ignore registration errors */ }
      // Step 2: Get info
      const res = await axios.post('https://api.17track.net/track/v2.2/gettrackinfo?lang=en', [{ number: query.number }], {
        headers: { '17token': env.TRACK17_API_KEY },
        timeout: 10000
      });
      const d = res.data?.data?.accepted?.[0]?.track_info?.tracking?.providers?.[0];
      if (res.data?.code === -18019902) {
        return { found: false, error: 'Tracking number registered — click Track again in a moment.' };
      }
      return normalizeTracking(d, 'land');
    }
    // 4. Vessel tracking (AISStream, WebSocket, 20s timeout)
    if (mode === 'vessel') {
      // Not implemented: would require a WebSocket client and timeout logic
      return { found: false, error: 'Vessel tracking via AISStream not implemented in this backend.' };
    }
    // 5. Flight tracking (OpenSky Network)
    if (mode === 'flight') {
      // Not implemented: would require polling OpenSky and filtering by callsign
      return { found: false, error: 'Flight tracking via OpenSky not implemented in this backend.' };
    }
    return { found: false, error: 'Unknown mode' };
  } catch (error: any) {
    return { found: false, error: error?.message || 'Tracking failed' };
  }
}
