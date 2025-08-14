use anchor_lang::prelude::*;
use crate::instructions::*;
pub mod errors;
pub mod states;
pub mod instructions;


declare_id!("6mbRzxbCKNTQjbTDx6dLm1ddcyyEXT8uE58rQimSvKLJ");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn post_new_tweet(ctx: Context<PostTweet>, content: String) -> Result<()> {
        post_tweet(ctx, content)
    }
}