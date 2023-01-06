import {
  FC,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
  Image,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useRouter } from "next/router";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  CandyMachine,
  CandyMachineV2,
  Metaplex,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";

const Connected: FC = () => {
  const router = useRouter();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [candyMachine, setCandyMachine] = useState<CandyMachineV2>();
  const [isMinting, setIsMinting] = useState(false);

  const metaplex = useMemo(() => {
    return Metaplex.make(connection).use(walletAdapterIdentity(wallet));
  }, [connection, wallet]);

  // set candyMachine
  useEffect(() => {
    if (metaplex) {
      metaplex
        .candyMachinesV2()
        .findByAddress({
          address: new PublicKey(
            "EaWxc727KabZXTaKByV47ooeqpNM9g97rHVgtT9b9Rre"
          ),
        })
        .then((candyMachine) => {
          console.log(candyMachine);
          setCandyMachine(candyMachine);
        })
        .catch((error) => {
          alert(error);
        });
    }
  }, [metaplex]);

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      if (wallet && candyMachine) {
        try {
          setIsMinting(true);
          const nft = await metaplex.candyMachinesV2().mint({ candyMachine });

          console.log(nft);
          router.push(`/newMint?mint=${nft.nft.address.toBase58()}`);
        } catch (error) {
          alert(error);
        } finally {
          setIsMinting(false);
        }
      }
    },
    [metaplex, wallet, candyMachine]
  );

  return (
    <VStack spacing={10}>
      <Container>
        <VStack spacing={8}>
          <Heading
            color="white"
            as="h1"
            size="2xl"
            noOfLines={1}
            textAlign="center"
          >
            Welcome NASer.
          </Heading>
          <Text color="bodyText" fontSize="xl" textAlign="center">
            Each NASer is randomly generated and can be staked to receive
            <Text as="b"> $NAS</Text> Use your <Text as="b"> $NAS</Text> to
            upgrade your NASer and receive perks within the community!
          </Text>
        </VStack>
      </Container>

      <HStack spacing={10}>
        <Image src="avatar1.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar2.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar3.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar4.png" alt="" htmlWidth="300px" rounded="lg" />
      </HStack>
      <HStack spacing={10}>
        <Image src="avatar5.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar6.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar7.png" alt="" htmlWidth="300px" rounded="lg" />
      </HStack>

      <Button
        bgColor="accent"
        color="white"
        maxW="380px"
        onClick={handleClick}
        isLoading={isMinting}
      >
        <HStack>
          <Text>mint NASer</Text>
          <ArrowForwardIcon />
        </HStack>
      </Button>
    </VStack>
  );
};

export default Connected;
