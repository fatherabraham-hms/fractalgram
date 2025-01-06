'use client';
import {
  getConsensusSessionWinnersAction,
  markConsensusVotesAsSubmittedOnchainAction, setProposalSubmissionFailedAction,
  userCanSubmitOnchainProposalAction
} from '@/app/actions';
import { useEffect, useMemo, useState } from 'react';
import { ConsensusWinnerModel } from '@/lib/models/consensus-winner.model';
import { Progress } from "@chakra-ui/react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import toast from 'react-hot-toast';
import { useOrclient } from '@ordao/privy-react-orclient';
import * as React from "react";
import FunButton from "@/components/ui/fun-button";
import { ProposeRes } from '@ordao/orclient';


export default function IndexPage({params}: { params: { sessionid: string };
}) {
  const [consensusRankings, setConsensusRankings] = useState<
    ConsensusWinnerModel[]
  >([]);
  const [isLoading, setLoading] = useState(true);
  const [sessionid, setSessionid] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const {
    user,
  } = usePrivy();
  const conWallets = useWallets();
  const wallet = user?.wallet;
  const userWallet = useMemo(() => {
    if (conWallets && conWallets.ready) {
      return conWallets.wallets.find(w => w.address === wallet?.address);
    }
  }, [wallet]);
  const orclient = useOrclient('of', userWallet);

  let warning = (
    <div className="flex items-center justify-center h-96">
      <h1 className="font-semibold text-lg md:text-2xl">
        Looks like you're not a member of consensus session #{sessionid}
        , sorry!
      </h1>
    </div>
  );

  const pushOnChainButton = (
    <FunButton
      className="mt-4 w-50 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => pushOnChain()}>
      Push on chain!
    </FunButton>
  );

  const pushOnchainCompleted = (
    <div className="flex items-center justify-center h-96">
      <h1 className="font-semibold text-lg md:text-2xl">
        Consensus session #{sessionid} has been submitted on chain!
      </h1>
    </div>
  );

  useEffect(() => {
    const sessionid = parseInt(params.sessionid);
    if (isNaN(sessionid)) {
      throw new Error('Invalid query parameter');
    }
    setSessionid(sessionid);
    getConsensusSessionWinnersAction(sessionid).then(
      (winnersResp) => {
        if (winnersResp && winnersResp.length > 0) {
          const results = winnersResp as unknown as ConsensusWinnerModel[];
          setConsensusRankings(results);
          setLoading(false);
        }
      }
    );
    userCanSubmitOnchainProposalAction(sessionid).then(
      (canSubmitResp) => {
        setCanSubmit(canSubmitResp);
      }
    );
  }, []);

  async function makeOrecProposal() {
    let toastid = toast.loading('Connecting to orclient..');
    if (orclient) {
      const rankings = consensusRankings.map((winner) => winner.walletaddress);
      const rankedNames = consensusRankings.reduce<string>((prev, current) => {
        return prev + `, ${current.name}`;
      }, "");
      toast.dismiss(toastid);
      toastid = toast.loading('Submitting proposal to ordao..');
      // This request object has to be the same for all participants of a breakout room.
      await orclient.proposeBreakoutResult({
        // TODO: set real groupNum and meetingNum
        groupNum: 1,
        meetingNum: 10,
        rankings: rankings,
        // Metadata field is optional.
        metadata: {
          // Could use this to provide names for each rank
          propTitle: `Session ${sessionid}`,
          propDescription: rankedNames
        }
      }).then((resp: ProposeRes) => {
        toast.success('Proposal sent successfully!');
        // set the consensus_status for this user's votes to pushed on chain
        markConsensusVotesAsSubmittedOnchainAction(
          resp.proposal,
          sessionid).then(() => {
          userCanSubmitOnchainProposalAction(sessionid).then(
            (canSubmitResp) => {
              setCanSubmit(canSubmitResp);
            });
        });
      }).catch(() => {
        toast.error('Propose breakout failed');
        setProposalSubmissionFailedAction(sessionid, 1).then();
      }).finally(() => {
        toast.dismiss(toastid);
      });
    } else {
      toast.dismiss(toastid);
      toast.error('Could not connect to orclient');
      await setProposalSubmissionFailedAction(sessionid, 3);
    }
  }

  function pushOnChain() {
    makeOrecProposal().then();
  }

  return (
    <main className="flex flex-1 flex-col p-4 md:p-6">
      <div className="flex items-center mb-8">
        <h1 className="font-semibold text-lg md:text-2xl">Final Consensus</h1>
      </div>
      {(isLoading && <Progress size="xs" isIndeterminate colorScheme={'cyan'} />) || (
        <div className="flex flex-col">
          <div className="flex flex-col">
            {consensusRankings.map((winner) => (
              <div key={winner.walletaddress} className="flex-col">
                <div className="m-4">
                  <h2 className="font-semibold text-lg md:text-xl">
                    #{winner.rankingvalue} - {winner.name}
                  </h2>
                  <div className="text-sm font-medium text-gray-400 dark:text-gray-100">
                    {winner.walletaddress}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {
            canSubmit ? pushOnChainButton : pushOnchainCompleted
          }
        </div>
      )}
    </main>
  );
}
