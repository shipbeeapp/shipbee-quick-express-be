// utils/googleDistance.ts
import axios from "axios";
import { env } from "../../config/environment.js"; // load API_KEY from .env

export async function getDrivingDistanceInKm(
  origin: string,
  destination: string
): Promise<{ distanceMeters: number | null, durationMinutes: number | null } | null> {
  try {
    console.log(`Fetching distance from ${origin} to ${destination}`);
    const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
      params: {
        origins: origin,
        destinations: destination,
        key: env.GOOGLE_MAPS_API_KEY,
        mode: "driving",
      },
    });
    const distanceMeters = response.data.rows?.[0]?.elements?.[0]?.distance?.value;
    const durationMinutes = Math.ceil(response.data.rows?.[0]?.elements?.[0]?.duration?.value / 60);
    return {
        distanceMeters: distanceMeters != null ? distanceMeters / 1000 : null,
        durationMinutes: durationMinutes != null ? durationMinutes : null
    };
  } catch (error) {
    console.error("Failed to fetch distance from Google Maps:", error);
    return null;
  }
}
