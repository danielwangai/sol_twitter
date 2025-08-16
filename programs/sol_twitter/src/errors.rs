use anchor_lang::error_code;

#[error_code]
pub enum TwitterError {
    #[msg("The content should be at most 280 characters long")]
    TweetContentTooLong,
    #[msg("The content cannot be empty")]
    TweetContentRequired,
}