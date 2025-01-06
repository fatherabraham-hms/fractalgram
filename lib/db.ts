'use server';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, ne, lt, and, gt, count, not, inArray, desc } from 'drizzle-orm';
import { VercelPgDatabase } from 'drizzle-orm/vercel-postgres';
import {
  drizzle as LocalDrizzle,
  type PostgresJsDatabase
} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { UsersPgTable } from '@/lib/postgres_drizzle/users.orm';
import { ConsensusGroupsPgTable } from '@/lib/postgres_drizzle/consensus_groups.orm';
import { ConsensusSessionsPgTable } from '@/lib/postgres_drizzle/consensus_sessions.orm';
import { RespectUser } from '@/lib/dtos/respect-user.dto';
import { User_be_sessionsOrm } from '@/lib/postgres_drizzle/user_be_sessions.orm';
import { ConsensusSessionDto } from '@/lib/dtos/consensus-session.dto';
import { ConsensusGroupsMembersPgTable } from '@/lib/postgres_drizzle/consensus_group_members.orm';
import { ConsensusVotesPgTable } from '@/lib/postgres_drizzle/consensus_votes.orm';
import { ConsensusVotesDto } from '@/lib/dtos/consensus-votes.dto';
import { ConsensusStatusPgTable } from '@/lib/postgres_drizzle/consensus_status.orm';
import { PrivyMapPgTable } from '@/lib/postgres_drizzle/privy_map.orm';
import { User } from '@privy-io/server-auth';


// ************** TABLES ****************** //
const users = UsersPgTable;
const userBeSessions = User_be_sessionsOrm;
const consensusSessions = ConsensusSessionsPgTable;
const consensusGroups = ConsensusGroupsPgTable;
const consensusGroupMembers = ConsensusGroupsMembersPgTable;
const consensusVotes = ConsensusVotesPgTable;
const consensusStatus = ConsensusStatusPgTable;
const privyMap = PrivyMapPgTable;

// https://www.thisdot.co/blog/configure-your-project-with-drizzle-for-local-and-deployed-databases
let db: | VercelPgDatabase<Record<string, never>>
  | PostgresJsDatabase<Record<string, never>>;

if (process.env.NODE_ENV === 'production') {
  db = drizzle(
    neon(process.env.POSTGRES_URL!)
  );
} else {
  const migrationClient = postgres(process.env.POSTGRES_URL as string);
  db = LocalDrizzle(migrationClient, {
    logger: false
  });
}

// ************** PrivyMapPgTable ****************** //
export async function getPrivyMapByUserId(userId: number) {
  return db.select().from(privyMap).where(eq(privyMap.userid, userId));
}

export async function createPrivyMap(privyMapData: any, userId: number) {
  const createMapResp = await db.insert(privyMap).values({
    userid: userId,
    sessionid: privyMapData.sessionId.toString(),
    appid: privyMapData.appId,
    issuer: privyMapData.issuer,
    issuedat: privyMapData.issuedAt as number,
    expiration: privyMapData.expiration as number
  }).returning({
    id: privyMap.privymapid
  });
  if (createMapResp && createMapResp.length > 0) {
    return db.update(users).set({ privymapid: createMapResp[0].id }).where(eq(users.id, userId));
  }
}

// ************** UserBeSessionPgTable ****************** //
export type SelectUserBeSession = typeof userBeSessions.$inferSelect;

const sessionCache = new Map<string, { data: SelectUserBeSession[], timestamp: number }>();
function generateCacheKey(ipAddress: string, walletAddress: string, jwt: string): string {
  return `${ipAddress}-${walletAddress}-${jwt}`;
}
/**
 * Cache the session data for 1 hour
 * This data gets hit constantly, so we need to cache it to avoid performance probs
 * @param ipAddress
 * @param walletAddress
 * @param jwt
 */
export async function getBeUserSession(ipAddress: string, walletAddress: string, jwt: string): Promise<SelectUserBeSession[]> {
  const cacheKey = generateCacheKey(ipAddress, walletAddress, jwt);
  const cacheEntry = sessionCache.get(cacheKey);
  const oneHour = 1000 * 60 * 60;

  if (cacheEntry && (Date.now() - cacheEntry.timestamp < oneHour)) {
    return cacheEntry.data;
  }

  const session = await db.select().from(userBeSessions)
                          .where(and(
                            eq(userBeSessions.ipaddress, ipAddress),
                            eq(userBeSessions.walletaddress, walletAddress),
                            gt(userBeSessions.expires, new Date()),
                            eq(userBeSessions.jwt, jwt)
                          ));

  sessionCache.set(cacheKey, { data: session, timestamp: Date.now() });
  return session;
}

