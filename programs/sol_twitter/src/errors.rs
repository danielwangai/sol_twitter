use anchor_lang::error_code;

#[error_code]
pub enum TwitterError {
    #[msg("The content should be at most 280 characters long")]
    TweetContentTooLong,
    #[msg("The content cannot be empty")]
    TweetContentRequired,
    #[msg("Comment is required")]
    CommentRequired,
    #[msg("The comment should be at most 280 characters long")]
    CommentTooLong,
    #[msg("Maximum number of Likes Reached")]
    MaxLikesReached,
    #[msg("Maximum number of dislikes Reached")]
    MaxDislikesReached,
    #[msg("Cannot like more than once")]
    CannotLikeMoreThanOnce,
    #[msg("Cannot dislike more than once")]
    CannotDislikeMoreThanOnce,
    #[msg("User not authorized to perform this action")]
    Unauthorized,
}