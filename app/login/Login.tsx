'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Box } from "@chakra-ui/react";
import FunButton from "@/components/ui/fun-button";

export function Login() {
  const { login, ready, authenticated } = usePrivy();
  const router = useRouter();
  if (ready && authenticated) {
    router.push('/');
  }

  return (
    <div style={{ backgroundImage: "url('/static/images/cells-tile-bg.png')",
        backgroundRepeat: 'repeat'}}
        className="absolute top-0 left-0 h-[100%] w-[100%] flex flex-col gap-[50px] items-center justify-center">
      <Box
        textAlign={'center'}
        maxW={'76vh'}
        border="1px solid"
        borderColor="gray.100"
        padding={5}
        rounded="2xl"
        boxShadow="lg"
        overflow="hidden"
        background="linear-gradient(to bottom, rgba(255, 255, 255, .25), rgba(255, 255, 255, 0))">
        <h1 className="text-3xl font-bold color-white">Welcome to Fractalgram!</h1>
        <br/>
        <p>Where players rank each other’s contributions to a collective goal and form consensus on the value of each contribution.</p>
      </Box>
      <FunButton onClick={login}>Log in</FunButton>
    </div>
  );
}
