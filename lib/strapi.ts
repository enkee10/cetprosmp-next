export async function getFromStrapi(
    path: string,
    params = "",
    secure = false,
    revalidate?: number
) {
    const url = `${process.env.STRAPI_URL}/api/${path}${params ? `?${params}` : ""}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (secure && process.env.STRAPI_TOKEN) {
        headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;
    }

    const options: RequestInit = {
        headers,
        next: revalidate ? { revalidate } : undefined,
        cache: secure ? "no-store" : "force-cache",
    };

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Error Strapi: ${res.statusText}`);
    return res.json();
}
