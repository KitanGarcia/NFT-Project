import {
  Button,
  Text,
  Image,
  VStack,
  Container,
  Heading,
} from "@chakra-ui/react";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { PROGRAM_ID, STAKE_MINT } from "../utils/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createStakingInstruction } from "../utils/instructions";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { getStakeAccount } from "../utils/accounts";
import {
  createInitializeStakeAccountInstruction,
  createRedeemInstruction,
  createUnstakeInstruction,
} from "../staking/ts/src/utils/instructions";

export const StakeOptionsDisplay = ({
  nftData,
  isStaked,
  daysStaked,
  totalEarned,
  claimable,
}: {
  nftData: any;
  isStaked: boolean;
  daysStaked: number;
  totalEarned: number;
  claimable: number;
}) => {
  const walletAdapter = useWallet();
  const { connection } = useConnection();
  const [isStaking, setIsStaking] = useState(isStaked);
  const [nftTokenAccount, setNftTokenAccount] = useState<PublicKey>();

  useEffect(() => {
    checkStakingStatus();
    if (nftData) {
      connection
        .getTokenLargestAccounts(nftData.mint.address)
        // There is only 1 nft, so use the address of index 0
        .then((accounts) => setNftTokenAccount(accounts.value[0].address));
    }
  }, [nftData, walletAdapter, connection]);

  const checkStakingStatus = useCallback(async () => {
    if (!walletAdapter.publicKey || !nftTokenAccount) {
      return;
    }

    try {
      const account = await getStakeAccount(
        connection,
        walletAdapter.publicKey,
        nftTokenAccount
      );

      console.log("Stake account:", account);

      setIsStaking(account.state === 0);
    } catch (error) {
      console.log("Error:", error);
    }
  }, [walletAdapter, connection, nftTokenAccount]);

  const sendAndConfirmTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        const signature = await walletAdapter.sendTransaction(
          transaction,
          connection
        );
        console.log("Signature:", signature);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            signature: signature,
          },
          "finalized"
        );
      } catch (error) {
        console.log("Transaction:", transaction);
        console.log(error);
      }

      await checkStakingStatus();
    },
    [walletAdapter, connection]
  );

  const handleStake = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount
    ) {
      alert("Please connect your wallet");
      return;
    }

    const [stakeAccount] = PublicKey.findProgramAddressSync(
      [walletAdapter.publicKey.toBuffer(), nftTokenAccount.toBuffer()],
      PROGRAM_ID
    );

    const transaction = new Transaction();

    const account = await connection.getAccountInfo(stakeAccount);
    if (!account) {
      transaction.add(
        createInitializeStakeAccountInstruction(
          walletAdapter.publicKey,
          nftTokenAccount,
          PROGRAM_ID
        )
      );
    }

    const stakeInstruction = createStakingInstruction(
      walletAdapter.publicKey,
      nftTokenAccount,
      nftData.mint.address,
      nftData.edition.address,
      TOKEN_PROGRAM_ID,
      METADATA_PROGRAM_ID,
      PROGRAM_ID
    );

    transaction.add(stakeInstruction);

    await sendAndConfirmTransaction(transaction);
  }, [walletAdapter, connection, nftData, nftTokenAccount]);

  const handleClaim = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount
    ) {
      alert("Please connect your wallet");
      return;
    }

    const userStakeATA = await getAssociatedTokenAddress(
      STAKE_MINT,
      walletAdapter.publicKey
    );

    const account = await connection.getAccountInfo(userStakeATA);
    console.log("Account:", account);

    const transaction = new Transaction();

    if (!account) {
      console.log("No account; adding to txn...");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletAdapter.publicKey,
          userStakeATA,
          walletAdapter.publicKey,
          STAKE_MINT
        )
      );
    }

    transaction.add(
      createRedeemInstruction(
        walletAdapter.publicKey,
        nftTokenAccount,
        nftData.mint.address,
        userStakeATA,
        TOKEN_PROGRAM_ID,
        PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(transaction);
  }, [walletAdapter, connection, nftData, nftTokenAccount]);

  const handleUnstake = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount
    ) {
      alert("Please connect your wallet");
      return;
    }

    const userStakeATA = await getAssociatedTokenAddress(
      STAKE_MINT,
      walletAdapter.publicKey
    );
    const account = await connection.getAccountInfo(userStakeATA);
    const transaction = new Transaction();

    if (!account) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletAdapter.publicKey,
          userStakeATA,
          walletAdapter.publicKey,
          STAKE_MINT
        )
      );
    }

    transaction.add(
      createUnstakeInstruction(
        walletAdapter.publicKey,
        nftTokenAccount,
        nftData.address,
        nftData.edition.address,
        STAKE_MINT,
        userStakeATA,
        TOKEN_PROGRAM_ID,
        METADATA_PROGRAM_ID,
        PROGRAM_ID
      )
    );
    await sendAndConfirmTransaction(transaction);
  }, [walletAdapter, connection, nftData, nftTokenAccount]);

  return (
    <VStack
      bgColor="background"
      borderRadius="20px"
      padding="20px 40px"
      spacing={5}
    >
      <Text
        bgColor="containerBgSecondary"
        padding="4px 8px"
        borderRadius="20px"
        color="bodyText"
        as="b"
        fontSize="sm"
      >
        {isStaking
          ? `STAKING ${daysStaked} DAY${daysStaked === 1 ? "" : "S"}`
          : "Ready TO STAKE"}
      </Text>
      <VStack spacing={-1}>
        <Text color="white" as="b" fontSize="4xl">
          {isStaking ? `${totalEarned} $NAS` : "$NAS"}
        </Text>
        <Text color="bodyText" as="b" fontSize="4xl">
          {isStaking ? `${claimable} $NAS earned` : "earn $NAS by staking"}
        </Text>
      </VStack>
      <Button
        onClick={isStaking ? handleClaim : handleStake}
        bgColor="buttonGreen"
        width="200px"
      >
        <Text as="b">{isStaking ? "claim $NAS" : "stake NASer"}</Text>
      </Button>
      {isStaking ? <Button onClick={handleUnstake}>unstake</Button> : null}
    </VStack>
  );
};
