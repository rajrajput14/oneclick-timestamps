export function getCheckoutUrl(baseUrl: string, userId: string, metadata: Record<string, string | number> = {}) {
    const url = new URL(baseUrl);
    url.searchParams.set('checkout[custom][user_id]', userId);
    url.searchParams.set('custom[user_id]', userId);

    // Add any additional metadata (like minutes: 500, type: addon)
    Object.entries(metadata).forEach(([key, value]) => {
        url.searchParams.set(`checkout[custom][${key}]`, String(value));
        url.searchParams.set(`custom[${key}]`, String(value));
        url.searchParams.set(key, String(value)); // Extra redundancy
    });

    return url.toString();
}
