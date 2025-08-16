import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";

describe("sol_twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solana_twitter as Program<SolanaTwitter>;

    const bob = anchor.web3.Keypair.generate();

  let content1 = "Hello, World!";
  const TWEET_SEED = "TWEET_SEED";

  it("can send a new tweet", async () => {
      const sig = await airdrop(bob.publicKey);
      await program.provider.connection.confirmTransaction(sig, "confirmed");

      const [tweetPDA] = await PublicKey.findProgramAddressSync(
          [
              anchor.utils.bytes.utf8.encode(TWEET_SEED),
              anchor.utils.bytes.utf8.encode(content1),
              bob.publicKey.toBuffer()
          ],
          program.programId
      );

    await program.methods.postNewTweet(content1)
        .accounts(
            {
              author: bob.publicKey,
              tweet: tweetPDA,
              systemProgram: anchor.web3.SystemProgram.programId,
            }
        )
      .signers([bob])
      .rpc();

    // fetch created tweet
    const newTweet = await program.account.tweet.fetch(tweetPDA);

    // Assert
    assert.equal(newTweet.author.toBase58(), bob.publicKey);
    assert.equal(newTweet.content, content1);
  });

  it("cannot send tweet with content with 280+ characters", async () => {
    let should_fail = "This Should Fail"
    const longContent = "a".repeat(300);
    try {
        const [tweetPDA] = await PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode(TWEET_SEED),
                anchor.utils.bytes.utf8.encode(longContent),
                bob.publicKey.toBuffer()
            ],
            program.programId
        );
        await program.methods.postNewTweet(longContent).accounts(
            {
                author: bob.publicKey,
                tweet: tweetPDA,
                systemProgram: anchor.web3.SystemProgram.programId
            }
        ).signers([bob]).rpc({ commitment: "confirmed" })
      } catch (error) {
        assert.strictEqual(error.message, "Max seed length exceeded", "Expected 'Max seed length exceeded' error for topic longer than 32 bytes");
        should_fail = "Failed"
    }
      assert.strictEqual(should_fail, "Failed", "Tweet initialization should have failed with topic longer than 32 bytes")
      });

    // helpers
    const airdrop = async (publicKey: anchor.web3.PublicKey) => {
        return await program.provider.connection.requestAirdrop(
            publicKey,
            1_000_000_000 // 1 SOL
        );
    }
});
