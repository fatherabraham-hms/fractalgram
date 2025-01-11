'use client';
import { Box, ChakraProvider, Container, extendTheme } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import { NavSidebar } from '@/components/app-shell/nav-sidebar';
import { UserPill } from '@privy-io/react-auth/ui';
import { useEffect, useState } from 'react';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { AuthContext, AuthContextType } from '../data/context/Contexts';
import { getUserProfile, isLoggedInUserAdmin } from '@/app/actions';
import Cookies from 'js-cookie';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentRoute = usePathname();
  const { ready, authenticated, user } = usePrivy();
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [authContext, setAuthContext] = useState<AuthContextType>({
    isFirstAuthContextInit: true,
    isAdmin: false,
    isLoggedIn: false,
    hasProfile: false,
    walletAddress: ''
  });

  const theme = extendTheme({
    fonts: {
      heading: `'Arvo', serif`,
      body: `'Roboto', sans-serif`,
    },
  });

  useEffect(() => {
    setIsMounted(true);
    if (
      ready &&
      authenticated &&
      authContext?.isFirstAuthContextInit &&
      user &&
      user?.wallet?.address
    ) {
      Cookies.set('activeWalletAddress', user.wallet.address, { expires: 1 });
      fetchBackendAuthContext();
    }

    if (ready && !authenticated) {
      router.push('/login');
    }
    if (authContext?.isLoggedIn && authContext?.hasProfile) {
      setLoading(false);
    }
  }, [ready, authenticated, authContext]);

  if (!isMounted) {
    return null;
  }

  function fetchBackendAuthContext() {
    if (ready && authenticated && user?.wallet && user.wallet.address) {
      Promise.all([
        isLoggedInUserAdmin(),
        getUserProfile(user.wallet.address)
      ]).then(([isAdmin, profile]) => {
        setAuthContext({
          isFirstAuthContextInit: false,
          isAdmin,
          isLoggedIn: authenticated,
          hasProfile: profile !== null && profile?.name !== '' && profile?.username !== '',
          walletAddress: user?.wallet?.address
        });
        setLoading(false);
      });
    }
  }

  return (
    <ChakraProvider theme={theme}>
      <AuthContext.Provider value={authContext}>
        <main className="flex flex-1 flex-col">
          <div
            className={`grid min-h-screen w-full lg:grid-cols-[280px_1fr] ${currentRoute === 'login' && !authContext.isLoggedIn ? 'hidden' : ''}`}>
            <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
              <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-[60px] items-center border-b px-5">
                  <Link
                    className="flex items-center gap-2 font-semibold"
                    href="/"
                  >
                    {/*<Logo />*/}
                    <span className="">Fractalgram</span>
                  </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                  {ready && authenticated && <NavSidebar />}
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40 justify-between lg:justify-end">
                <Link
                  className="flex items-center gap-2 font-semibold lg:hidden"
                  href="/">
                  {/*<Logo />*/}
                  <span className="">Fractalgram</span>
                </Link>
                <UserPill />
              </header>
              <Container
                maxW="10xl"
                py={10}
                px={4}
                height="100vh"
                width="100%"
                backgroundImage="url('/static/images/cells-tile-bg.png')">
                <Box
                  border="1px solid"
                  borderColor="gray.100"
                  padding={5}
                  rounded="md"
                  boxShadow="lg"
                  overflow="hidden"
                  background="linear-gradient(to bottom, rgba(255, 255, 255, .75), rgba(255, 255, 255, 0))">
                  {children}
                </Box>
              </Container>
            </div>
          </div>
          {currentRoute === 'login' && !authContext.isLoggedIn ? <div>{children}</div> : ''}
        </main>
      </AuthContext.Provider>
    </ChakraProvider>
  );
}
