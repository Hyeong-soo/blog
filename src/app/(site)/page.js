import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import JournalCard from '@/components/JournalCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: journals, error } = await supabase
    .from('journals')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching journals:', error);
    return <div className="text-red-500">일지를 불러오는데 실패했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Login Prompt for Unauthenticated Users */}
      {!user && (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">✨ 나만의 일기를 시작해보세요</CardTitle>
            <CardDescription className="text-base">
              AI가 도와주는 특별한 일기 작성 경험을 만나보세요
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button size="lg" className="rounded-full px-8 shadow-md" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/login">회원가입</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">오늘의 기록</h2>
        {user && (
          <Button variant="default" size="sm" asChild>
            <Link href="/write">
              일기쓰기
            </Link>
          </Button>
        )}
      </section>

      <div className="grid gap-4">
        {journals && journals.length > 0 ? (
          journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        ) : (
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
              <div className="bg-muted size-16 rounded-full flex items-center justify-center text-muted-foreground/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">아직 작성된 일지가 없네요</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                  {user
                    ? "오늘의 소중한 순간들을 기록하기 시작해보세요. AI가 작성을 도와드립니다."
                    : "로그인하고 AI와 함께 특별한 일기를 작성해보세요."
                  }
                </p>
              </div>
              {user ? (
                <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all" asChild>
                  <Link href="/write">
                    첫 번째 일기 쓰기
                  </Link>
                </Button>
              ) : (
                <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all" asChild>
                  <Link href="/login">
                    로그인하고 시작하기
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
