// utils/googleDistance.ts
import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../../config/environment.js"; // load API_KEY from .env

const client = new Client({});

export async function getDistanceAndDuration(
  origin: any,
  destination: any
): Promise<{ distanceKm: number; durationMin: number }> {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        key: env.GOOGLE_MAPS_API_KEY,
      },
    });

    const element = response.data.rows[0].elements[0];

    if (element.status !== "OK") {
      throw new Error(`Distance Matrix API error: ${element.status}`);
    }

    return {
      distanceKm: element.distance.value / 1000, // meters to km
      durationMin: element.duration.value / 60,   // seconds to minutes
    };
  } catch (err) {
    console.error("Google Maps API error:", err);
    throw err;
  }
}
