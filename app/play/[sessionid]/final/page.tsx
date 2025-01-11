'use client';
import { getConsensusSessionWinnersAction } from '@/app/actions';
import { useEffect, useMemo, useState } from 'react';
import { ConsensusWinnerModel } from '@/lib/models/consensus-winner.model';
import { Progress } from "@chakra-ui/react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import toast from 'react-hot-toast';
import { useOrclient } from '@ordao/privy-react-orclient';
import * as React from "react";
import FunButton from "@/components/ui/fun-button";


export default function IndexPage({params}: { params: { sessionid: string };
}) {
  const [consensusRankings, setConsensusRankings] = useState<
    ConsensusWinnerModel[]
  >([]);
  const [isLoading, setLoading] = useState(true);
  const [safeSessionId, setSafeSessionid] = useState(0);
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
        Looks like you're not a member of consensus session #{safeSessionId}
        , sorry!
      </h1>
    </div>
  );

  useEffect(() => {
    const sessionid = parseInt(params?.sessionid);
    if (isNaN(sessionid)) {
      throw new Error('Invalid query parameter');
    }
    setSafeSessionid(sessionid);

    if (safeSessionId) {
      getConsensusSessionWinnersAction(safeSessionId).then(
        (winnersResp) => {
          if (winnersResp && winnersResp.length > 0) {
            const results = winnersResp as unknown as ConsensusWinnerModel[];
            setConsensusRankings(results);
            setLoading(false);
          }
        }
      );
    }
  }, [safeSessionId]);

  async function makeOrecProposal() {
    let toastid = toast.loading('Connecting to orclient..');
    if (orclient) {
      const rankings = consensusRankings.map((winner) => winner.walletaddress);
      const rankedNames = consensusRankings.reduce<string>((prev, current, index) => {
        return prev + `, ${current.name}`;
      }, "");
      toast.dismiss(toastid);
      toastid = toast.loading('Submitting proposal to ordao..');
      // This request object has to be the same for all participants of a breakout room.
      await orclient.proposeBreakoutResult({
        // TODO: set real groupNum and meetingNum
        groupNum: parseInt(consensusRankings[0]?.grouplabel) || 1,
        meetingNum: safeSessionId,
        rankings: rankings,
        // Metadata field is optional.
        metadata: {
          // Could use this to provide names for each rank
          propTitle: `Session ${safeSessionId}`,
          propDescription: rankedNames
        }
      }).then(() => {
        toast.success('Proposal sent successfully!');
      }).catch(() => {
        toast.error('Propose breakout failed');
      }).finally(() => {
        toast.dismiss(toastid);
      });
    } else {
      toast.dismiss(toastid);
      toast.error('Could not connect to orclient');
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
            <FunButton
              className="mt-4 w-50 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => pushOnChain()}>
              Push on chain!
            </FunButton>
          }
        </div>
      )}
    </main>
  );
}
