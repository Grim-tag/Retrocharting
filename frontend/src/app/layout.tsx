import './globals.css';
// This layout is strictily for the root not-found page.
// The main application lives in [lang]/layout.tsx

export const metadata = {
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
