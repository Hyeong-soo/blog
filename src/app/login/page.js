'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage(`에러 발생: ${error.message}`);
        } else {
            setMessage('로그인 링크를 이메일로 보냈습니다! 확인해주세요.');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <div className="bg-white p-8 rounded-lg shadow-md border">
                <h2 className="text-2xl font-bold mb-6 text-center">로그인</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            이메일 주소
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-50"
                    >
                        {loading ? '전송 중...' : '매직 링크 보내기'}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-3 rounded text-sm ${message.includes('에러') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
