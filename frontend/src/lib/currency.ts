export const EXCHANGE_RATE_USD_EUR = 0.95; // Hardcoded for MVP as requested

export function formatCurrency(amount: number, currency: 'USD' | 'EUR'): string {
    const locale = currency === 'EUR' ? 'fr-FR' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function convertCurrency(amount: number, from: 'USD' | 'EUR', to: 'USD' | 'EUR'): number {
    if (from === to) return amount;
    if (from === 'USD' && to === 'EUR') return amount * EXCHANGE_RATE_USD_EUR;
    if (from === 'EUR' && to === 'USD') return amount / EXCHANGE_RATE_USD_EUR;
    return amount;
}

export function getCurrencyForLang(lang: string): 'USD' | 'EUR' {
    return lang === 'fr' ? 'EUR' : 'USD';
}
