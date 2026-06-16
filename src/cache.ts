const cache = new Map<string, { data: any; expiresAt: number }>();

export const getCache = (key: string) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
};

export const setCache = (key: string, data: any, ttlSeconds: number) => {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
};

export const clearCache = (key: string) => {
    for (const k of cache.keys()) {

        if (k.startsWith(key)) {
            cache.delete(k);
        }
    }
};

setInterval(() => {
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
        if (now > value.expiresAt) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000);
