'use client';
import { NavItem } from '@/app/nav-item';
import { UsersIcon } from '@/components/icons';
import { useContext } from 'react';
import { AuthContext } from '../../data/context/Contexts';
import { StarIcon } from 'lucide-react';

export function NavSidebar() {
  const authContext = useContext(AuthContext);

  const groups = <NavItem href="/groups">
    <UsersIcon className="h-4 w-4" />
    Groups
  </NavItem>;

  return (
    <nav className="grid items-start px-4 text-sm font-medium">
      <NavItem href="/play">
        <StarIcon className="h-4 w-4" />
        Play!
      </NavItem>
      {
        authContext?.isAdmin ? groups : ''
      }
      {/*<NavItem href="/settings">*/}
      {/*  <SettingsIcon className="h-4 w-4" />*/}
      {/*  Settings*/}
      {/*</NavItem>*/}
    </nav>
  );
}
