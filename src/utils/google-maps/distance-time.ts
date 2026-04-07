// utils/googleDistance.ts
import axios from "axios";
import { env } from "../../config/environment.js"; // load API_KEY from .env
import { OrderStop } from "../../dto/order/createOrder.dto.js";

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

export async function calculateDistanceForClientOrder(fromAddressCoordinates: string, orderStops: OrderStop[]) {
    try {
      // i have a function that takes an origin and destination coordinates and gets distance in kms
      // so i want to calculate distance from fromAddressCoordinates to first stop, then from first stop to second stop, then from second stop to third stop and so on until the last stop and sum them up to get the total distance for the order
      let totalDistance = 0;
      let origin = fromAddressCoordinates;
      for (const stop of orderStops) {
        const destination = stop.toAddress.coordinates;
        const {distanceMeters, durationMinutes} = await getDrivingDistanceInKm(origin, destination);
        console.log(`Distance from ${origin} to ${destination}: ${distanceMeters} km, duration: ${durationMinutes} minutes`);
        totalDistance += distanceMeters;
        origin = destination; // next origin is the current stop's destination
      }
      return totalDistance;
    }
    catch (error) {
      console.error("Error calculating distance for client order:", error.message);
      throw new Error(`Error calculating distance: ${error.message}`);
    }
  }
