use anchor_lang::prelude::*;

pub const MaxTweetContentLength: usize = 280; // 280 chars max.
pub const MaxCommentLength: usize = 280; // 280 chars max.
pub const TWEET_SEED: &str = "TWEET_SEED";
pub const COMMENT_SEED: &str = "COMMENT_SEED";
pub const TWEET_REACTION_SEED: &str = "TWEET_REACTION_SEED";
pub const COMMENT_REACTION_SEED: &str = "COMMENT_REACTION_SEED";

#[derive(AnchorDeserialize, AnchorSerialize, Clone, InitSpace)]
pub enum ReactionType {
    None,
    Like,
    Dislike,
}

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

#[account]
#[derive(InitSpace)]
pub struct Comment {
    #[max_len(MaxCommentLength)]
    pub comment: String,
    pub author: Pubkey,
    pub timestamp: i64,
    pub parent_tweet: Pubkey,
    pub likes: u64,
    pub dislikes: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TweetReaction {
    pub author: Pubkey,
    pub tweet: Pubkey,
    pub reaction: ReactionType,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CommentReaction {
    pub author: Pubkey,
    pub comment: Pubkey,
    pub reaction: ReactionType,
    pub bump: u8,
}
