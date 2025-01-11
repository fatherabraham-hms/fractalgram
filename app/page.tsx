'use client';
import { usePrivy } from '@privy-io/react-auth';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../data/context/Contexts';

export default function IndexPage() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const { ready, authenticated } = usePrivy();

  function routeToAppropriatePage() {
    if (authContext.isLoggedIn && !authContext.hasProfile) {
      router.push('/profile');
    } else if (authContext.hasProfile && authContext.isAdmin) {
      router.push('/groups');
    } else if (authContext.hasProfile && !authContext.isAdmin) {
      router.push('/play');
    }
  }

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
    } else if (ready && authenticated && !authContext.isFirstAuthContextInit) {
      routeToAppropriatePage();
    }
  }, [ready, authenticated, router, authContext]);

  return (<main className="flex flex-1 flex-col"></main>);
}
