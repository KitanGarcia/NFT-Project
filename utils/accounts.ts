import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";

export async function getStakeAccount(
  program: any,
  user: PublicKey,
  tokenAccount: PublicKey
): Promise<StakeAccount> {
  const [pda] = PublicKey.findProgramAddressSync(
    [user.toBuffer(), tokenAccount.toBuffer()],
    program.programId
  );
  const account = await program.account.userStakeInfo.fetch(pda);
  return account;
}
