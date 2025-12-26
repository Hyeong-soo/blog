import Link from 'next/link';
import Image from 'next/image';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import DeleteJournalButton from "@/components/DeleteJournalButton";

export default function JournalCard({ journal }) {

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
                        <div className="flex items-start gap-2">
                            <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                {journal.title}
                            </CardTitle>
                            {journal.is_draft && (
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                    임시저장
                                </Badge>
                            )}
                        </div>
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
                            <DeleteJournalButton journalId={journal.id} />
                        </div>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
}
