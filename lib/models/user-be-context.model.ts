import { UserBeSessionsModel } from '@/lib/models/user-be-sessions.model';
import { ConsensusSessionDto } from '@/lib/dtos/consensus-session.dto';

export type GroupMeta = {
  groupid: number;
  groupstatus: number;
  grouplabel: string;
  updated: Date;
};

export type UserBeContext = {
  beSession: UserBeSessionsModel | null;
  isAdmin: boolean;
  groupMeta: GroupMeta;
  groupMembers: {name: string | null, username: string | null, walletaddress: string | null}[];
  consensusSession: ConsensusSessionDto | null;
};
