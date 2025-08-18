use anchor_lang::prelude::*;
use crate::errors::TwitterError;
use crate::states::{Comment, CommentReaction, ReactionType, COMMENT_REACTION_SEED};

pub fn react_to_comment(ctx: Context<ReactToComment>, reaction: ReactionType) -> Result<()> {
    let comment = &mut ctx.accounts.comment;
    let comment_reaction = &mut ctx.accounts.reaction;

    if comment_reaction.author != Pubkey::default() && comment_reaction.author != ctx.accounts.author.key() {
        return Err(TwitterError::Unauthorized.into());
    }

    comment_reaction.author = ctx.accounts.author.key();
    comment_reaction.comment = comment.key();

    match (&comment_reaction.reaction, &reaction) {
        (ReactionType::None, ReactionType::Like) => {
            comment.likes = comment.likes.checked_add(1).ok_or(TwitterError::MaxLikesReached)?;
        }
        (ReactionType::None, ReactionType::Dislike) => {
            comment.dislikes = comment.dislikes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        (ReactionType::Like, ReactionType::Dislike) => {
            comment.likes = comment.likes.saturating_sub(1);
            comment.dislikes = comment.dislikes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        (ReactionType::Dislike, ReactionType::Like) => {
            comment.dislikes = comment.dislikes.saturating_sub(1);
            comment.likes = comment.likes.checked_add(1).ok_or(TwitterError::MaxDislikesReached)?;
        }
        // prevents a user from liking the same comment more than once
        (ReactionType::Like, ReactionType::Like) => {
            return Err(TwitterError::CannotLikeMoreThanOnce.into());
        }
        // prevents a user from disliking the same comment more than once
        (ReactionType::Dislike, ReactionType::Dislike) => {
            return Err(TwitterError::CannotDislikeMoreThanOnce.into());
        }
        _ => {}
    }

    comment_reaction.reaction = reaction;
    comment_reaction.bump = ctx.bumps.reaction;

    Ok(())
}

#[derive(Accounts)]
pub struct ReactToComment<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init_if_needed,
        payer = author,
        space = 8 + CommentReaction::INIT_SPACE,
        seeds = [
            COMMENT_REACTION_SEED.as_bytes(),
            author.key().as_ref(),
            comment.key().as_ref()
        ],
        bump
    )]
    pub reaction: Account<'info, CommentReaction>,
    #[account(mut)]
    pub comment: Account<'info, Comment>,
    pub system_program: Program<'info, System>,
}
