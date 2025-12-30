'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ConsoleGameCatalog = dynamic(() => import('@/components/ConsoleGameCatalog'), {
    ssr: false,
    loading: () => <div className="text-white text-center py-20">Loading Catalog...</div>
});

export default function ConsoleGameCatalogWrapper(props: any) {
    return <ConsoleGameCatalog {...props} />;
}
