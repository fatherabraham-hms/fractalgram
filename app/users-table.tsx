'use client';

import {
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Table
} from '@/components/ui/table';
import { RespectUser } from '@/lib/dtos/respect-user.dto';
import { useEffect, useState } from 'react';
import { getUsers } from '@/app/actions';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { SESSION_POLLING_INTERVAL } from '../data/constants/app_constants';
import { RiCheckboxCircleFill } from 'react-icons/ri';
import { SessionCreator } from "@/components/session-creator/session-creator";
import { Progress } from "@chakra-ui/react";
import * as React from "react";


export function UsersTable() {
  const [users, setUsers] = useState<Partial<RespectUser[]>>([]);
  const [query, setQuery] = useState('');
  const [groupAddresses, setGroupAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const offset = 0;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const result: Partial<RespectUser[]> | unknown = await getUsers(query, offset);
        const users = result as Partial<RespectUser[]>;
        setUsers(users || []);
      } catch {
        toast.error('Could not fetch Users!');
      }
    };
    fetchUserData();
    const interval = setInterval(fetchUserData, SESSION_POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [query, offset]);

  if (isLoading) return <Progress size="xs" isIndeterminate colorScheme={'cyan'} />;

  return (
    <>
      {
        <SessionCreator groupAddresses={groupAddresses} />
      }
      <br />
      <br />
      <form className="border shadow-sm rounded-lg">
        {/*<Input placeholder='Search for a user' />*/}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="max-w-[50px]"></TableHead>
              <TableHead className="max-w-[150px]">Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">
                Wallet Address
              </TableHead>
              <TableHead className="hidden md:table-cell">Username</TableHead>
              <TableHead className="hidden md:table-cell">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => (
              <UserRow
                key={user.walletaddress}
                user={user}
                groupAddresses={groupAddresses}
                setGroupAddresses={setGroupAddresses}
              />
            ))}
          </TableBody>
        </Table>
      </form>
    </>
  );
}

function UserRow({ user, groupAddresses, setGroupAddresses }: {
  user: RespectUser,
  groupAddresses: string[],
  setGroupAddresses: any
}) {
  function handleCheckbox(event: any) {
    if (event.target.checked) {
      setGroupAddresses([...groupAddresses, event.target.value]);
    } else {
      setGroupAddresses(groupAddresses.filter((address) => address !== event.target.value));
    }
  }

  const disabledStyle = 'bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed';
  return (
    <TableRow className={!user.loggedin ? disabledStyle : ''}>
      <TableCell>
        <input className={!user.loggedin ? disabledStyle : ''}
               disabled={!user.loggedin} type="checkbox" value={user.walletaddress} onClick={handleCheckbox} />
      </TableCell>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell className="hidden md:table-cell">{user.email}</TableCell>
      <TableCell className="font-medium">{user.walletaddress}</TableCell>
      <TableCell>{user.username}</TableCell>
      <TableCell>
        {
          user.loggedin && <RiCheckboxCircleFill color={'green'} size={24} />
        }
        {
          !user.loggedin && <Badge color={'red'}>Not Logged In</Badge>
        }
      </TableCell>
    </TableRow>
  );
}
