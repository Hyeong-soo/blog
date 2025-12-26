export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/write', '/edit/', '/mypage'],
            },
        ],
        sitemap: 'https://internjournal.vercel.app/sitemap.xml',
    };
}
