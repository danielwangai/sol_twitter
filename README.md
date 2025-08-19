# Solana Twitter (Anchor Program)

This project implements a minimal **Twitter-like dApp** on **Solana**, using [Anchor](https://www.anchor-lang.com/).  
It supports creating tweets, adding comments, and reacting (like/dislike) to tweets and comments, all stored as Solana accounts (PDAs).

This project is adapted from [Ackee Blockchain's](https://ackee.xyz/) [School Of Solana](https://ackee.xyz/school-of-solana) bootcamp and Loris Leiva's [tutorial](https://lorisleiva.com/create-a-solana-dapp-from-scratch/) with a few modifications.

---

## ✨ Features

- **Tweets**  
  Users can post tweets (stored in PDA accounts).
    - Each tweet must have unique content per user(a user can't have multiple tweets with the same content).
    - Tweets are tied to their author.

- **Comments**  
  Users can reply to tweets by posting comments.
    - Comments are stored as PDA accounts tied to both the parent tweet and the comment author.

- **Reactions**  
  Users can like or dislike comments.
    - Each user can only have one reaction per tweet and comment.
    - A reaction can be either `Like` or `Dislike`.
    - Trying to like/dislike more than once is not allowed.

---

## ⚖️ Rules of Operations

1. **Tweets**
    - Unique per `(author, content)` pair.
    - Cannot exceed **280** characters (enforced in program).

2. **Comments**
    - Tied to both `(author, tweet)` pair.
    - Cannot exceed **280** characters.

3. **Reactions**
    - Each user can like/dislike a comment/tweet but **not** both.
    - Users cannot like a comment more than once.
    - Users cannot dislike a comment more than once.
    - Reactions can be changed (e.g., like → dislike) only by updating the existing reaction account.

---

## 🛠️ Setup

### Prerequisites
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli) (≥ 1.18.0)
- [Anchor](https://book.anchor-lang.com/getting_started/installation.html) (≥ 0.29.0)
- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)

Make sure you have enough lamports by airdropping:- 
```sh
$ solana airdrop 2
```

### Install Dependencies
```sh
npm install
```

### Build project

```sh
make build
```

### Deploy project

```sh
make deploy
```

### Run tests

```sh
make test
```

After making changes to the tests, be sure to format by running:-

```sh
make fmt-test
```
