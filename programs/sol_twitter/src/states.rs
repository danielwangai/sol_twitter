use anchor_lang::prelude::*;

pub const MaxTweetContentLength: usize = 280; // 280 chars max.

#[account]
#[derive(InitSpace)]
pub struct Tweet {
    #[max_len(MaxTweetContentLength)]
    pub content: String,
    pub author: Pubkey,
    pub timestamp: i64,
    pub likes: u64,
    pub dislikes: u64,
    pub bump: u8,
}
