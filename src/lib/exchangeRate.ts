/**
 * Fetches the official/mid-market EUR to HUF exchange rate from public currency APIs.
 * Includes multiple fallback APIs for high reliability.
 */
export async function fetchLiveEurHufRate(): Promise<number | null> {
  // Primary API: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.HUF && typeof data.rates.HUF === 'number') {
        return Math.round(data.rates.HUF * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate API failed:', err);
  }

  // Secondary API: api.exchangerate-api.com
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.HUF && typeof data.rates.HUF === 'number') {
        return Math.round(data.rates.HUF * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Secondary exchange rate API failed:', err);
  }

  // Tertiary API: cdn.jsdelivr.net currency-api
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
    if (res.ok) {
      const data = await res.json();
      if (data?.eur?.huf && typeof data.eur.huf === 'number') {
        return Math.round(data.eur.huf * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Tertiary exchange rate API failed:', err);
  }

  return null;
}
