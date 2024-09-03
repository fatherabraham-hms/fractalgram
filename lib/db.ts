'use server';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, ne, lt, and, sql, gt, count } from 'drizzle-orm';
import { VercelPgDatabase } from 'drizzle-orm/vercel-postgres';
import {
  drizzle as LocalDrizzle,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import { UsersPgTable } from '@/lib/postgres_drizzle/users.orm';
import { ConsensusGroupsPgTable } from '@/lib/postgres_drizzle/consensus_groups.orm';
import { ConsensusSessionsPgTable } from '@/lib/postgres_drizzle/consensus_sessions.orm';
import { User } from '@/lib/dtos/user.dto';
import { User_be_sessionsOrm } from '@/lib/postgres_drizzle/user_be_sessions.orm';
import { ConsensusSessionDto } from '@/lib/dtos/consensus-session.dto';
import { ConsensusGroupsMembersPgTable } from '@/lib/postgres_drizzle/consensus_group_members.orm';
import { ConsensusVotesPgTable } from '@/lib/postgres_drizzle/consensus_votes.orm';
import { ConsensusVotesDto } from '@/lib/dtos/consensus-votes.dto';


// ************** TABLES ****************** //
const users = UsersPgTable;
const userBeSessions = User_be_sessionsOrm;
const consensusSessions = ConsensusSessionsPgTable;
const consensusGroups = ConsensusGroupsPgTable;
const consensusGroupMembers = ConsensusGroupsMembersPgTable;
const consensusVotes = ConsensusVotesPgTable;


// -- create a table to store userid with groupid and sessionid
// CREATE TABLE consensus_groups (groupid SERIAL PRIMARY KEY, sessionid INT REFERENCES consensus_sessions (sessionid), groupstatus SMALLINT, modifiedbyid integer REFERENCES users (id), created TIMESTAMP, updated TIMESTAMP);
//
// -- create a table to store group members
// CREATE TABLE consensus_group_members (groupid INT REFERENCES consensus_groups (groupid), userid INT REFERENCES users (id), created TIMESTAMP, updated TIMESTAMP);
//
// --- create table to handle consensus session votes
// CREATE TABLE consensus_votes (votedfor INT REFERENCES users (id), sessionid INT REFERENCES consensus_sessions (sessionid), groupid INT REFERENCES consensus_groups (groupid), rankingValue SMALLINT, modifiedbyid INT REFERENCES users (id), created TIMESTAMP, updated TIMESTAMP);
//
// -- create a table to store the final consensus with each ranking
// CREATE TABLE consensus_status (sessionid INT REFERENCES consensus_sessions (sessionid), rankingValue INT, votedfor INT REFERENCES users (id), consensusStatus SMALLINT, modifiedbyid integer REFERENCES users (id), created TIMESTAMP, updated TIMESTAMP);



// https://www.thisdot.co/blog/configure-your-project-with-drizzle-for-local-and-deployed-databases
let db: | VercelPgDatabase<Record<string, never>>
| PostgresJsDatabase<Record<string, never>>;

if (process.env.NODE_ENV === 'production') {
  db = drizzle(
    neon(process.env.POSTGRES_URL!, {
      fetchOptions: {
        cache: 'no-store'
      },
    })
  );
} else {
  const migrationClient = postgres(process.env.POSTGRES_URL as string);
  db = LocalDrizzle(migrationClient, {
    logger: true
  });
}

// ************** UserBeSessionPgTable ****************** //
export type SelectUserBeSession = typeof userBeSessions.$inferSelect;
export async function getBeUserSession(ipAddress: string, walletAddress: string, jwt: string) {
  return db.select().from(userBeSessions)
    .where(and(
      eq(userBeSessions.ipaddress, ipAddress),
      eq(userBeSessions.walletaddress, walletAddress),
      gt(userBeSessions.expires, new Date()),
      eq(userBeSessions.jwt, jwt)
    ));
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
    updated: new Date(),
  });
}

export async function deleteBeUserSession(ipAddress: string, walletAddress: string, jwt: string) {
  return db.delete(userBeSessions).where(and(eq(userBeSessions.ipaddress, ipAddress), eq(userBeSessions.walletaddress, walletAddress) && eq(userBeSessions.jwt, jwt)));
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
          telegram: users.telegram,
          walletaddress: users.walletaddress,
          loggedin: users.loggedin,
          lastlogin: users.lastlogin,
          permissions: users.permissions
        })
        .from(users)
        .where(eq(users.loggedin, true))
        .limit(1000),
      newOffset: null
    };
  }

  if (offset === null) {
    return { users: [], newOffset: null };
  }

  const moreUsers = await db.select().from(users).limit(20).offset(offset);
  const newOffset = moreUsers.length >= 20 ? offset + 20 : null;
  return { users: moreUsers, newOffset };
}

