import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";

const TWEET_SEED = "TWEET_SEED";
const COMMENT_SEED = "COMMENT_SEED";

describe("sol_twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solana_twitter as Program<SolanaTwitter>;

  const bob = anchor.web3.Keypair.generate();

  let content1 = "Hello, World!";
  let content2 = "a new tweet";
  let content3 = "looking for a new role guys. Please share some leads :-)";
  let emptyContent = "";

  describe("Post tweet", async () => {
    it("can send a new tweet", async () => {
      const sig = await airdrop(bob.publicKey);
      await program.provider.connection.confirmTransaction(sig, "confirmed");

      let [tweetPDA] = getTweetAddress(
        content1,
        bob.publicKey,
        program.programId,
      );

      await program.methods
        .postNewTweet(content1)
        .accounts({
          author: bob.publicKey,
          tweet: tweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc();

      // fetch created tweet
      const newTweet = await program.account.tweet.fetch(tweetPDA);

      // Assert
      assert.equal(newTweet.author.toBase58(), bob.publicKey);
      assert.equal(newTweet.content, content1);
    });

    it("cannot send tweet with content with 280+ characters", async () => {
      let should_fail = "This Should Fail";
      const longContent = "a".repeat(300);
      try {
        let [tweetPDA] = getTweetAddress(
          longContent,
          bob.publicKey,
          program.programId,
        );
        await program.methods
          .postNewTweet(longContent)
          .accounts({
            author: bob.publicKey,
            tweet: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(
          error.message,
          "Max seed length exceeded",
          "Expected 'Max seed length exceeded' error for topic longer than 32 bytes",
        );
        should_fail = "Failed";
      }
      assert.strictEqual(
        should_fail,
        "Failed",
        "Tweet initialization should have failed with topic longer than 32 bytes",
      );
    });

    it("does not post a new tweet with empty content", async () => {
      try {
        // derive PDA for tweet
        let [tweetPDA] = getTweetAddress(
          emptyContent,
          bob.publicKey,
          program.programId,
        );

        //     post new tweet
        await program.methods
          .postNewTweet(emptyContent)
          .accounts({
            author: bob.publicKey,
            tweet: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        const err = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          err.error.errorCode.code,
          "TweetContentRequired",
          "Expected 'TweetContentRequired' error for empty content",
        );
      }
    });

    it("allows a user to have multiple tweets", async () => {
      let sig = await airdrop(bob.publicKey);

      for (let i = 1; i <= 3; i++) {
        let content = "tweet " + i;
        let [tweetPDA] = getTweetAddress(
          content,
          bob.publicKey,
          program.programId,
        );

        await program.methods
          .postNewTweet("tweet " + i)
          .accounts({
            author: bob.publicKey,
            tweetPDA: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc();

        // fetch tweet
        let newTweet = await program.account.tweet.fetch(tweetPDA);

        // Assert
        assert.equal(newTweet.content, content);
        assert.equal(newTweet.author.toBase58(), bob.publicKey);
      }
    });
  });

  // helpers
  const airdrop = async (publicKey: anchor.web3.PublicKey) => {
    return await program.provider.connection.requestAirdrop(
      publicKey,
      1_000_000_000, // 1 SOL
    );
  };

  const getTweetAddress = (
    content: string,
    author: PublicKey,
    programID: PublicKey,
  ) => {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode(TWEET_SEED),
        anchor.utils.bytes.utf8.encode(content),
        author.toBuffer(),
      ],
      programID,
    );
  };
});
