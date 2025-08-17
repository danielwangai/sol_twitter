use crate::errors::TwitterError;
use crate::states::{Comment, MaxCommentLength, MaxTweetContentLength, Tweet, COMMENT_SEED};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

const COMMENT_SIZE: usize = 8 + (4 + MaxCommentLength) + 32 + 32 + 8;

// instruction
pub fn post_comment(ctx: Context<PostComment>, tweet_comment: String) -> Result<()> {
    // checks
    if tweet_comment == "" {
        return Err(TwitterError::CommentRequired.into());
    }
    if tweet_comment.chars().count() > MaxCommentLength {
        return Err(TwitterError::CommentTooLong.into());
    }

    let new_comment = &mut ctx.accounts.comment;
    new_comment.comment = tweet_comment;
    new_comment.author = ctx.accounts.author.key();
    new_comment.timestamp = Clock::get()?.unix_timestamp;
    new_comment.parent_tweet = ctx.accounts.tweet.key();
    new_comment.bump = ctx.bumps.comment;

    Ok(())
}

#[derive(Accounts)]
#[instruction(tweet_comment: String)]
pub struct PostComment<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init,
        payer = author,
        space = 8 + Comment::INIT_SPACE,
        seeds = [
            COMMENT_SEED.as_bytes(),
            {hash(tweet_comment.as_bytes()).to_bytes().as_ref()},
            author.key().as_ref(),
            tweet.key().as_ref()
        ],
    bump,
    )]
    pub comment: Account<'info, Comment>,
    #[account(mut)]
    pub tweet: Account<'info, Tweet>,
    pub system_program: Program<'info, System>,
}
