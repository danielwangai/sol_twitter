import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";

describe("sol_twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solana_twitter as Program<SolanaTwitter>;

  it("can send a new tweet", async () => {
    const tweet = anchor.web3.Keypair.generate();
    await program.methods.postNewTweet("Hello, World!")
        .accounts(
            {
              tweet: tweet.publicKey,
              author: program.provider.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            }
        )
      .signers([tweet])
      .rpc();

    // fetch created tweet
    const newTweet = await program.account.tweet.fetch(tweet.publicKey);

    // Assert
    assert.equal(newTweet.author.toBase58(), program.provider.publicKey.toBase58());
    assert.equal(newTweet.content, "Hello, World!");
  });

  it("cannot send tweet with content with 280+ characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const longContent = "a".repeat(300);
        await program.methods.postNewTweet(longContent).accounts(
            {
                tweet: tweet.publicKey,
                author: program.provider.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId
            }
        ).signers([tweet]).rpc({ commitment: "confirmed" })
      } catch (error) {
      const anchorError = error as anchor.AnchorError;
      assert.equal(
        anchorError.error.errorMessage,
        "The content should be at most 280 characters long");
      return;
    }
    assert.fail("The instruction should have failed with long content.");
  });
});
