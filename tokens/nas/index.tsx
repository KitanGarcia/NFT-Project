import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";
import * as fs from "fs";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  toMetaplexFile,
} from "@metaplex-foundation/js";

import {
  DataV2,
  createCreateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

// Imports initializeKeypair.ts
import { initializeKeypair } from "./initializeKeypair.js";

const TOKEN_NAME = "NAS123";
const TOKEN_SYMBOL = "NAS";
const TOKEN_DESCRIPTION =
  "A token for lovers of our NAS123 class: Native Foods and Farming";
const TOKEN_IMAGE_NAME = "token.png";
const TOKEN_IMAGE_PATH = `tokens/nas/assets/${TOKEN_IMAGE_NAME}`;

const createNasToken = async (
  connection: web3.Connection,
  payer: web3.Keypair,
  programId: web3.PublicKey
) => {
  const [mintAuth] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("mint")],
    programId
  );

  // Creates and initializes a new mint
  const tokenMint = await token.createMint(
    connection, // Connection
    payer, // Payer
    payer.publicKey, // Mint authority
    payer.publicKey, // Freeze authority
    2 // Decimals
  );

  // Create a metaplex object so that we can create metaplex metadata and upload to bundlrStorage
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  // Read image file
  const imageBuffer = fs.readFileSync(TOKEN_IMAGE_PATH);
  const file = toMetaplexFile(imageBuffer, TOKEN_IMAGE_NAME);
  const imageUri = await metaplex.storage().upload(file);

  // Upload the rest of offchain metadata
  const { uri } = await metaplex.nfts().uploadMetadata({
    name: TOKEN_NAME,
    description: TOKEN_DESCRIPTION,
    image: imageUri,
  });

  // Finding out the address where the metadata is stored
  const metadataPDA = metaplex.nfts().pdas().metadata({ mint: tokenMint });
  const tokenMetadata = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2;

  const instruction = createCreateMetadataAccountV2Instruction(
    {
      metadata: metadataPDA,
      mint: tokenMint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV2: {
        data: tokenMetadata,
        isMutable: true,
      },
    }
  );

  const transaction = new web3.Transaction();
  transaction.add(instruction);

  const txnSig = await web3.sendAndConfirmTransaction(connection, transaction, [
    payer,
  ]);

  await token.setAuthority(
    connection,
    payer,
    tokenMint,
    payer.publicKey,
    token.AuthorityType.MintTokens,
    mintAuth
  );

  // Writes metadata to cache.json
  fs.writeFileSync(
    "tokens/nas/cache.json",
    JSON.stringify({
      mint: tokenMint.toBase58(),
      imageUri: imageUri,
      metadataUri: uri,
      tokenMetadata: metadataPDA.toBase58(),
      metadataTransaction: txnSig,
    })
  );
};

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const payer = await initializeKeypair(connection);
  await createNasToken(
    connection,
    payer,
    new web3.PublicKey("7Q3Ct4TUFa1myoS3zY2FFskk4Qcupjxhw5yxTFMTKsG2")
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
