'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { logger } from '../lib/logger';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Menu } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from './ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

const navLinkClass =
  'group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-[#D0620D] text-gray-700';

export default function Navbar() {
  const { currentUser, isAdmin, isTeamOwner, logout, loading } = useAuth();
  const router = useRouter();

  logger.log('🧭 Navbar render', { loading, isAdmin, isTeamOwner });

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      logger.error('Error logging out:', error);
    }
  };

  const publicLinks = [
    { label: 'Home', href: '/' },
    { label: 'Teams', href: '/teams' },
    { label: 'About', href: '/about' },
  ];

  const adminLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Auction', href: '/auction' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 p-3 sm:p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 mx-2 sm:mx-4 lg:mx-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">

          {/* ── Desktop ── */}
          <div className="hidden lg:flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/assets/uiuvccuplogo.png"
                alt="UIU VC Cup Logo"
                width={38}
                height={38}
                className="rounded-full"
              />
              <span className="text-lg font-bold text-gray-900 tracking-tight">UIU VC Cup</span>
            </Link>

            {/* Centre links */}
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {publicLinks.map(({ label, href }) => (
                  <NavigationMenuItem key={href}>
                    <NavigationMenuLink href={href} className={navLinkClass}>
                      {label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {isAdmin && adminLinks.map(({ label, href }) => (
                  <NavigationMenuItem key={href}>
                    <NavigationMenuLink href={href} className={navLinkClass}>
                      {label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {isTeamOwner && (
                  <NavigationMenuItem>
                    <NavigationMenuLink href="/team-dashboard" className={navLinkClass}>
                      My Team
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Auth */}
            <div className="flex items-center gap-3">
              {loading ? (
                <Skeleton className="h-9 w-20 rounded-lg" />
              ) : !currentUser ? (
                <Button asChild size="sm">
                  <Link href="/login">Login</Link>
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-800">
                      {isAdmin ? 'Admin' : isTeamOwner ? 'Team Owner' : 'User'}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                      {currentUser.email}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile ── */}
          <div className="flex lg:hidden items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/uiuvccuplogo.png"
                alt="UIU VC Cup Logo"
                width={34}
                height={34}
                className="rounded-full"
              />
              <span className="font-bold text-gray-900 text-sm">UIU VC Cup</span>
            </Link>

            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>
                    <Link href="/" className="flex items-center gap-2">
                      <Image
                        src="/assets/uiuvccuplogo.png"
                        alt="UIU VC Cup Logo"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <span className="font-bold text-gray-900">UIU VC Cup</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-1">
                  {publicLinks.map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-[#D0620D] hover:bg-orange-50 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}

                  {isAdmin && (
                    <>
                      <div className="my-2 border-t border-gray-100" />
                      <p className="px-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Admin</p>
                      {adminLinks.map(({ label, href }) => (
                        <Link
                          key={href}
                          href={href}
                          className="px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-[#D0620D] hover:bg-orange-50 transition-colors"
                        >
                          {label}
                        </Link>
                      ))}
                    </>
                  )}

                  {isTeamOwner && (
                    <Link
                      href="/team-dashboard"
                      className="px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-[#D0620D] hover:bg-orange-50 transition-colors"
                    >
                      My Team
                    </Link>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {loading ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : !currentUser ? (
                      <Button asChild className="w-full">
                        <Link href="/login">Login</Link>
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="px-1">
                          <p className="text-xs font-semibold text-gray-800">
                            {isAdmin ? 'Admin' : isTeamOwner ? 'Team Owner' : 'User'}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleLogout}>
                          Logout
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
}