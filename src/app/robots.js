export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/write', '/edit/', '/mypage'],
            },
        ],
        sitemap: 'https://intern-diary.vercel.app/sitemap.xml',
    };
}
