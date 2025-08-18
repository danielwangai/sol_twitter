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

  // authors/actors
  const bob = anchor.web3.Keypair.generate();
  const alice = anchor.web3.Keypair.generate();
  const james = anchor.web3.Keypair.generate();

  // tweets
  let content1 = "Hello, World!";
  let content2 = "a new tweet";
  let content3 = "looking for a new role guys. Please share some leads :-)";
  let emptyContent = "";

  // comments
  let comment1 = "happy to recommend you!";
  let comment2 = "cool!";

  describe("Post tweet", async () => {
    it("can send a new tweet", async () => {
      await airdrop(bob.publicKey);

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
      await airdrop(bob.publicKey);

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

  describe("Post comment", async () => {
    it("can post a new comment to tweet", async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);

      // bob is the tweet author
      let [tweetPDA] = getTweetAddress(
        content1,
        bob.publicKey,
        program.programId,
      );

      // alice is the comment author
      let [commentPDA] = getCommentAddress(
        comment1,
        alice.publicKey,
        tweetPDA,
        program.programId,
      );

      await program.methods
        .postNewComment(comment1)
        .accounts({
          author: alice.publicKey,
          comment: commentPDA,
          tweet: tweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc({ commitment: "confirmed" });

      // fetch created tweet
      const newComment = await program.account.comment.fetch(commentPDA);

      // Assert
      assert.equal(newComment.author.toBase58(), alice.publicKey);
      assert.equal(newComment.comment, comment1);
    });

    it("can post multiple comments to a tweet", async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);
      // bob is the tweet author
      let [tweetPDA] = getTweetAddress(
        content1,
        bob.publicKey,
        program.programId,
      );

      for (let i = 1; i <= 3; i++) {
        let comment = "comment " + i;
        let [commentPDA] = getCommentAddress(
          comment,
          alice.publicKey,
          tweetPDA,
          program.programId,
        );
        await program.methods
          .postNewComment(comment)
          .accounts({
            author: alice.publicKey,
            comment: commentPDA,
            tweet: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([alice])
          .rpc({ commitment: "confirmed" });
        // fetch created tweet
        const newComment = await program.account.comment.fetch(commentPDA);
        // Assert
        assert.equal(newComment.author.toBase58(), alice.publicKey);
        assert.equal(newComment.comment, comment);
      }
    });

    it("multiple users can comment on a tweet", async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);
      await airdrop(james.publicKey);

      let commenters = [alice, james];

      // bob is the tweet author
      let [tweetPDA] = getTweetAddress(
        content1,
        bob.publicKey,
        program.programId,
      );
      let i = 1;
      commenters.map(async (commenter) => {
        let comment = "comment " + i;
        let [commentPDA] = getCommentAddress(
          comment,
          commenter.publicKey,
          tweetPDA,
          program.programId,
        );
        await program.methods
          .postNewComment(comment)
          .accounts({
            author: commenter.publicKey,
            comment: commentPDA,
            tweet: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([commenter])
          .rpc({ commitment: "confirmed" });

        // fetch created tweet
        const newComment = await program.account.comment.fetch(commentPDA);

        // Assert
        assert.equal(newComment.author.toBase58(), commenter.publicKey);
        assert.equal(newComment.comment, comment);
        i++;
      });
    });
    it("cannot post comment with more than 280+ characters", async () => {
      let should_fail = "This Should Fail";
      const longContent = "a".repeat(300);
      try {
        // await airdrop(bob.publicKey);
        let [tweetPDA] = getTweetAddress(
          longContent,
          bob.publicKey,
          program.programId,
        );
        // alice is the comment author
        let [commentPDA] = getCommentAddress(
          longContent,
          alice.publicKey,
          tweetPDA,
          program.programId,
        );
        await program.methods
          .postNewComment(longContent)
          .accounts({
            author: alice.publicKey,
            comment: commentPDA,
            tweet: tweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([alice])
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
  });

  describe("Remove comment", async () => {
    let bobTweetPDA: anchor.web3.PublicKey;
    let aliceCommentPDA: anchor.web3.PublicKey;
    beforeEach(async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);

      // make every tweet created unique on every run to avoid getting the error
      // Allocate: account ... already in use
      let content = content1 + Date.now().toString();

      [bobTweetPDA] = getTweetAddress(
        content,
        bob.publicKey,
        program.programId,
      );
      [aliceCommentPDA] = getCommentAddress(
        comment1,
        alice.publicKey,
        bobTweetPDA,
        program.programId,
      );

      // bob posts a tweet
      await program.methods
        .postNewTweet(content)
        .accounts({
          author: bob.publicKey,
          tweet: bobTweetPDA,
        })
        .signers([bob])
        .rpc();

      // alice comments on bob's tweet
      await program.methods
        .postNewComment(comment1)
        .accounts({
          author: alice.publicKey,
          tweet: bobTweetPDA,
          comment: aliceCommentPDA,
        })
        .signers([alice])
        .rpc();
    });

    it("Should successfully remove existing comment from tweet", async () => {
      // const aliceCommentPDA = await postTweetWithComment();
      await program.methods
        .deleteComment()
        .accounts({
          author: alice.publicKey,
          comment: aliceCommentPDA,
        })
        .signers([alice])
        .rpc({ commitment: "confirmed" });

      let thisShouldFail = "This should fail";
      try {
        let commentData = await program.account.comment.fetch(aliceCommentPDA);
      } catch (error) {
        thisShouldFail = "Failed";
        assert.ok(
          error.message.includes("Account does not exist or has no data"),
          "Comment account should be deleted after removal",
        );
      }
      assert.strictEqual(
        thisShouldFail,
        "Failed",
        "Comment account should not exist after being removed",
      );
    });

    it("should not allow a user to delete another user's comment", async () => {
      // const aliceCommentPDA = await postTweetWithComment();
      // bob tries to remove alice's comment and fails
      try {
        await program.methods
          .deleteComment()
          .accounts({
            author: bob.publicKey,
            comment: aliceCommentPDA,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.ok(
          error.message.includes("constraint") ||
            error.message.includes("seeds"),
          "Expected constraint or seeds error when trying to remove someone else's comment",
        );
      }
    });

    it("Should fail when attempting to remove non-existent comment", async () => {
      // this comment doesn't exist in bob's tweet
      const fakeComment = "This comment doesn't exist";
      const [commentPDA] = getCommentAddress(
        fakeComment,
        alice.publicKey,
        bobTweetPDA,
        program.programId,
      );

      try {
        await program.methods
          .deleteComment()
          .accounts({
            author: alice.publicKey,
            comment: commentPDA,
          })
          .signers([alice])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.ok(
          error.message.includes("Account does not exist") ||
            error.message.includes("AccountNotInitialized"),
          "Expected account not found error when trying to remove non-existent comment",
        );
      }
    });
  });

  // helpers
  const airdrop = async (publicKey: anchor.web3.PublicKey) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      1_000_000_000, // 1 SOL
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
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

  const getCommentAddress = (
    commentContent: string,
    author: PublicKey,
    parentTweet: PublicKey,
    programID: PublicKey,
  ) => {
    let hexString = crypto
      .createHash("sha256")
      .update(commentContent, "utf-8")
      .digest("hex");
    let contentSeed = Uint8Array.from(Buffer.from(hexString, "hex"));

    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode(COMMENT_SEED),
        contentSeed,
        author.toBuffer(),
        parentTweet.toBuffer(),
      ],
      programID,
    );
  };
});