export async function deleteUserById(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

export async function setUserLoginStatusById(walletAddress: string, loggedIn: boolean) {
  await db.update(users).set({ loggedin: loggedIn, lastlogin: new Date() }).where(eq(users.walletaddress, walletAddress));
}

export async function getUserProfileByWalletAddress(walletAddress: string) {
  return db.select({
    name: users.name,
    username: users.username,
    email: users.email,
    walletaddress: users.walletaddress,
    loggedin: users.loggedin,
    lastlogin: users.lastlogin,
    permissions: users.permissions
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

export async function createUserProfile(user: Partial<User>) {
  if (!user || user.walletaddress === undefined || user.walletaddress?.length < 5 ){
    return null;
  }
  return db.insert(users).values({...user}).returning(
    { id: users.id }
  );
}

export async function updateUserProfile(user: Partial<User>) {
  if (!user || user.walletaddress === undefined || user.walletaddress?.length < 5 ){
    return null;
  }

  const usersWithUsername = await getUserProfileByUsername(user.username!);
  if (usersWithUsername.length > 0 && usersWithUsername[0].walletaddress !== user.walletaddress) {
    return { message: 'Username already exists, find an unused name' };
  }

  return db.update(users).set({...user})
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

export async function getConsensusSession(sessionid: number) {
  if (sessionid > 0) {
    return db.selectDistinct({
      sessionid: consensusSessions.sessionid,
      sessiontype: consensusSessions.sessiontype,
      rankinglimit: consensusSessions.rankinglimit,
      title: consensusSessions.title,
      description: consensusSessions.description,
      sessionstatus: consensusSessions.sessionstatus
    }).from(consensusSessions).where(and(eq(consensusSessions.sessionid, sessionid), ne(consensusSessions.sessionstatus, 3)));
  }
  return null;
}

export async function createConsensusSession(session: ConsensusSessionDto) {
  return db.insert(consensusSessions).values({
    sessiontype: session.sessiontype,
    rankinglimit: session.rankinglimit,
    title: session.title,
    description: session.description,
    sessionstatus: session.sessionstatus,
    modifiedbyid: session.modifiedbyid,
  }).returning({
    sessionid: consensusSessions.sessionid
  });
}

export async function isMemberOfSession(sessionid: number, walletaddress: string) {
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
    lt(consensusSessions.sessionstatus, 2),
    eq(consensusGroups.sessionid, sessionid),
    eq(users.loggedin, true)))
  .limit(1);
}

// ************** ConsensusGroupsPgTable ****************** //
export type ConsensusGroupsDbDto = typeof consensusGroups.$inferSelect;

export async function createConsensusGroup(consensusSessionId: number, groupAddresses: string[], userid: number) {
// create a transaction that inserts a row into consensus_groups and then inserts a row into consensus_group_members for each group member
  await db.transaction(async (trx) => {
    const groupInsert = trx.insert(consensusGroups).values({
      sessionid: consensusSessionId,
      groupstatus: 0,
      modifiedbyid: userid,
      created: new Date(),
      updated: new Date(),
    }).returning({
      groupid: consensusGroups.groupid
    });

    const group = await groupInsert;
    console.log('group', group);

    // loop through the groupAddresses, and insert a consensusGroupMembers record for each one
    for (const address of groupAddresses) {
      const userIdResp = await trx.select({
        id: users.id
      }).from(users).where(eq(users.walletaddress, address));
      if (userIdResp && userIdResp.length === 0) {
        throw new Error('No user found');
      }
      await trx.insert(consensusGroupMembers).values({
        groupid: group[0].groupid as number,
        userid: userIdResp[0].id,
        created: new Date(),
        updated: new Date(),
      });
    }
  });
  return true;
}

export async function getPendingGroupIdBySessionId(consensusSessionId: number) {
  if (consensusSessionId > 0) {
    return db.select({
      groupid: consensusGroups.groupid
    }).from(consensusGroups).where(and(eq(consensusGroups.sessionid, consensusSessionId), eq(consensusGroups.groupstatus, 0)));
  }
  return null;
}


// ************** ConsensusGroupsMembersPgTable ****************** //
export async function getLoggedInGroupMembersByGroupId(groupId: number) {
  // select all user records that are in the consensusGroupMembers table for the given groupId by joining the users table with the consensusGroupMembers table
  const query = sql`
    SELECT u.name, u.username, u.walletaddress 
    FROM users u
    INNER JOIN consensus_group_members cgm ON u.id = cgm.userid
    INNER JOIN consensus_groups cg ON cg.groupid = cgm.groupid
    INNER JOIN consensus_sessions cs ON cs.sessionid = cg.sessionid
    WHERE u.loggedin = true 
      AND cs.sessionstatus = 0 
      AND cg.groupstatus = 0 
      AND cgm.groupid = ${groupId}
  `;
  return db.execute(query);
}

// ************** UsersPgTable ****************** //

// ************** ConsensusVotesPgTable ****************** //

/**
 * Each user will only be allowed to vote 1 time in each round
 * No need to delete votes because changing the vote is just an overwrite of
 * the previous vote
 * @param input
 */
export async function castConsensusVoteForUser(input: ConsensusVotesDto) {
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
    updated: new Date(),
  }

  if (voteIdResp.length > 0
  && typeof voteIdResp[0].voteid === 'number') {
    const updateQuery = db.update(consensusVotes).set(valuesToUpsert)
      .where(and(eq(consensusVotes.sessionid, input.sessionid),
        eq(consensusVotes.groupid, input.groupid),
        eq(consensusVotes.rankingvalue, input.rankingvalue),
        eq(consensusVotes.modifiedbyid, input.modifiedbyid),
        eq(consensusVotes.voteid, voteIdResp[0].voteid
      )));
    return updateQuery;
  }
  return db.insert(consensusVotes).values(valuesToUpsert);
}

export async function getCurrentVotesForSessionByRanking(sessionid: number, groupid: number, rankingValue: number) {
// TODO - add a way to check which vote belongs to current user?
  // need a way to re-check the radio if the user has already voted
  return db.select({
    walletaddress: users.walletaddress,
    count: count(consensusVotes.votedfor),
  }).from(consensusVotes)
    .innerJoin(consensusSessions, eq(consensusSessions.sessionid, consensusVotes.sessionid))
    .innerJoin(users, eq(users.id, consensusVotes.votedfor))
    .where(and(eq(consensusVotes.sessionid, sessionid),
      eq(consensusVotes.groupid, groupid),
      eq(consensusVotes.rankingvalue, rankingValue),
      lt(consensusSessions.sessionstatus, 2)))
    .groupBy(users.walletaddress, consensusVotes.votedfor);
}
