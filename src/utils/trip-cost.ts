import { VehicleType } from "./enums/vehicleType.enum.js";

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

export function getTripCostBasedOnKm(distance: number, vehicleType: VehicleType): number {
  if (typeof distance !== 'number' || distance < 0) {
    throw new Error('Distance must be a positive number');
  }
  switch (vehicleType) {
    case VehicleType.SEDAN_CAR :
    case VehicleType.MOTORCYCLE:
      if (distance > 0 && distance <= 10) {
        return 13; // Base cost for short trips
      } else if (distance > 10 && distance <= 20) {
        return 15; // Cost for medium trips
      } else if (distance > 20 && distance <= 30) {
        return 25; // Cost for longer trips
      } else {
        return Math.ceil(distance); // Cost for very long trips
      }
    // case VehicleType.VAN:
    //   if (distance > 0 && distance <= 10) return 35; // Base cost for short trips
    //   else if (distance > 10) return Math.ceil(35 + (distance - 10) * 3); // Cost for medium and long trips
    
    // case VehicleType.CHILLER_VAN:
    //   if (distance > 0 && distance <= 10) return 125; // Base cost for short trips
    //   else if (distance > 10 && distance <= 20) return 145;
    //   else if (distance > 20 && distance <= 30) return 205; // Cost for longer trips
    //   else return Math.ceil(200 + (distance - 30) * 6); // Cost for very long trips
    
    case VehicleType.FREEZER_VAN:
      if (distance > 0 && distance <= 10) return 125; // Base cost for short trips
      else if (distance > 10 && distance <= 20) return 155;
      else if (distance > 20 && distance <= 30) return 225; // Cost for longer trips
      else return Math.ceil(220 + (distance - 30) * 8); // Cost for very long trips
    
    case VehicleType.PICKUP_TRUCK_TWO_TONS:
      if (distance > 0 && distance <= 30) return 130; // Base cost for short trips
      else if (distance > 30 && distance <= 50) return 230;
      else return Math.ceil(230 + (distance - 50) * 4); // Cost for longer trips

    case VehicleType.PICKUP_TRUCK_THREE_TONS:
      if (distance > 0 && distance <= 30) return 160; // Base
      else if (distance > 30 && distance <= 50) return 260;
      else return Math.ceil(260 + (distance - 50) * 4); // Cost for longer trips
}
}

