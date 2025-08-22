import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";

const TWEET_SEED = "TWEET_SEED";
const COMMENT_SEED = "COMMENT_SEED";
const TWEET_REACTION_SEED = "TWEET_REACTION_SEED";
const COMMENT_REACTION_SEED = "COMMENT_REACTION_SEED";

describe("sol_twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solana_twitter as Program<SolanaTwitter>;

  // authors/actors
  const bob = anchor.web3.Keypair.generate();
  const alice = anchor.web3.Keypair.generate();
  const james = anchor.web3.Keypair.generate();
  const kama = anchor.web3.Keypair.generate();

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

  describe("Add tweet reaction", async () => {
    let bobTweetPDA: anchor.web3.PublicKey;
    let aliceTweetPDA: anchor.web3.PublicKey;
    let aliceReactionPDA: anchor.web3.PublicKey;
    let kamaReactionPDA1: anchor.web3.PublicKey;
    let kamaReactionPDA2: anchor.web3.PublicKey;

    beforeEach(async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);
      await airdrop(kama.publicKey);

      // make every tweet created unique on every run to avoid getting the error
      // Allocate: account ... already in use
      let content = content1 + Date.now().toString();

      // PDAs
      [bobTweetPDA] = getTweetAddress(
        content,
        bob.publicKey,
        program.programId,
      );
      [aliceTweetPDA] = getTweetAddress(
        content,
        alice.publicKey,
        program.programId,
      );
      [aliceReactionPDA] = getTweetReactionAddress(
        alice.publicKey,
        bobTweetPDA,
        program.programId,
      );
      [kamaReactionPDA1] = getTweetReactionAddress(
        kama.publicKey,
        bobTweetPDA,
        program.programId,
      );
      [kamaReactionPDA2] = getTweetReactionAddress(
        kama.publicKey,
        aliceTweetPDA,
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

      // alice posts a tweet
      await program.methods
        .postNewTweet(content)
        .accounts({
          author: alice.publicKey,
          tweet: aliceTweetPDA,
        })
        .signers([alice])
        .rpc();

      // alice likes bob's tweet
      await program.methods
        .likeTweet()
        .accounts({
          author: alice.publicKey,
          reaction: aliceReactionPDA,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc({ commitment: "confirmed" });

      // kama dislikes bob's tweet
      await program.methods
        .dislikeTweet()
        .accounts({
          author: kama.publicKey,
          reaction: kamaReactionPDA1,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([kama])
        .rpc({ commitment: "confirmed" });

      // kama dislikes alice's tweet
      await program.methods
        .dislikeTweet()
        .accounts({
          author: kama.publicKey,
          reaction: kamaReactionPDA2,
          tweet: aliceTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([kama])
        .rpc({ commitment: "confirmed" });
    });

    it("should successfully like a tweet", async () => {
      await airdrop(james.publicKey);
      // alice wants to like bob's tweet
      let [jamesReactionPDA] = getTweetReactionAddress(
        james.publicKey,
        bobTweetPDA,
        program.programId,
      );

      // get likes count before
      let tweet = await program.account.tweet.fetch(bobTweetPDA);
      let likesCountBefore = tweet.likes.toNumber();

      await program.methods
        .likeTweet()
        .accounts({
          author: james.publicKey,
          reaction: jamesReactionPDA,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([james])
        .rpc({ commitment: "confirmed" });

      // fetch tweet
      tweet = await program.account.tweet.fetch(bobTweetPDA);
      assert.equal(tweet.likes.toNumber(), likesCountBefore + 1);

      // fetch tweet reaction
      const tweetReaction = await program.account.tweetReaction.fetch(
        jamesReactionPDA,
      );
      assert.equal(tweetReaction.author.toBase58(), james.publicKey);
    });

    it("should successfully dislike a tweet", async () => {
      await airdrop(james.publicKey);
      // james wants to like bob's tweet
      let [jamesReactionPDA] = getTweetReactionAddress(
        james.publicKey,
        bobTweetPDA,
        program.programId,
      );

      // get likes count before
      let tweet = await program.account.tweet.fetch(bobTweetPDA);
      let dislikesCountBefore = tweet.dislikes.toNumber();

      await program.methods
        .dislikeTweet()
        .accounts({
          author: james.publicKey,
          reaction: jamesReactionPDA,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([james])
        .rpc({ commitment: "confirmed" });

      // fetch tweet
      tweet = await program.account.tweet.fetch(bobTweetPDA);
      assert.equal(tweet.dislikes.toNumber(), dislikesCountBefore + 1);

      // fetch tweet reaction
      const tweetReaction = await program.account.tweetReaction.fetch(
        jamesReactionPDA,
      );
      assert.equal(tweetReaction.author.toBase58(), james.publicKey);
    });
    it("fails when a user tries to like the same tweet more than once", async () => {
      // alice tries to like bob's tweet the second time
      let tweet = await program.account.tweet.fetch(bobTweetPDA);
      let likesCountBefore = tweet.likes.toNumber();

      try {
        await program.methods
          .likeTweet()
          .accounts({
            author: alice.publicKey,
            reaction: aliceReactionPDA,
            tweet: bobTweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([alice])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          "CannotLikeMoreThanOnce",
          "Expected 'CannotLikeMoreThanOnce' error for content longer than 500 bytes",
        );
      }

      // likes count after
      tweet = await program.account.tweet.fetch(bobTweetPDA);
      let likesCountAfter = tweet.likes.toNumber();

      // number of likes remains unaltered
      assert.equal(likesCountAfter, likesCountBefore);
    });
    it("fails when a user tries to dislike the same tweet more than once", async () => {
      // kama tries to dislike bob's tweet the second time
      let tweet = await program.account.tweet.fetch(bobTweetPDA);
      let dislikesCountBefore = tweet.dislikes.toNumber();

      try {
        await program.methods
          .dislikeTweet()
          .accounts({
            author: kama.publicKey,
            reaction: kamaReactionPDA1,
            tweet: bobTweetPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([kama])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          "CannotDislikeMoreThanOnce",
          "Expected 'CannotDislikeMoreThanOnce' error for content longer than 500 bytes",
        );
      }

      // likes count after
      tweet = await program.account.tweet.fetch(bobTweetPDA);
      let dislikesCountAfter = tweet.dislikes.toNumber();

      // number of likes remains unaltered
      assert.equal(dislikesCountAfter, dislikesCountBefore);
    });
    it("increments dislike after toggling from like", async () => {
      // get tweet to dislike
      let tweet = await program.account.tweet.fetch(bobTweetPDA);

      let likesCountBefore = tweet.likes.toNumber();
      let dislikesCountBefore = tweet.dislikes.toNumber();

      // alice already liked bob's tweet before and now wants to dislike it
      await program.methods
        .dislikeTweet()
        .accounts({
          author: alice.publicKey,
          reaction: aliceReactionPDA,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc({ commitment: "confirmed" });

      // likes count after
      tweet = await program.account.tweet.fetch(bobTweetPDA);
      let likesCountAfter = tweet.likes.toNumber();
      let dislikesCountAfter = tweet.dislikes.toNumber();

      // number of likes reduced
      assert.ok(likesCountAfter < likesCountBefore);
      assert.ok(dislikesCountAfter > dislikesCountBefore);
    });
    it("increments likes after toggling from dislike", async () => {
      // get tweet to dislike
      let tweet = await program.account.tweet.fetch(aliceTweetPDA);

      let likesCountBefore = tweet.likes.toNumber();
      let dislikesCountBefore = tweet.dislikes.toNumber();
q
      // kama has already disliked alice's tweet before and now wants to like it
      await program.methods
        .likeTweet()
        .accounts({
          author: kama.publicKey,
          reaction: kamaReactionPDA2,
          tweet: aliceTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([kama])
        .rpc({ commitment: "confirmed" });

      // likes count after
      tweet = await program.account.tweet.fetch(aliceTweetPDA);
      let likesCountAfter = tweet.likes.toNumber();
      let dislikesCountAfter = tweet.dislikes.toNumber();

      // number of likes increased
      assert.ok(likesCountAfter > likesCountBefore);
      assert.ok(dislikesCountAfter < dislikesCountBefore);
    });
  });

  describe("Add comment reaction", async () => {
    let bobTweetPDA: anchor.web3.PublicKey;
    let aliceCommentPDA: anchor.web3.PublicKey;
    let aliceCommentReactionPDA: anchor.web3.PublicKey;
    let kamaCommentReactionPDA1: anchor.web3.PublicKey;

    beforeEach(async () => {
      await airdrop(bob.publicKey);
      await airdrop(alice.publicKey);
      await airdrop(kama.publicKey);

      // make every tweet created unique on every run to avoid getting the error
      // Allocate: account ... already in use
      let content = content1 + Date.now().toString();

      // PDAs
      [bobTweetPDA] = getTweetAddress(
        content,
        bob.publicKey,
        program.programId,
      );
      [aliceCommentPDA] = getCommentAddress(
        content,
        alice.publicKey,
        bobTweetPDA,
        program.programId,
      );
      [aliceCommentReactionPDA] = getCommentReactionAddress(
        alice.publicKey,
        aliceCommentPDA,
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
        .postNewComment(content)
        .accounts({
          author: alice.publicKey,
          comment: aliceCommentPDA,
          tweet: bobTweetPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();

      // alice reacts to her comment
      await program.methods
        .likeComment()
        .accounts({
          author: alice.publicKey,
          reaction: aliceCommentReactionPDA,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();

      // kama dislikes alice's comment
      await program.methods
        .dislikeComment()
        .accounts({
          author: kama.publicKey,
          reaction: kamaCommentReactionPDA1,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([kama])
        .rpc({ commitment: "confirmed" });
    });

    it("should successfully like a comment", async () => {
      await airdrop(james.publicKey);
      // james wants to like alice's comment
      let [jamesCommentReactionPDA] = getCommentReactionAddress(
        james.publicKey,
        aliceCommentPDA,
        program.programId,
      );

      // get likes count before
      let comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountBefore = comment.likes.toNumber();

      // james likes alice's comment
      await program.methods
        .likeComment()
        .accounts({
          author: james.publicKey,
          reaction: jamesCommentReactionPDA,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([james])
        .rpc({ commitment: "confirmed" });

      // fetch alice's comment
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountAfter = comment.likes.toNumber();
      assert.ok(likesCountAfter > likesCountBefore);
      // number of likes have increased by 1
      assert.ok(likesCountAfter - likesCountBefore === 1);

      // fetch tweet reaction
      const commentReaction = await program.account.commentReaction.fetch(
        jamesCommentReactionPDA,
      );

      assert.equal(commentReaction.author.toBase58(), james.publicKey);
    });

    it("should successfully dislike a comment", async () => {
      await airdrop(james.publicKey);
      // james wants to dislike alice's comment
      let [jamesCommentReactionPDA] = getCommentReactionAddress(
        james.publicKey,
        aliceCommentPDA,
        program.programId,
      );

      // get likes count before
      let comment = await program.account.comment.fetch(aliceCommentPDA);
      let dislikesCountBefore = comment.dislikes.toNumber();

      // james dislikes alice's comment
      await program.methods
        .dislikeComment()
        .accounts({
          author: james.publicKey,
          reaction: jamesCommentReactionPDA,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([james])
        .rpc({ commitment: "confirmed" });

      // fetch alice's comment
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let dislikesCountAfter = comment.dislikes.toNumber();
      assert.ok(dislikesCountAfter > dislikesCountBefore);
      // number of likes have decreased by 1
      assert.ok(dislikesCountAfter - dislikesCountBefore === 1);

      // fetch tweet reaction
      const commentReaction = await program.account.commentReaction.fetch(
        jamesCommentReactionPDA,
      );

      assert.equal(commentReaction.author.toBase58(), james.publicKey);
    });
    it("fails when a user tries to like the same comment more than once", async () => {
      // alice tries to like bob's tweet the second time
      let comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountBefore = comment.likes.toNumber();

      try {
        // alice tries to liked the comment she liked before
        await program.methods
          .likeComment()
          .accounts({
            author: alice.publicKey,
            reaction: aliceCommentReactionPDA,
            comment: aliceCommentPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([alice])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          "CannotLikeMoreThanOnce",
          "Expected 'CannotLikeMoreThanOnce' error for content longer than 500 bytes",
        );
      }

      // likes count after
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountAfter = comment.likes.toNumber();

      // number of likes remains unaltered
      assert.equal(likesCountAfter, likesCountBefore);
    });
    it("fails when a user tries to dislike the same comment more than once", async () => {
      // kama tries to dislike alice's comment the second time
      let comment = await program.account.comment.fetch(aliceCommentPDA);
      let dislikesCountBefore = comment.dislikes.toNumber();

      try {
        await program.methods
          .dislikeComment()
          .accounts({
            author: kama.publicKey,
            reaction: kamaCommentReactionPDA1,
            comment: aliceCommentPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([kama])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          "CannotDislikeMoreThanOnce",
          "Expected 'CannotDislikeMoreThanOnce' error for content longer than 500 bytes",
        );
      }

      // likes count after
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let dislikesCountAfter = comment.dislikes.toNumber();

      // number of likes remains unaltered
      assert.equal(dislikesCountAfter, dislikesCountBefore);
    });
    it("increments dislike after toggling from like", async () => {
      // get comment to dislike
      let comment = await program.account.comment.fetch(aliceCommentPDA);

      let likesCountBefore = comment.likes.toNumber();
      let dislikesCountBefore = comment.dislikes.toNumber();

      // alice already liked her own comment before and now wants to dislike it
      await program.methods
        .dislikeComment()
        .accounts({
          author: alice.publicKey,
          reaction: aliceCommentReactionPDA,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc({ commitment: "confirmed" });

      // likes count after
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountAfter = comment.likes.toNumber();
      let dislikesCountAfter = comment.dislikes.toNumber();

      // number of likes reduced
      assert.ok(likesCountAfter < likesCountBefore);
      assert.ok(dislikesCountAfter > dislikesCountBefore);
    });
    it("increments likes after toggling from dislike", async () => {
      // get tweet to dislike
      let comment = await program.account.comment.fetch(aliceCommentPDA);

      let likesCountBefore = comment.likes.toNumber();
      let dislikesCountBefore = comment.dislikes.toNumber();

      // kama has already disliked alice's tweet before and now wants to like it
      await program.methods
        .likeComment()
        .accounts({
          author: kama.publicKey,
          reaction: kamaCommentReactionPDA1,
          comment: aliceCommentPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([kama])
        .rpc({ commitment: "confirmed" });

      // likes count after
      comment = await program.account.comment.fetch(aliceCommentPDA);
      let likesCountAfter = comment.likes.toNumber();
      let dislikesCountAfter = comment.dislikes.toNumber();

      // number of likes increased
      assert.ok(likesCountAfter > likesCountBefore);
      assert.ok(dislikesCountAfter < dislikesCountBefore);
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

  const getTweetReactionAddress = (
    author: PublicKey,
    tweet: PublicKey,
    programID: PublicKey,
  ) => {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode(TWEET_REACTION_SEED),
        author.toBuffer(),
        tweet.toBuffer(),
      ],
      programID,
    );
  };

  const getCommentReactionAddress = (
    author: PublicKey,
    comment: PublicKey,
    programID: PublicKey,
  ) => {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode(COMMENT_REACTION_SEED),
        author.toBuffer(),
        comment.toBuffer(),
      ],
      programID,
    );
  };

  const errorContains = (logs, error) => {
    const match = logs?.filter((s) => s.includes(error));
    return Boolean(match?.length);
  };
});
