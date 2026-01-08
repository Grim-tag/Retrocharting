
// Hardcoded rates (approx market value)
const RATES: Record<string, number> = {
    'USD': 1,
    'EUR': 0.95,
    'GBP': 0.79
};

export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: 'USD', label: 'USD ($)', symbol: '$' },
    { code: 'EUR', label: 'EUR (€)', symbol: '€' },
    { code: 'GBP', label: 'GBP (£)', symbol: '£' },
];

export function getCurrencySymbol(code: string): string {
    const found = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return found ? found.symbol : '$';
}

export function convertPrice(priceInUsd: number | null | undefined, targetCurrency: string): number | null {
    if (priceInUsd === null || priceInUsd === undefined) return null;
    const rate = RATES[targetCurrency] || 1;
    return priceInUsd * rate;
}

export function convertPriceToUSD(priceInLocal: number, sourceCurrency: string): number {
    const rate = RATES[sourceCurrency] || 1;
    if (rate === 0) return 0; // Safety
    return priceInLocal / rate;
}

export function formatPrice(priceInUsd: number | null | undefined, currency: string, locale: string = 'en-US'): string {
    if (priceInUsd === null || priceInUsd === undefined) return "--";

    // 1. Convert
    const converted = convertPrice(priceInUsd, currency);
    if (converted === null) return "--";

    // 2. Format
    // Use the requested currency for formatting
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(converted);
    } catch (e) {
        // Fallback
        return `${currency} ${converted.toFixed(2)}`;
    }
}
