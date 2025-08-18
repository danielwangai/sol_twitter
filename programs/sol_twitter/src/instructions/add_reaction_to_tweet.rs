use anchor_lang::prelude::*;
use crate::errors::TwitterError;
use crate::states::{Reaction, ReactionType, Tweet, REACTION_SEED};

pub fn react_to_tweet(ctx: Context<ReactToTweet>, reaction: ReactionType) -> Result<()> {
    let tweet = &mut ctx.accounts.tweet;
    let tweet_reaction = &mut ctx.accounts.reaction;

    if tweet_reaction.author != Pubkey::default() && tweet_reaction.author != ctx.accounts.author.key() {
        return Err(TwitterError::Unauthorized.into());
    }

    tweet_reaction.author = ctx.accounts.author.key();
    tweet_reaction.parent_tweet = tweet.key();

    match (&tweet_reaction.reaction, &reaction) {
        (ReactionType::None, ReactionType::Like) => {
            tweet.likes = tweet.likes.checked_add(1).ok_or(TwitterError::MaxLikesReached)?;
        }
        (ReactionType::None, ReactionType::Dislike) => {
            tweet.dislikes = tweet.dislikes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        (ReactionType::Like, ReactionType::Dislike) => {
            tweet.likes = tweet.likes.saturating_sub(1);
            tweet.dislikes = tweet.dislikes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        (ReactionType::Dislike, ReactionType::Like) => {
            tweet.dislikes = tweet.dislikes.saturating_sub(1);
            tweet.likes = tweet.likes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        // prevents a user from liking the same tweet more than once
        (ReactionType::Like, ReactionType::Like) => {
            return Err(TwitterError::CannotLikeMoreThanOnce.into());
        }
        // prevents a user from disliking the same tweet more than once
        (ReactionType::Dislike, ReactionType::Dislike) => {
            return Err(TwitterError::CannotDislikeMoreThanOnce.into());
        }
        _ => {}
    }

    tweet_reaction.reaction = reaction;
    tweet_reaction.bump = ctx.bumps.reaction;

    Ok(())
}

#[derive(Accounts)]
pub struct ReactToTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init_if_needed,
        payer = author,
        space = 8 + Reaction::INIT_SPACE,
        seeds = [REACTION_SEED.as_bytes(), author.key().as_ref(), tweet.key().as_ref()],
        bump
    )]
    pub reaction: Account<'info, Reaction>,
    #[account(mut)]
    pub tweet: Account<'info, Tweet>,
    pub system_program: Program<'info, System>,
    // pub bump: u8,
}
