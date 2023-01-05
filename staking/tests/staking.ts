import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

import { Staking } from "../target/types/staking";
import { setupNft } from "./utils/setupNft";

describe("staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = anchor.workspace.AnchorNftStaking.provider.wallet;
  const program = anchor.workspace.Staking as Program<Staking>;

  let delegatedAuthPda: anchor.web3.PublicKey;
  let stakeStatePda: anchor.web3.PublicKey;
  let nft: any;
  let mintAuth: anchor.web3.PublicKey;
  let mint: anchor.web3.PublicKey;
  let tokenAddress: anchor.web3.PublicKey;

  // Populate above variables
  before(async () => {
    ({ nft, delegatedAuthPda, stakeStatePda, mint, mintAuth, tokenAddress } =
      await setupNft(program, wallet.payer));
  });

  it("Stakes", async () => {
    await program.methods
      .stake()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        nftMint: nft.mintAddress,
        nftEdition: nft.masterEditionAddress,
        metadataProgram: METADATA_PROGRAM_ID,
      })
      .rpc();
  });
});
