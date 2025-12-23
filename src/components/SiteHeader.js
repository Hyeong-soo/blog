'use client';

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import AuthButton from "@/components/AuthButton"

export function SiteHeader() {
    const pathname = usePathname()

    return (
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="mr-8 flex items-center">
                    <Link href="/" className="text-xl font-bold tracking-tight text-foreground mr-6">
                        Intern Journal
                    </Link>

                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-transparent focus:bg-transparent", pathname === "/" ? "text-foreground font-semibold" : "text-muted-foreground")}>
                                    <Link href="/">
                                        홈
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <nav className="flex items-center gap-2">
                    <AuthButton />
                </nav>
            </div>
        </header>
    )
}
