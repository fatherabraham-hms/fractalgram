'use client';

import { RespectUser } from '@/lib/dtos/respect-user.dto';
import { useContext, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import {
  ConsensusSessionSetupModel,
  Vote
} from '@/lib/models/consensus-session-setup.model';
import {
  getConsensusSetupAction,
  getVotingRoundMultiAction,
  setSingleRankingConsensusStatusAction,
  setSingleVoteAction
} from '@/app/actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { VOTING_ROUND_POLLING_INTERVAL } from '../data/constants/app_constants';
import * as React from 'react';
import { Box, chakra, Container, Progress } from '@chakra-ui/react';
import { AuthContext } from '../data/context/Contexts';

// TODO: https://tailwindcomponents.com/component/radio-buttons

export function RankingSelector({
  consensusSessionId
}: {
  consensusSessionId: number;
}) {
  const router = useRouter();
  const [votingRound, setVotingRound] = useState<Vote[]>([]);
  const [currentRankNumber, setCurrentRankNumber] = useState<number | null>(
    null
  );
  const [consensusReached, setConsensusReached] = useState(false);
  const [hasClickedRadionButton, setHasClickedRadionButton] = useState(false);
  const [groupCount, setGroupCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [rankingConfig, setRankingConfig] = useState({
    groupNum: 1,
    attendees: [],
    rankingScheme: 'numeric-descending',
    votes: []
  } as ConsensusSessionSetupModel | null);
  const authContext = useContext(AuthContext);

  const fetchConsensusSetup = async (): Promise<void> => {
    getConsensusSetupAction(consensusSessionId).then((setup) => {
      setRankingConfig(setup);
      setLoading(false);
    });
  };

  // Short Poll: first execute the fetchAvailableRankings function, then pass the result to fetchConsensusStatus
  const fetchVotingRoundMultiAction = async () => {
    setLoading(true);
    getVotingRoundMultiAction(consensusSessionId).then((resp) => {
      setLoading(false);
      if (resp?.remainingRankings && resp?.remainingRankings.length > 0) {
        setCurrentRankNumber(resp?.remainingRankings[0]);
      }
      setGroupCount(resp?.groupMemberCount);
      setTotalCount(
        resp?.currentVotesForRanking.reduce(
          (acc: number, ranking: Vote) => acc + ranking.count,
          0
        ) || 0
      );
      setConsensusReached(resp?.hasConsensusOnRanking);
      setRankingConfig({
        groupNum: 1,
        attendees: (resp?.remainingAttendees as RespectUser[]) || [],
        rankingScheme: 'numeric-descending',
        votes: resp?.currentVotesForRanking || []
      });
      setVotingRound(resp?.currentVotesForRanking || []);
      if (resp?.remainingAttendees.length === 0) {
        clearInterval(intervalId!);
        router.push(`/play/${consensusSessionId}/final`);
      }
    });
  };

  useEffect(() => {
    // INITIALIZE
    if (consensusSessionId) {
      if (rankingConfig?.attendees.length === 0) {
        fetchConsensusSetup();
      }
    }
    fetchVotingRoundMultiAction();

    const interval = setInterval(
      fetchVotingRoundMultiAction,
      VOTING_ROUND_POLLING_INTERVAL
    );
    setIntervalId(interval);
    return () => clearInterval(interval);
  }, []);

  function setRanking(
    walletAddress: string,
    attestation: 'upvote' | 'downvote'
  ) {
    if (!walletAddress || !attestation) {
      return;
    }
    const user = rankingConfig?.attendees.find(
      (user: RespectUser) => user.walletaddress === walletAddress
    );
    if (user && rankingConfig?.rankingScheme === 'numeric-descending') {
      handleNumericVote(user);
    }
  }

  function handleNumericVote(user: RespectUser) {
    if (!user || !currentRankNumber) {
      return;
    }
    setSingleVoteAction(
      consensusSessionId,
      currentRankNumber!,
      user.walletaddress
    )
      .then((currentVotesResp) => {
        if (Array.isArray(currentVotesResp) && currentVotesResp.length > 0) {
          setVotingRound(currentVotesResp as Vote[]);
          const totalVotes = currentVotesResp.reduce(
            (acc, ranking) => acc + ranking.count,
            0
          );
          setTotalCount(totalVotes);
        }
        setHasClickedRadionButton(true);
      })
      .catch(() => toast.error('Oops! An error occured, please try again!'));
  }

  function nextLevel() {
    if (currentRankNumber === null) return;
    const nextRankNumber =
      rankingConfig?.rankingScheme === 'numeric-descending'
        ? currentRankNumber - 1
        : currentRankNumber + 1;
    setCurrentRankNumber(nextRankNumber);
    setSingleRankingConsensusStatusAction(consensusSessionId, currentRankNumber)
      .then(() => {
        toast.success('Consensus Saved!');
        setHasClickedRadionButton(false);
        if (rankingConfig?.attendees && rankingConfig?.attendees.length > 0) {
          rankingConfig.attendees.forEach((user: RespectUser) => {
            if (
              rankingConfig?.attendees?.length > 1 &&
              rankingConfig?.attendees.some(
                (u) => u.walletaddress === user.walletaddress
              )
            ) {
              const radio = document.querySelector(
                `input[type=radio][value="${user.walletaddress}"]`
              ) as HTMLInputElement;
              if (radio) {
                radio.checked = false;
              }
            }
          });
        }
        fetchVotingRoundMultiAction();
      })
      .catch(() => {
        toast.error('Oops! An error occured, please try again!');
      });
  }

  const calculateRankingPercentageForCandidate = (user: RespectUser) => {
    const totalVotes = votingRound.reduce(
      (acc, ranking) => acc + ranking.count,
      0
    );
    const candidateSupportVotes =
      votingRound.find(
        (ranking) => ranking.walletaddress === user.walletaddress
      )?.count || 0;
    return Math.round((candidateSupportVotes / totalVotes || 0) * 100);
  };

  // <pre>Rankings: { JSON.stringify(rankings[currentRankNumber], null, 2) }</pre>

  return (
    <Container maxW="6xl" py={2} px={4} marginBottom={14}>
      <Box
        border="1px solid"
        borderColor="gray.100"
        padding={4}
        marginBottom={4}
        rounded="md"
        boxShadow="sm"
        overflow="hidden"
        background="linear-gradient(to bottom, rgba(255, 255, 255, .25), rgba(255, 255, 255, 0))"
      >
        <chakra.h3
          fontSize="xl"
          fontWeight="bold"
          textAlign="center"
          color="gray.600"
        >
          Voting Level: {currentRankNumber}
        </chakra.h3>
        <chakra.h5
          fontSize="sm"
          fontWeight="bold"
          textAlign="center"
          color="gray.600">
          {totalCount} Votes cast by {groupCount} Attendees
        </chakra.h5>
      </Box>
      {consensusReached && authContext?.isAdmin && (
        <Alert
          message={'You have successfully reached consensus on this topic!'}
          variant={'success'}
          callback={nextLevel}
        />
      )}
      {consensusReached && !authContext?.isAdmin && (
        <Alert
          message={'You have successfully reached consensus on this topic!'}
          variant={'success'}
        />
      )}
      <form className="border shadow-md rounded-lg">
        {loading && <Progress size="xs" isIndeterminate colorScheme={'cyan'} />}
        {rankingConfig &&
          rankingConfig?.attendees?.length > 0 &&
          rankingConfig?.attendees?.map((user: RespectUser) => (
            <div key={user.walletaddress} className={'flex items-center'}>
              <div className={'flex-grow-0 p-4'}>
                <input
                  type={'radio'}
                  name={'rankings'}
                  value={user?.walletaddress}
                  onChange={() => setRanking(user.walletaddress, 'upvote')}
                />
              </div>
              <div
                className={`w-full p-4 ${user.loggedin ? 'border-b dark:border-neutral-700' : 'border-b dark:border-red-500'}`}
              >
                <div>
                  <label className="text-lg font-medium text-gray-900 dark:text-gray-100 mr-2">
                    {user.name}
                  </label>
                  <div className="text-sm font-medium text-gray-400 dark:text-gray-100">
                    {user.walletaddress}
                  </div>
                </div>
                {hasClickedRadionButton && (
                  <div>
                    <div
                      className={
                        `ms-[calc(${calculateRankingPercentageForCandidate(user)}%-1.25rem)] ` +
                        'inline-block mb-2 py-0.5 px-1.5 bg-blue-50 border border-blue-200 text-xs font-medium text-blue-600 rounded-lg dark:bg-blue-800/30 dark:border-blue-800 dark:text-blue-500'
                      }
                    >
                      {`${calculateRankingPercentageForCandidate(user)}%`}
                    </div>
                    <div
                      className="flex w-full h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700"
                      role="progressbar"
                    >
                      <div
                        style={{
                          width: `${calculateRankingPercentageForCandidate(user)}%`
                        }}
                        className={`flex flex-col justify-center rounded-full overflow-hidden bg-blue-600 text-xs text-white text-center whitespace-nowrap transition duration-500 dark:bg-blue-500`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
      </form>
    </Container>
  );
}
