import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import JournalCard from '@/components/JournalCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PenLine, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "홈",
  description: "AI와 함께하는 스마트한 일기 작성. 오늘의 기록을 확인하세요.",
};

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
    <div className="space-y-10">
      {/* Hero Section for Unauthenticated Users */}
      {!user && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/10 p-8 md:p-12">
          <div className="relative z-10 text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
              <Sparkles className="h-4 w-4" />
              인턴의, 인턴에 의한, 인턴을 위한
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              오늘 하루도 수고했어요 ✨
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              인턴 생활의 크고 작은 순간들을 기록하세요. AI가 당신의 성장을 함께 기록해드려요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all" asChild>
                <Link href="/login">시작하기</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 bg-background/50 backdrop-blur-sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </section>
      )}

      {/* Section Header */}
      <section className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">나의 인턴 일지 📝</h2>
          <p className="text-muted-foreground text-sm">성장의 발자취를 확인해보세요</p>
        </div>
        {user && (
          <Button className="rounded-full shadow-sm gap-2" asChild>
            <Link href="/write">
              <PenLine className="h-4 w-4" />
              일기쓰기
            </Link>
          </Button>
        )}
      </section>

      {/* Journal Grid */}
      <section className="grid gap-6">
        {journals && journals.length > 0 ? (
          journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        ) : (
          <Card className="border border-dashed border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
              <div className="bg-muted/50 size-20 rounded-full flex items-center justify-center text-muted-foreground/40">
                <PenLine className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">아직 기록이 없어요</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {user
                    ? "첫 출근의 설렘부터 퇴근 후의 회고까지, 인턴 생활의 모든 순간을 기록해보세요."
                    : "로그인하고 나만의 인턴 성장 일기를 시작해보세요."
                  }
                </p>
              </div>
              {user ? (
                <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all gap-2" asChild>
                  <Link href="/write">
                    <PenLine className="h-4 w-4" />
                    첫 일기 작성하기
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
      </section>
    </div>
  );
}
