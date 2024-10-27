'use client';
import { useState, useEffect } from 'react';
import { getRecentSessionsForUserWalletAddressAction } from '@/app/actions';
import { SESSION_POLLING_INTERVAL } from '../../data/constants/app_constants';
import {
  Table,
  Tbody,
  Tr,
  Td,
  TableContainer, Spinner
} from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import { getSessionStatusLabel } from '@/lib/utils';
import * as React from 'react';
import { Url } from 'next/dist/shared/lib/router/router';

export function SessionList() {
  const [isLoading, setIsLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<
    {
      sessionid: number;
      sessionStatus: number | null;
      updated: Date;
    }[]
  >([]);

  const getSessions = async () => {
    return getRecentSessionsForUserWalletAddressAction().then((sessions) => {
      setRecentSessions(sessions);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    getSessions();
    const interval = setInterval(getSessions, SESSION_POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  function getSessionHref(session: { sessionid: number; sessionStatus: number | null }): Url {
    if (session.sessionStatus === 1 || session.sessionStatus === 2) {
      return `/play/${session.sessionid}/final`;
    }
    return `/session/${session.sessionid}`;
  }

  return (
    isLoading && <Spinner m={10}/>
    || <TableContainer>
      <Table colorScheme="gray" size="sm">
        {/*<Thead>*/}
        {/*  <Tr>*/}
        {/*    <Th>Session Number</Th>*/}
        {/*    <Th>Status</Th>*/}
        {/*    <Th>Created</Th>*/}
        {/*  </Tr>*/}
        {/*</Thead>*/}
        <Tbody>
          {recentSessions.map((session) => (
              <Tr key={session.sessionid}>
                <Td>
                  <Link href={getSessionHref(session)}>
                    Session #{session.sessionid}
                  </Link>
                  &#x2003;
                  {session.sessionStatus === 1 && (
                    <Link color="blue" href={`/play/${session.sessionid}`}>
                      Join
                    </Link>
                  )}
                </Td>
                <Td>{getSessionStatusLabel(session?.sessionStatus)}</Td>
                <Td>{session.updated.toLocaleDateString()}</Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
