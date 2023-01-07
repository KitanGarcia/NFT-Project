import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
} from "@metaplex-foundation/js";
import { createMint, getAssociatedTokenAddress } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { Staking } from "../../target/types/staking";

export const setupNft = async (
  program: anchor.Program<Staking>,
  payer: anchor.web3.Keypair
) => {
  const metaplex = Metaplex.make(program.provider.connection)
    .use(keypairIdentity(payer))
    .use(bundlrStorage());

  const nft = await metaplex.nfts().create({
    uri: "",
    name: "Test nft",
    sellerFeeBasisPoints: 0,
  });

  console.log("Nft metadata pubkey:", nft.metadataAddress.toBase58());
  console.log("Nft token address:", nft.tokenAddress.toBase58());

  const [delegatedAuthPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    program.programId
  );

  const [stakeStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [payer.publicKey.toBuffer(), nft.tokenAddress.toBuffer()],
    program.programId
  );

  console.log("Delegated authority PDA:", delegatedAuthPda.toBase58());
  console.log("Stake state PDA:", stakeStatePda.toBase58());

  const [mintAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  );

  const mint = await createMint(
    program.provider.connection,
    payer,
    mintAuth,
    null,
    2
  );
  console.log("mint pubkey:", mint.toBase58());

  const tokenAddress = await getAssociatedTokenAddress(mint, payer.publicKey);

  return {
    nft: nft,
    delegatedAuthPda: delegatedAuthPda,
    stakeStatePda: stakeStatePda,
    mint: mint,
    mintAuth: mintAuth,
    tokenAddress: tokenAddress,
  };
};
