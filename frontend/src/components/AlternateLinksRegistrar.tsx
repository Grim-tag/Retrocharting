'use client';

import { useEffect } from 'react';
import { useLanguageAlternate } from '@/context/LanguageAlternateContext';
import { usePathname } from 'next/navigation';

interface Props {
    en: string;
    fr: string;
}

export default function AlternateLinksRegistrar({ en, fr }: Props) {
    const { setAlternates } = useLanguageAlternate();
    const pathname = usePathname();

    useEffect(() => {
        // Register the alternates for the current view
        setAlternates({ en, fr });

        // Cleanup when unmounting (or navigating away)
        return () => {
            setAlternates({});
        };
    }, [pathname, en, fr, setAlternates]);

    return null; // This component renders nothing
}
