'use client';

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import AuthButton from "@/components/AuthButton"
import { Sprout } from "lucide-react"

export function SiteHeader() {
    const pathname = usePathname()

    return (
        <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground sticky top-0 z-50 border-b border-primary-foreground/10 shadow-lg">
            <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-5xl">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
                        <div className="bg-primary-foreground/20 p-1.5 rounded-md">
                            <Sprout className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span>인턴일기</span>
                    </Link>

                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild className={cn(
                                    navigationMenuTriggerStyle(),
                                    "bg-transparent hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground text-sm font-medium transition-all hover:opacity-80"
                                )}>
                                    <Link href="/">
                                        홈
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <nav className="flex items-center">
                    <AuthButton />
                </nav>
            </div>
        </header>
    )
}
