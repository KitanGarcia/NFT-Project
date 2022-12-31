import type { NextPage } from "next";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { StakeOptionsDisplay } from "../components/StakeOptionsDisplay";

interface StakeProps {
  mint: PublicKey;
  imageSrc: string;
}

const Stake: NextPage<StakeProps> = ({ mint, imageSrc }) => {
  const [isStaked, setIsStaked] = useState(false);
  const [level, setLevel] = useState(1);
  const [nftData, setNftData] = useState<any>();
  const walletAdapter = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const metaplex = Metaplex.make(connection).use(
      walletAdapterIdentity(walletAdapter)
    );

    try {
      metaplex
        .nfts()
        .findByMint({ mintAddress: mint })
        .then((nft) => {
          console.log("NFT data on stake page:", nft);
          setNftData(nft);
        });
    } catch (error) {
      console.log("Error getting NFT:", error);
    }
  }, [connection, walletAdapter]);

  return (
    <div>
      <StakeOptionsDisplay
        nftData={nftData}
        isStaked={isStaked}
        daysStaked={10}
        totalEarned={10}
        claimable={10}
      />
    </div>
  );
};

Stake.getInitialProps = async ({ query }: any) => {
  const { mint, imageSrc } = query;
  if (!mint || !imageSrc) {
    throw { error: "no mint" };
  }

  try {
    const mintPubkey = new PublicKey(mint);
    return { mint: mintPubkey, imageSrc: imageSrc };
  } catch {
    throw { error: "invalid mint" };
  }
};

export default Stake;
