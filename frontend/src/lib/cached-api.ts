import { cache } from 'react';
import { getProductById as fetchProductById } from './api';

// Deduplicate requests for Server Components
// This ensures generateMetadata and Page don't fetch the same data twice
export const getProductById = cache(async (id: number) => {
    return await fetchProductById(id);
});

import { getPublicProfile as fetchPublicProfile } from './api';

export const getPublicProfile = cache(async (username: string) => {
    return await fetchPublicProfile(username);
});