export async function createBeUserSession(session: any) {
  session.sessionid = undefined;
  if (!(session?.ipaddress && session?.jwt && session?.walletaddress)
    || !(session?.ipaddress?.length > 2 || !(session?.jwt?.length > 10) || !(session?.walletaddress?.length > 5))) {
    return null;
  }
  return db.insert(userBeSessions).values({
    ...session,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 4),
    created: new Date(),
    updated: new Date()
  });
}

export async function setBeSessionAsExpired(walletAddress: string) {
  return db.update(userBeSessions).set({
    expires: new Date()
  }).where(eq(userBeSessions.walletaddress, walletAddress));
}


// ************** UsersPgTable ****************** //
export type SelectUser = typeof users.$inferSelect;

export async function getAllUsers(
  search: string,
  offset: number
): Promise<{
  users: SelectUser[];
  newOffset: number | null;
}> {
  // Always search the full table, not per page
  if (search) {
    return {
      users: await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          privymapid: users.privymapid,
          telegram: users.telegram,
          walletaddress: users.walletaddress,
          loggedin: users.loggedin,
          lastlogin: users.lastlogin,
          permissions: users.permissions
        })
        .from(users)
        .where(and(eq(users.loggedin, true),gt(users.permissions, 0)))
        .orderBy(desc(users.loggedin))
        .limit(1000),
      newOffset: null
    };
  }

  if (offset === null) {
    return { users: [], newOffset: null };
  }

  const moreUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      privymapid: users.privymapid,
      telegram: users.telegram,
      walletaddress: users.walletaddress,
      loggedin: users.loggedin,
      lastlogin: users.lastlogin,
      permissions: users.permissions
    })
    .from(users)
    .where(and(eq(users.loggedin, true),gt(users.permissions, 0)))
    .orderBy(desc(users.loggedin))
    .limit(1000).offset(offset);
  const newOffset = moreUsers.length >= 20 ? offset + 20 : null;
  return { users: moreUsers, newOffset };
}

