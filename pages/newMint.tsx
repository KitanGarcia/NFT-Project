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

interface NewMintProps {
  mint: PublicKey;
}

const NewMint: NextPage<NewMintProps> = ({ mint }) => {
  const [metadata, setMetadata] = useState<any>();
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();

  const metaplex = useMemo(() => {
    return Metaplex.make(connection).use(walletAdapterIdentity(wallet));
  }, [connection, wallet]);

  useEffect(() => {
    metaplex
      // Finds NFT object based on given mint address (from URL)
      .nfts()
      .findByMint({ mintAddress: mint })
      .then((nft) => {
        // Fetch NFT's URI to get Metadata (containing image, etc.)
        fetch(nft.uri)
          .then((res) => res.json())
          .then((metadata) => {
            setMetadata(metadata);
          });
      });
  }, [mint, metaplex, wallet]);

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      router.push(`/stake?mint=${mint}&imageSrc=${metadata?.image}`);
    },
    [router, mint, metadata]
  );

  return (
    <VStack spacing={20} className={styles.container} h="calc(100vh)">
      <Container>
        <VStack mt={10} spacing={8}>
          <Heading color="white" as="h1" size="2xl" textAlign="center">
            😮 A new NASer has appeared!
          </Heading>

          <Text color="bodyText" fontSize="xl" textAlign="center">
            Congratulations, you minted a lvl 1 NASer! <br />
            Time to stake your character to earn rewards and level up.
          </Text>
        </VStack>
      </Container>

      <Image
        src={metadata?.image ?? ""}
        htmlWidth="300px"
        rounded="lg"
        alt=""
      />

      <Button bgColor="accent" color="white" maxW="380px" onClick={handleClick}>
        <HStack>
          <Text>stake my NASer</Text>
          <ArrowForwardIcon />
        </HStack>
      </Button>
    </VStack>
  );
};

NewMint.getInitialProps = async ({ query }) => {
  const { mint } = query;
  if (!mint) {
    throw { error: "no mint" };
  }

  try {
    const mintPubKey = new PublicKey(mint);
    return { mint: mintPubKey };
  } catch {
    throw { error: "invalid mint" };
  }
};

export default NewMint;
