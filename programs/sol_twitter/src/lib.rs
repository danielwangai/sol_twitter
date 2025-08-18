use crate::instructions::*;
use anchor_lang::prelude::*;
pub mod errors;
pub mod instructions;
pub mod states;
use crate::states::ReactionType;

declare_id!("6mbRzxbCKNTQjbTDx6dLm1ddcyyEXT8uE58rQimSvKLJ");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn post_new_tweet(ctx: Context<PostTweet>, content: String) -> Result<()> {
        post_tweet(ctx, content)
    }

    pub fn post_new_comment(ctx: Context<PostComment>, content: String) -> Result<()> {
        post_comment(ctx, content)
    }

    pub fn delete_comment(ctx: Context<RemoveComment>) -> Result<()> {
        remove_comment(ctx)
    }

    pub fn like_tweet(ctx: Context<ReactToTweet>) -> Result<()> {
        react_to_tweet(ctx, ReactionType::Like)
    }

    pub fn dislike_tweet(ctx: Context<ReactToTweet>) -> Result<()> {
        react_to_tweet(ctx, ReactionType::Dislike)
    }
}
