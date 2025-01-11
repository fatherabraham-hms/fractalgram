'use client';
import { usePrivy } from '@privy-io/react-auth';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../data/context/Contexts';

export default function IndexPage() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const { ready, authenticated } = usePrivy();
  const [navigationInitiated, setNavigationInitiated] = useState(false);

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
    if (ready && !authenticated && !navigationInitiated) {
      setNavigationInitiated(true);
      router.push('/login');
    } else if (ready && authenticated && !navigationInitiated) {
      setNavigationInitiated(true);
      routeToAppropriatePage();
    }
  }, [authenticated, authContext.hasProfile]);

  return (<main className="flex flex-1 flex-col"></main>);
}