export async function deleteUserById(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

export async function setUserLoginStatusById(walletAddress: string, loggedIn: boolean) {
  let set: any = {
    loggedin: loggedIn,
    lastlogin: new Date()
  };
  if (!loggedIn) {
    set = {
      loggedin: loggedIn
    };
    // also log out BE session if they are logging out
    await setBeSessionAsExpired(walletAddress);
  }
  return db.update(users).set(set).where(eq(users.walletaddress, walletAddress));
}

export async function getUserProfileByWalletAddress(walletAddress: string) {
  return db.select({
    name: users.name,
    username: users.username,
    email: users.email,
    walletaddress: users.walletaddress,
    loggedin: users.loggedin,
    lastlogin: users.lastlogin,
    permissions: users.permissions,
    telegram: users.telegram
  }).from(users).limit(1).where(eq(users.walletaddress, walletAddress));
}

export async function getUserIdByWalletAddress(walletAddress: string) {
  return db.select({
    id: users.id
  }).from(users).limit(1).where(eq(users.walletaddress, walletAddress));
}

export async function getUserProfileByUsername(username: string) {
  return db.selectDistinct({
    name: users.name,
    username: users.username,
    email: users.email,
    walletaddress: users.walletaddress,
    loggedin: users.loggedin,
    lastlogin: users.lastlogin,
    permissions: users.permissions
  }).from(users).where(eq(users.username, username));
}

// TODO - add social accounts so we have a backup way to find users
export async function createUserProfile(user: User) {
  if (!user || user.wallet?.address === undefined || user.wallet.address?.length < 5) {
    return null;
  }
  return db.insert(users).values({
    name: '',
    username: '',
    email: user.email?.address || '',
    walletaddress: user.wallet.address,
    loggedin: true,
    lastlogin: new Date(),
    permissions: 1
  }).returning(
    { id: users.id }
  );
}

export async function updateUserProfile(user: Partial<RespectUser>) {
  if (!user || user.walletaddress === undefined || user.walletaddress?.length < 5) {
    return null;
  }

  const usersWithUsername = await getUserProfileByUsername(user.username!);
  if (usersWithUsername.length > 0 && usersWithUsername[0].walletaddress !== user.walletaddress) {
    return { message: 'Username already exists, find an unused name' };
  }

  return db.update(users).set({ ...user })
    .where(eq(users.walletaddress, user.walletaddress))
    .returning({
      name: users.name,
      username: users.username,
      email: users.email,
      walletaddress: users.walletaddress,
      loggedin: users.loggedin,
      lastlogin: users.lastlogin,
      permissions: users.permissions
    });
}

// ************** ConsensusSessionsPgTable ****************** //
export type ConsensusSessionDbDto = typeof consensusSessions.$inferSelect;

// TODO rename session status to voting session status to avoid confusion with consensus_session_status table
// values which indicate final consensus pushed on chain
export async function getConsensusSession(sessionid: number) {
  if (sessionid > 0) {
    return db.selectDistinct({
      sessionid: consensusSessions.sessionid,
      sessiontype: consensusSessions.sessiontype,
      rankinglimit: consensusSessions.rankinglimit,
      title: consensusSessions.title,
      description: consensusSessions.description,
      sessionstatus: consensusSessions.sessionstatus
    }).from(consensusSessions).where(
      and(eq(consensusSessions.sessionid, sessionid),
        ne(consensusSessions.sessionstatus, 3)));
  }
  return null;
}

export async function setSessionStatus(sessionid: number, status: number) {
  return db.update(consensusSessions).set({
    sessionstatus: status
  }).where(eq(consensusSessions.sessionid, sessionid));
}

export async function createConsensusSession(session: ConsensusSessionDto) {
  return db.insert(consensusSessions).values({
    sessiontype: session.sessiontype,
    rankinglimit: session.rankinglimit,
    title: session.title,
    description: session.description,
    sessionstatus: session.sessionstatus,
    modifiedbyid: session.modifiedbyid,
    created: new Date(),
  }).returning({
    sessionid: consensusSessions.sessionid
  });
}

export async function getFirstMatchingMemberOfSession(sessionid: number, walletaddress: string) {
  // select all user records that are in the consensusGroupMembers table for the given groupId by joining the users table with the consensusGroupMembers table
  return db.select({
    name: users.name,
    username: users.username,
    walletaddress: users.walletaddress
  }).from(users)
    .innerJoin(consensusGroupMembers, eq(users.id, consensusGroupMembers.userid))
    .innerJoin(consensusGroups, eq(consensusGroups.groupid, consensusGroupMembers.groupid))
    .innerJoin(consensusSessions, eq(consensusSessions.sessionid, consensusGroups.sessionid))
    .where(and(eq(users.walletaddress, walletaddress),
      lt(consensusSessions.sessionstatus, 3),
      eq(consensusGroups.sessionid, sessionid),
      eq(users.loggedin, true)))
    .limit(1);
}

export async function getRecentSessionsForUserWalletAddress(walletaddress: string) {
  return db.select({
    sessionid: consensusSessions.sessionid,
    sessionStatus: consensusSessions.sessionstatus,
    updated: consensusSessions.updated
  }).from(consensusSessions)
    .innerJoin(consensusGroups, eq(consensusGroups.sessionid, consensusSessions.sessionid))
    .innerJoin(consensusGroupMembers, eq(consensusGroupMembers.groupid, consensusGroups.groupid))
    .innerJoin(users, eq(users.id, consensusGroupMembers.userid))
    .where(and(eq(users.walletaddress, walletaddress),
      eq(users.loggedin, true)))
    .orderBy(desc(consensusSessions.updated))
    .limit(5);
}

// ************** ConsensusGroupsPgTable ****************** //
export type ConsensusGroupsDbDto = typeof consensusGroups.$inferSelect;

// TODO when do we inactivate a group? cron job?
export async function createConsensusGroup(consensusSessionId: number, groupAddresses: string[], userid: number) {
// console.log('createConsensusGroup');

  const group = await db.insert(consensusGroups).values({
    sessionid: consensusSessionId,
    groupstatus: 1,
    modifiedbyid: userid,
    created: new Date(),
    updated: new Date()
  }).returning({
    groupid: consensusGroups.groupid
  });

  if (!group || group.length === 0) {
    throw new Error('Group not created');
  }

  // loop through the groupAddresses, and insert a consensusGroupMembers record for each one
  for (const address of groupAddresses) {
    const userIdResp = await db.select({
      id: users.id
    }).from(users).where(eq(users.walletaddress, address));
    if (userIdResp && userIdResp.length === 0) {
      throw new Error('No user found');
    }
    await db.insert(consensusGroupMembers).values({
      groupid: group[0].groupid as number,
      userid: userIdResp[0].id,
      created: new Date(),
      updated: new Date()
    });
  }

  return true;
}

export async function getActiveGroupIdBySessionId(consensusSessionId: number) {
// console.log('getActiveGroupIdBySessionId');
  if (consensusSessionId > 0) {
    return db.select({
      groupid: consensusGroups.groupid
    }).from(consensusGroups).where(and(eq(consensusGroups.sessionid, consensusSessionId), eq(consensusGroups.groupstatus, 1)));
  }
  return null;
}

// TODO - make sure we exclude users who are already in a group from the list of users to add to a group
// ************** ConsensusGroupsMembersPgTable ****************** //
export async function getActiveGroupMembersByGroupId(groupId: number) {
// console.log('getActiveGroupMembersByGroupId');
  // select all user records that are in the consensusGroupMembers table for the given groupId by joining the users table with the consensusGroupMembers table
  // rewrite query as drizzle-orm
  return db.select({
    name: users.name,
    username: users.username,
    walletaddress: users.walletaddress
  }).from(users)
    .innerJoin(consensusGroupMembers, eq(users.id, consensusGroupMembers.userid))
    .innerJoin(consensusGroups, eq(consensusGroups.groupid, consensusGroupMembers.groupid))
    .innerJoin(consensusSessions, eq(consensusSessions.sessionid, consensusGroups.sessionid))
    .where(
      and(
        eq(consensusSessions.sessionstatus, 1),
        eq(consensusGroups.groupstatus, 1),
        eq(consensusGroups.groupid, groupId),
        eq(users.loggedin, true)));
}

// ************** UsersPgTable ****************** //

// ************** ConsensusVotesPgTable ****************** //

/**
 * Each user will only be allowed to vote 1 time in each round
 * No need to delete votes because changing the vote is just an overwrite of
 * the previous vote
 * @param input
 */
export async function castSingleVoteForUser(input: ConsensusVotesDto) {
// console.log('castConsensusVoteForUser');
  const voteIdResp = await db.select({
    voteid: consensusVotes.voteid
  }).from(consensusVotes)
    .where(and(eq(consensusVotes.sessionid, input.sessionid),
      eq(consensusVotes.groupid, input.groupid),
      eq(consensusVotes.modifiedbyid, input.modifiedbyid),
      eq(consensusVotes.rankingvalue, input.rankingvalue)));

  const valuesToUpsert = {
    voteid: voteIdResp.length > 0 ? voteIdResp[0].voteid : undefined,
    votedfor: input.votedfor,
    sessionid: input.sessionid,
    groupid: input.groupid,
    rankingvalue: input.rankingvalue,
    modifiedbyid: input.modifiedbyid,
    created: new Date(),
    updated: new Date()
  };

  if (voteIdResp.length > 0
    && typeof voteIdResp[0].voteid === 'number') {
    return db.update(consensusVotes).set(valuesToUpsert)
      .where(and(eq(consensusVotes.sessionid, input.sessionid),
        eq(consensusVotes.groupid, input.groupid),
        eq(consensusVotes.rankingvalue, input.rankingvalue),
        eq(consensusVotes.modifiedbyid, input.modifiedbyid),
        eq(consensusVotes.voteid, voteIdResp[0].voteid
        )));
  }
  return db.insert(consensusVotes).values(valuesToUpsert);
}

export async function getCurrentVotesForSessionByRanking(
  selectionType: 'walletaddress' | 'userid',
  sessionid: number,
  groupid: number,
  rankingValue: number): Promise<any> {
  // console.log('getCurrentVotesForSessionByRanking');
// TODO - add a way to check which vote belongs to current user?
  // need a way to re-check the radio if the user has already voted
  let select: any = {
    walletaddress: users.walletaddress,
    count: count(consensusVotes.votedfor)
  };
  if (selectionType === 'userid') {
    select = {
      id: users.id,
      count: count(consensusVotes.votedfor)
    };
  }
  const statement = db.select(select).from(consensusVotes)
    .innerJoin(consensusSessions, eq(consensusSessions.sessionid, consensusVotes.sessionid))
    .innerJoin(users, eq(users.id, consensusVotes.votedfor))
    .where(and(eq(consensusVotes.sessionid, sessionid),
      eq(consensusVotes.groupid, groupid),
      eq(consensusVotes.rankingvalue, rankingValue),
      lt(consensusSessions.sessionstatus, 2)));
  if (selectionType === 'userid') {
    statement.groupBy(users.id, consensusVotes.votedfor);
  } else {
    statement.groupBy(users.walletaddress, consensusVotes.votedfor);
  }
  // console.log(statement.toSQL());
  return statement;
}

/**
 * getRemainingAttendeesForSession
 * get remaining attendees who have not been saved to the consensus_votes table
 * @param consensusSessionId
 */
export async function getRemainingVoteCandidatesForSession(consensusSessionId: number) {
// console.log('getRemainingVoteCandidatesForSession');
  const existingConsensusResp = await db.select({ votedfor: consensusStatus.votedfor }).from(consensusStatus).where(
    eq(consensusStatus.sessionid, consensusSessionId));

  // on new sessions, consensusStatus does not have any matching records
  // don't join with consensusStatus in this case
  const shouldJoinFinalConsensus = existingConsensusResp && existingConsensusResp.length > 0;
  let useridsAlreadyHavingConsensus: number[] = [];
  if (shouldJoinFinalConsensus) {
    useridsAlreadyHavingConsensus = existingConsensusResp.map((vote) => vote.votedfor) as number[];
  }

  const baseWhere = and(
    eq(consensusSessions.sessionid, consensusSessionId),
    eq(consensusSessions.sessionstatus, 1)
  );

  const where = shouldJoinFinalConsensus
    ? and(baseWhere, not(inArray(users.id, useridsAlreadyHavingConsensus)))
    : baseWhere;

  const query = db.selectDistinct({
    name: users.name,
    username: users.username,
    walletaddress: users.walletaddress,
    loggedin: users.loggedin
  }).from(users)
    .innerJoin(consensusGroupMembers, eq(users.id, consensusGroupMembers.userid))
    .innerJoin(consensusGroups, eq(consensusGroups.groupid, consensusGroupMembers.groupid))
    .innerJoin(consensusSessions, eq(consensusSessions.sessionid, consensusGroups.sessionid))
    .leftJoin(consensusStatus, and(
      eq(consensusStatus.sessionid, consensusSessions.sessionid),
      eq(consensusStatus.votedfor, users.id)
    ))
    .where(where);

  const { sql, params } = query.toSQL();
  // console.log('SQL Query:', sql);
  // console.log('Parameters:', params);
  return query;
}

export async function getRankingsWithConsensusForSession(consensusSessionId: number, consensusSessionStatus: number, groupid: number) {
  // console.log('getExistingRankingValuesForSession');
  return db.selectDistinct({
    rankingvalue: consensusStatus.rankingvalue
  }).from(consensusStatus)
    .where(eq(consensusStatus.sessionid, consensusSessionId));
}

// ************** ConsensusStatusPgTable ****************** //

/** after consensus is reached for one level,
 * save that consensus to the consensus_status table
 * @param sessionid
 * @param rankingValue
 * @param votedFor
 * @param status
 * @param modifiedById
 */
export async function setSingleRankingConsensus(
  sessionid: number,
  rankingValue: number,
  votedFor: number,
  status: number,
  modifiedById: number) {
  // console.log('setSingleRankingConsensus');
  return db.insert(consensusStatus).values({
    consensusid: undefined,
    sessionid: sessionid,
    rankingvalue: rankingValue,
    votedfor: votedFor,
    consensusstatus: status,
    modifiedbyid: modifiedById,
    updated: new Date(),
    created: new Date()
  } as any);
}

/**
 * get all consensus winners for each ranking by consensussessionid
 * @param sessionid
 */
export async function getConsensusWinnersRankingsAndWalletAddresses(sessionid: number) {
  return db.select({
    votedFor: consensusStatus.votedfor,
    rankingvalue: consensusStatus.rankingvalue,
    walletaddress: users.walletaddress,
    name: users.name
  }).from(consensusStatus)
    .innerJoin(users, eq(users.id, consensusStatus.votedfor))
    .where(eq(consensusStatus.sessionid, sessionid))
    .groupBy(consensusStatus.votedfor, consensusStatus.rankingvalue, users.walletaddress, users.name)
    .orderBy(desc(consensusStatus.rankingvalue));
}

