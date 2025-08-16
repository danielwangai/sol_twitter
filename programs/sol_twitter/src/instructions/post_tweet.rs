use crate::errors::TwitterError;
use crate::states::*;
use anchor_lang::prelude::*;

const TWEET_SIZE: usize = 8 // discriminator length
+ (4 + MaxTweetContentLength) // max content size
+ 32 // author public key length
+ 8 // timestamp
+ 8 // likes
+ 8; // dislikes
     // + 1; // bump

pub fn post_tweet(ctx: Context<PostTweet>, content: String) -> Result<()> {
    if content == "" {
        return Err(TwitterError::TweetContentRequired.into());
    }

    if content.chars().count() > MaxTweetContentLength {
        return Err(TwitterError::TweetContentTooLong.into());
    }

    let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
    let author: &Signer = &ctx.accounts.author;
    let clock: Clock = Clock::get()?;

    tweet.content = content;
    tweet.author = *author.key;
    tweet.timestamp = clock.unix_timestamp;
    tweet.likes = 0;
    tweet.dislikes = 0;
    // tweet.bump = ctx.bumps.tweet;

    Ok(())
}

#[derive(Accounts)]
#[instruction(content: String)]
pub struct PostTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init,
        payer = author,
        space = TWEET_SIZE,
        seeds = [TWEET_SEED.as_bytes(), content.as_bytes(), author.key().as_ref()],
        bump,
    )]
    pub tweet: Account<'info, Tweet>,
    pub system_program: Program<'info, System>,
}
