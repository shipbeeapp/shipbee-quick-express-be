const tripRates = {
    'Al Shamal': {
      'Al Daayen': 15,
      'Umm Salal': 15,
      'Doha': 15,
      'Al Rayyan': 15,
      'Al Wakrah': 35,
      'Al Shamal': 12,
      'Al Shahaniya': 12,
      'Al Khor': 12,
      'Al Thakira': 12,
    },
    'Al Shahaniya': {
      'Al Daayen': 15,
      'Umm Salal': 15,
      'Doha': 15,
      'Al Rayyan': 15,
      'Al Wakrah': 35,
      'Al Shamal': 12,
      'Al Shahaniya': 12,
      'Al Khor': 12,
      'Al Thakira': 12,
    },
    'Al Khor': {
      'Al Daayen': 15,
      'Umm Salal': 15,
      'Doha': 15,
      'Al Rayyan': 15,
      'Al Wakrah': 35,
      'Al Shamal': 12,
      'Al Shahaniya': 12,
      'Al Khor': 12,
      'Al Thakira': 12,
    },
    'Al Daayen': {
      'Al Rayyan': 15,
      'Al Wakrah': 15,
      'Al Shamal': 15,
      'Al Shahaniya': 15,
      'Al Khor': 15,
      'Al Thakira': 15,
      'Umm Salal': 12,
      'Doha': 12,
    },
    'Umm Salal': {
      'Al Rayyan': 15,
      'Al Wakrah': 15,
      'Al Shamal': 15,
      'Al Shahaniya': 15,
      'Al Khor': 15,
      'Al Thakira': 15,
      'Al Daayen': 12,
      'Doha': 12,
    },
    'Doha': {
      'Al Rayyan': 15,
      'Al Wakrah': 15,
      'Al Shamal': 25,
      'Al Shahaniya': 25,
      'Al Khor': 25,
      'Al Thakira': 25,
      'Al Daayen': 15,
      'Umm Salal': 15,
    },
    'Al Rayyan': {
      'Al Daayen': 12,
      'Umm Salal': 12,
      'Doha': 15,
      'Al Wakrah': 15,
      'Al Shamal': 25,
      'Al Shahaniya': 25,
      'Al Khor': 25,
      'Al Thakira': 25,
    },
    'Al Wakrah': {
      'Al Daayen': 15,
      'Umm Salal': 15,
      'Doha': 15,
      'Al Rayyan': 15,
      'Al Shamal': 35,
      'Al Shahaniya': 35,
      'Al Khor': 35,
      'Al Thakira': 35,
    },
    'Al Thakira': {
      'Al Daayen': 15,
      'Umm Salal': 15,
      'Doha': 15,
      'Al Rayyan': 15,
      'Al Wakrah': 35,
      'Al Shamal': 12,
      'Al Shahaniya': 12,
      'Al Khor': 12,
    },
  };

export function getTripCost(fromCity: string, toCity: string): number {
  if (!tripRates[fromCity] || tripRates[fromCity][toCity] == null) {
    throw new Error(`No rate found from ${fromCity} to ${toCity}`);
  }
  return tripRates[fromCity][toCity];
}

export function getTripCostBasedOnKm(distance: number): number {
  if (typeof distance !== 'number' || distance < 0) {
    throw new Error('Distance must be a positive number');
  }
  if (distance > 0 && distance <= 10) {
    return 13; // Base cost for short trips
  } else if (distance > 10 && distance <= 20) {
    return 15; // Cost for medium trips
  } else if (distance > 20 && distance <= 30) {
    return 25; // Cost for longer trips
  } else {
    return 25 + (distance - 30); // Cost for very long trips
  }
}
  