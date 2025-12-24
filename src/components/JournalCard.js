'use client';

import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

export default function JournalCard({ journal }) {
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async () => {
        const confirmed = window.confirm('정말 삭제하시겠습니까?');
        if (!confirmed) return;

        const { error } = await supabase
            .from('journals')
            .delete()
            .eq('id', journal.id);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            router.refresh(); // Refresh page to remove deleted item
        }
    };

    return (
        <div className="relative group block h-full">
            {/* Overlay Link for the entire card */}
            <Link href={`/journal/${journal.id}`} className="absolute inset-0 z-0" prefetch={false}>
                <span className="sr-only">상세보기</span>
            </Link>

            <Card className="group-hover:shadow-lg transition-all relative z-10 pointer-events-none bg-card border-border flex flex-col md:flex-row overflow-hidden h-full md:min-h-52 p-0 gap-0">
                {/* Image Section - 40% width on desktop */}
                <div className="relative w-full md:w-2/5 aspect-video md:aspect-auto bg-muted">
                    <Image
                        src={journal.thumbnail_url || `https://picsum.photos/seed/${journal.id}/800/600`}
                        alt={journal.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 40vw"
                    />
                </div>

                {/* Content Section - 60% width on desktop */}
                <div className="flex flex-col w-full md:w-3/5">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {journal.title}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="px-6 flex-grow">
                        <p className="text-muted-foreground line-clamp-3 text-base leading-relaxed">
                            {journal.content?.replace(/<[^>]*>/g, '')}
                        </p>
                    </CardContent>

                    <CardFooter className="p-6 pt-4 flex justify-between items-center text-sm text-muted-foreground mt-auto">
                        <div className="flex items-center gap-2">
                            {/* User avatar placeholder could go here */}
                            <span>{new Date(journal.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-2 relative z-20 pointer-events-auto">
                            <Button variant="ghost" size="icon-sm" asChild>
                                <Link href={`/edit/${journal.id}`} aria-label="수정">
                                    <Edit className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleDelete}
                                aria-label="삭제"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
}
