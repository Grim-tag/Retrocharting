import TranslationsEditor from "@/components/admin/TranslationsEditor";
import { getDictionary } from "@/lib/get-dictionary";

function flattenObject(obj: any, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const nested = flattenObject(obj[key], prefix + key + '.');
            Object.assign(result, nested);
        } else {
            result[prefix + key] = obj[key];
        }
    }
    return result;
}

export default async function AdminTranslationsPage() {
    // 1. Load full dictionaries (merged with DB)
    const dictEn = await getDictionary('en');
    const dictFr = await getDictionary('fr');

    // 2. Flatten them for the editor
    const flatEn = flattenObject(dictEn);
    const flatFr = flattenObject(dictFr);

    // 3. Admin Key for saving
    const adminKey = process.env.ADMIN_SECRET_KEY || "admin_secret_123";

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-white uppercase tracking-wider">Translation Management</h2>
            <TranslationsEditor
                initialEn={flatEn}
                initialFr={flatFr}
                adminKey={adminKey}
            />
        </div>
    );
}
