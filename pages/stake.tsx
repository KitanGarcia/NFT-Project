import type { NextPage } from "next";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  Button,
  Text,
  HStack,
  Image,
  VStack,
  Container,
  Heading,
} from "@chakra-ui/react";
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import styles from "../styles/Home.module.css";
import { useRouter } from "next/router";

interface StakeProps {
  mint: PublicKey;
  imageSrc: string;
}

const Stake: NextPage<StakeProps> = ({ mint, imageSrc }) => {
  const [isStaking, setIsStaking] = useState(false);
  const [level, setLevel] = useState(1);

  return <div></div>;
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