export function getTripCostBasedOnKg(weight: number, fromCountry: string, toCountry: string): any {
  if (typeof weight !== 'number' || weight < 1) {
    throw new Error('Weight must be a positive number');
  }

  if (fromCountry === 'Qatar') {

    const rates = {
      "Algeria":    { max: 30, first: 80.3, add: 28.6, transit: "4 to 5" },
      "Argentina":  { max: 20, first: 132.0, add: 55.0, transit: "5 to 7" },
      "Australia":  { max: 20, first: 158.4, add: 52.8, transit: "5 to 7" },
      "Austria":    { max: 30, first: 110.0, add: 22.0, transit: "5 to 7" },
      "Bahrain":    { max: 30, first: 68.2, add: 15.4, transit: "4 to 5" },
      "Bangladesh": { max: 20, first: 71.5, add: 22, transit: "5 to 7" },
      "Belgium":    { max: 30, first: 107.8, add: 28.6, transit: "5 to 7" },
      "Bosnia and Herzegov": { max: 30, first: 93.5, add: 22.0, transit: "5 to 7" },
      "Brazil":     { max: 30, first: 158.4, add: 52.8, transit: "5 to 7" },
      "Canada":     { max: 30, first: 158.4, add: 52.8, transit: "5 to 7" },
      "China":      { max: 30, first: 88, add: 55, transit: "4 to 5" },
      "Cyprus":     { max: 30, first: 95.7, add: 15.4, transit: "5 to 7" },
      "Czech Republic": { max: 30, first: 91.3, add: 28.6, transit: "5 to 7" },
      "Denmark":    { max: 30, first: 157.3, add: 28.6, transit: "5 to 7" },
      "Dijbouti":   { max: 20, first: 106.7, add: 15.4, transit: "4 to 5" },
      "Egypt":      { max: 20, first: 74.8, add: 17.6, transit: "4 to 5" },
      "Ethiopia":  { max: 30, first: 112.2, add: 15.4, transit: "5 to 7" },
      "Finland":    { max: 30, first: 124.3, add: 28.6, transit: "5 to 7" },
      "France":     { max: 30, first: 112.2, add: 37.4, transit: "5 to 7" },
      "Germany":    { max: 30, first: 146.3, add: 28.6, transit: "5 to 7" },
      "Ghana":      { max: 30, first: 148.5, add: 33, transit: "4 to 5" },
      "Great Britain": { max: 30, first: 148.5, add: 33, transit: "5 to 7" },
      "Greece":     { max: 25, first: 110.0, add: 22.0, transit: "7 to 10" },
      "Hong Kong":    { max: 30, first: 148.5, add: 33, transit: "5 to 7" },
      "Hungary":    { max: 30, first: 110, add: 22, transit: "5 to 7" },
      "India":      { max: 30, first: 91.3, add: 28.6, transit: "5 to 7" },
      "Indonesia":  { max: 30, first: 117.7, add: 37.4, transit: "7 to 10" },
      "Ireland":    { max: 30, first: 126.5, add: 33, transit: "5 to 7" },
      "Italy":      { max: 30, first: 118.8, add: 28.6, transit: "5 to 7" },
      "Japan":      { max: 30, first: 165, add: 44, transit: "5 to 7" },
      "Jordan":     { max: 30, first: 74.8, add: 17.6, transit: "4 to 5" },
      "Kenya":      { max: 30, first: 110, add: 22, transit: "5 to 7" },
      "Korea":     { max: 30, first: 90.2, add: 37.4, transit: "5 to 7" },
      "Kuwait":     { max: 30, first: 68.2, add: 15.4, transit: "5 to 7" },
      "Lebanon":    { max: 30, first: 82.5, add: 22, transit: "5 to 7" },
      "Luxembourg": { max: 30, first: 91.3, add: 28.6, transit: "5 to 7" },
      "Malaysia":   { max: 30, first: 126.5, add: 33, transit: "5 to 7" },
      "Morocco":    { max: 30, first: 88, add: 33, transit: "7 to 10" },
      "Nepal":      { max: 20, first: 85.8, add: 28.6, transit: "5 to 7" },
      "Netherlands":{ max: 30, first: 113.3, add: 28.6, transit: "7 to 10" },
      "New Zealand": { max: 20, first: 128.7, add: 59.4, transit: "7 to 10" },
      "Nigeria":    { max: 30, first: 110, add: 33, transit: "7 to 10" },
      "Norway":     { max: 30, first: 157.3, add: 28.6, transit: "5 to 7" },
      "Oman":       { max: 30, first: 68.2, add: 15.4, transit: "4 to 5" },
      "Pakistan":   { max: 30, first: 90.2, add: 15.4, transit: "5 to 7" },
      "Philippines":{ max: 30, first: 112.2, add: 37.4, transit: "5 to 7" },
      "Romania":    { max: 30, first: 115.5, add: 22.0, transit: "4 to 5" },
      "Saudi Arabia":{ max: 30, first: 68.2, add: 15.4, transit: "4 to 5" },
      "Singapore":  { max: 20, first: 115.5, add: 33, transit: "3 to 5" },
      "South Africa":{ max: 20, first: 126.5, add: 55, transit: "5 to 7" },
      "Spain":      { max: 20, first: 102.3, add: 28.6, transit: "5 to 7" },
      "Sri Lanka":  { max: 30, first: 88, add: 22, transit: "5 to 7" },
      "Sudan":      { max: 30, first: 74.8, add: 17.6, transit: "4 to 5" },
      "Sweden":     { max: 20, first: 157.3, add: 28.6, transit: "5 to 7" },
      "Switzerland":{ max: 30, first: 146.3, add: 28.6, transit: "5 to 7" },
      "Thailand":   { max: 30, first: 99, add: 33, transit: "5 to 7" },
      "Tunisia":    { max: 20, first: 80.3, add: 28.6, transit: "5 to 7" },
      "Turkey":     { max: 30, first: 121, add: 22, transit: "5 to 7" },
      "United Arab Emirates": { max: 30, first: 76.88, add: 17.36, transit: "4 to 5" },
      "United States of America": { max: 30, first: 158.4, add: 52.8, transit: "5 to 7" }
    }
      // 🔹 Add more countries from your sheet if needed

      if (!rates[toCountry]) {
      throw new Error(`No rates found for destination country: ${toCountry}`);
    }

    const { max, first, add } = rates[toCountry];

    if (weight > max) {
      return { error: `Exceeds max weight of ${max} KG for ${toCountry}` };
    }

    let cost = first;
    if (weight > 1) {
      cost += (weight - 1) * add;
    }

    return cost;
  }
  
  else if (fromCountry === 'United Arab Emirates') {
    const baseRate = 77;
    const additionalRatePerKg = 10;
    const cost = baseRate + (weight - 1) * additionalRatePerKg;
    return cost;
  }
  else {
    throw new Error(`Shipping from ${fromCountry} is not supported.`);
  }

}
  