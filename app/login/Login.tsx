'use client';

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter } from 'next/navigation';
import { Box } from '@chakra-ui/react';
import FunButton from '@/components/ui/fun-button';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

export function Login() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [loginComplete, setLoginComplete] = useState(false);
  const loginUtil = useLogin({
    onComplete: () => {
      setLoginComplete(true);
    },
  });

  useEffect(() => {
    if (ready && authenticated && loginComplete) {
      router.push('/');
    }
  }, [ready, authenticated, router, loginComplete]);

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success('Copied donation link to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  function handleLogin() {
    loginUtil.login();
  }

  return (
    <div
      style={{
        backgroundImage: "url('/static/images/cells-tile-bg.png')",
        backgroundRepeat: 'repeat'
      }}
      className="absolute top-0 left-0 h-[100%] w-[100%] flex flex-col gap-[50px] items-center justify-center"
    >
      <Box
        textAlign={'center'}
        maxW={'76vh'}
        border="1px solid"
        borderColor="gray.100"
        padding={5}
        rounded="2xl"
        boxShadow="lg"
        overflow="hidden"
        background="linear-gradient(to bottom, rgba(255, 255, 255, .25), rgba(255, 255, 255, 0))"
      >
        <h1 className="text-3xl font-bold color-white">
          Welcome to Fractalgram!
        </h1>
        <br />
        <p>
          Where players rank each other’s contributions to a collective goal and
          form consensus on the value of each contribution.
        </p>
        <br />
        <small><i>
          Fractalgram costs nights and weekends for several people. Please help fund this project!</i>
        </small>
        <br/>
        <small>
          Send ETH on Base or OP to{' '}
          <code
            onClick={() =>
              handleCopy('0x2D555CfB927Ca4c2512121568A81e955C7B34459')
            }
          >
            0x2D555CfB927Ca4c2512121568A81e955C7B34459
          </code>
        </small>
      </Box>
      <FunButton onClick={handleLogin}>Log in</FunButton>
    </div>
  );
}
