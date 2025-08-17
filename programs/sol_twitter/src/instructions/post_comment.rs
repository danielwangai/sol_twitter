use crate::errors::TwitterError;
// use crate::states::{Comment, MaxTweetContentLength, Tweet};
use anchor_lang::prelude::*;

// // instruction
// pub fn add_comment(ctx: Context<AddComment>, comment: String) -> Result<()> {
//     // checks
//     if comment == "" {
//         return Err(TwitterError::CommentRequired.into());
//     }
//     if comment.chars().count() > MaxTweetContentLength {
//         return Err(TwitterError::CommentTooLong.into());
//     }
//
//     let new_comment = &mut ctx.accounts.comment;
//     new_comment.comment = comment;
//     new_comment.author = ctx.accounts.author.key();
//     new_comment.timestamp = Clock::get()?.unix_timestamp;
//     new_comment.parent_tweet = ctx.accounts.tweet.key();
//     new_comment.bump = ctx.bumps.comment;
//
//     Ok(())
// }
//
// #[derive(Accounts)]
// #[instruction(comment: String)]
// pub struct AddComment<'info> {
//     #[account(mut)]
//     pub author: Signer<'info>,
//     #[account(
//         init,
//         payer = author,
//         space = Comment::INIT_SPACE,
//         seeds = [
//             COMMENT_SEED.as_bytes(),
//             comment.as_bytes(),
//             author.key().as_ref()
//             tweet.key().as_ref()
//         ],
//     bump,
//     )]
//     pub comment: Account<'info, Comment>,
//     pub tweet: Account<'info, Tweet>,
//     pub system_program: Program<'info, System>,
// }
