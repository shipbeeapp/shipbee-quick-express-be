import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };

// Register English locale (required)
countries.registerLocale(enLocale);

/**
 * Converts a country name into ISO Alpha-2 code (DHL compatible)
 * Example: "Qatar" -> "QA"
 */
export function getCountryIsoCode(countryName: string): string | null {
  if (!countryName) return null;

  const code = countries.getAlpha2Code(countryName, "en");
  console.log(`Mapping country name "${countryName}" to ISO code:`, code);
  return code || null; // return null if not found
}