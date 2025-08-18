use anchor_lang::prelude::*;
use crate::states::{Comment, COMMENT_SEED};
use anchor_lang::solana_program::hash::hash;

pub fn remove_comment(ctx: Context<RemoveComment>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveComment<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        mut,
        close = author,
        seeds = [
            COMMENT_SEED.as_bytes(),
            {hash(comment.comment.as_bytes()).to_bytes().as_ref()},
            author.key().as_ref(),
            comment.parent_tweet.key().as_ref()
        ],
        bump,
    )]
    pub comment: Account<'info, Comment>,
}
