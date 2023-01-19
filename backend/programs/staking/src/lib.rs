use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Approve, Mint, MintTo, Revoke, Token, TokenAccount},
};
use mpl_token_metadata::{
    instruction::{freeze_delegated_account, thaw_delegated_account},
    ID as MetadataTokenId,
};

declare_id!("7Q3Ct4TUFa1myoS3zY2FFskk4Qcupjxhw5yxTFMTKsG2");

#[program]
pub mod staking {
    use super::*;

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(
            ctx.accounts.stake_state.stake_state == StakeState::Unstaked,
            StakeError::AlreadyStaked
        );

        msg!("Approving delegate");

        // Create CPI to delegate this program as the authority to freeze or thaw our NFT 
        // Set CPI, identify which accounts we are using, then set authority
        let cpi_approve_program = ctx.accounts.token_program.to_account_info();
        let cpi_approve_accounts = Approve {
            to: ctx.accounts.nft_token_account.to_account_info(),
            delegate: ctx.accounts.program_authority.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_approve_ctx = CpiContext::new(cpi_approve_program, cpi_approve_accounts);
        token::approve(cpi_approve_ctx, 1)?;


        msg!("Freezing token account");

        let authority_bump = *ctx.bumps.get("program_authority").unwrap();
        invoke_signed(
            // All necessary accounts
            &freeze_delegated_account(
                ctx.accounts.metadata_program.key(),
                ctx.accounts.program_authority.key(),
                ctx.accounts.nft_token_account.key(),
                ctx.accounts.nft_edition.key(),
                ctx.accounts.nft_mint.key(),
            ),
            // Array of account infos
            &[
                ctx.accounts.program_authority.to_account_info(),
                ctx.accounts.nft_token_account.to_account_info(),
                ctx.accounts.nft_edition.to_account_info(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.metadata_program.to_account_info(),
            ],
            // Seed and bump
            &[&[b"authority", &[authority_bump]]]
        )?;


        // Set data on stake accounts
        ctx.accounts.stake_state.token_account = ctx.accounts.nft_token_account.key();
        ctx.accounts.stake_state.user_pubkey = ctx.accounts.user.key();
        ctx.accounts.stake_state.stake_state = StakeState::Staked;
        ctx.accounts.stake_state.stake_start_time = clock.unix_timestamp;
        ctx.accounts.stake_state.last_stake_redeem = clock.unix_timestamp;
        ctx.accounts.stake_state.is_initialized = true;

        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        require!(
            ctx.accounts.stake_state.is_initialized,
            StakeError::UninitializedAccount
        );

        require!(
            ctx.accounts.stake_state.stake_state == StakeState::Staked,
            StakeError::InvalidStakeState
        );

        let clock = Clock::get()?;

        msg!("Stake last redeem: {:?}", ctx.accounts.stake_state.last_stake_redeem);
        msg!("Current time: {:?}", clock.unix_timestamp);

        let unix_time = clock.unix_timestamp - ctx.accounts.stake_state.last_stake_redeem;
        msg!("Seconds since last redeem: {}", unix_time);

        // Swap the next two lines out between prod/testing
        let redeem_amount = (10000000000 * i64::pow(10, 2) * unix_time) / (24 * 60 * 60);
        // let redeem_amount = (10 * i64::pow(10, 2) * unix_time) / (24 * 60 * 60);
        msg!("Eligible redeem amount: {}", redeem_amount);

        msg!("Minting staking rewards");
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.stake_mint.to_account_info(),
                    to: ctx.accounts.user_stake_ata.to_account_info(),
                    authority: ctx.accounts.stake_authority.to_account_info(),
                },
                &[&[
                    b"mint".as_ref(),
                    &[*ctx.bumps.get("stake_authority").unwrap()],
                ]]
            ),
            redeem_amount.try_into().unwrap()
        )?;

        // Set last stake redeem time so users don't get more rewards than they should
        ctx.accounts.stake_state.last_stake_redeem = clock.unix_timestamp;
        ctx.accounts.stake_state.total_earned += redeem_amount as u64;
        msg!("Updated last stake redeem time: {:?}", ctx.accounts.stake_state.last_stake_redeem);

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        require!(
            ctx.accounts.stake_state.is_initialized,
            StakeError::UninitializedAccount
        );

        require!(
            ctx.accounts.stake_state.stake_state == StakeState::Staked,
            StakeError::InvalidStakeState
        );

        msg!("Thawing token account");
        let authority_bump = *ctx.bumps.get("program_authority").unwrap();
        invoke_signed(
            &thaw_delegated_account(
                ctx.accounts.metadata_program.key(),
                ctx.accounts.program_authority.key(),
                ctx.accounts.nft_token_account.key(),
                ctx.accounts.nft_edition.key(),
                ctx.accounts.nft_mint.key(),
            ),
            &[
                ctx.accounts.program_authority.to_account_info(),
                ctx.accounts.nft_token_account.to_account_info(),
                ctx.accounts.nft_edition.to_account_info(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.metadata_program.to_account_info(),
            ],
            &[&[b"authority", &[authority_bump]]]
        )?;

        msg!("Revoking delegate");
        // Create CPI to revoke this program as the authority to freeze or thaw our NFT 
        let cpi_revoke_program = ctx.accounts.token_program.to_account_info();
        let cpi_revoke_accounts = Revoke {
            source: ctx.accounts.nft_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_revoke_ctx = CpiContext::new(cpi_revoke_program, cpi_revoke_accounts);
        token::revoke(cpi_revoke_ctx)?;

        // The following code is the same as for redeem() as we want redeeming to happen on
        // unstake

        let clock = Clock::get()?;

        msg!("Stake last redeem: {:?}", ctx.accounts.stake_state.last_stake_redeem);
        msg!("Current time: {:?}", clock.unix_timestamp);

        let unix_time = clock.unix_timestamp - ctx.accounts.stake_state.last_stake_redeem;
        msg!("Seconds since last redeem: {}", unix_time);

        // Swap the next two lines out between prod/testing
        let redeem_amount = (10000000000 * i64::pow(10, 2) * unix_time) / (24 * 60 * 60);
        // let redeem_amount = (10 * i64::pow(10, 2) * unix_time) / (24 * 60 * 60);
        msg!("Eligible redeem amount: {}", redeem_amount);

        msg!("Minting staking rewards");
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.stake_mint.to_account_info(),
                    to: ctx.accounts.user_stake_ata.to_account_info(),
                    authority: ctx.accounts.stake_authority.to_account_info(),
                },
                &[&[
                    b"mint".as_ref(),
                    &[*ctx.bumps.get("stake_authority").unwrap()],
                ]]
            ),
            redeem_amount.try_into().unwrap()
        )?;

        // Set last stake redeem time so users don't get more rewards than they should
        ctx.accounts.stake_state.last_stake_redeem = clock.unix_timestamp;
        ctx.accounts.stake_state.total_earned += redeem_amount as u64;
        msg!("Updated last stake redeem time: {:?}", ctx.accounts.stake_state.last_stake_redeem);

        ctx.accounts.stake_state.stake_state = StakeState::Unstaked;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = user,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: Manual validation
    #[account(owner=MetadataTokenId)]
    // /// CHECK: above to avoid error on unchecked account - there is no type already created in
    // the system
    pub nft_edition: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = std::mem::size_of::<UserStakeInfo>() + 8,
        seeds = [user.key().as_ref(), nft_token_account.key().as_ref()],
        bump
    )]
    pub stake_state: Account<'info, UserStakeInfo>,

    /// CHECK: Manual validation
    #[account(mut, seeds = ["authority".as_bytes().as_ref()], bump)]
    pub program_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, Metadata>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::authority = user,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [user.key().as_ref(), nft_token_account.key().as_ref()],
        bump,
        constraint = *user.key == stake_state.user_pubkey,
        constraint = nft_token_account.key() == stake_state.token_account,
    )]
    pub stake_state: Account<'info, UserStakeInfo>,

    // Reward mint
    #[account(mut)]
    pub stake_mint: Account<'info, Mint>,

    /// CHECK: Manual validation
    #[account(seeds = ["mint".as_bytes().as_ref()], bump)]
    stake_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint=stake_mint,
        associated_token::authority=user
    )]
    pub user_stake_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::authority = user
    )]
    nft_token_account: Account<'info, TokenAccount>,
    nft_mint: Account<'info, Mint>,

    ///CHECK: Manual validation
    #[account(owner = MetadataTokenId)]
    pub nft_edition: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [user.key().as_ref(), nft_token_account.key().as_ref()],
        bump,
        constraint = *user.key == stake_state.user_pubkey,
        constraint = nft_token_account.key() == stake_state.token_account,
    )]
    pub stake_state: Account<'info, UserStakeInfo>,

    ///CHECK: manual check
    #[account(mut, seeds = ["authority".as_bytes().as_ref()], bump)]
    pub program_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub stake_mint: Account<'info, Mint>,

    ///CHECK: manual check
    #[account(seeds = ["mint".as_bytes().as_ref()], bump)]
    pub stake_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = stake_mint,
        associated_token::authority = user
    )]
    // Add Box to allocated stack to heap since space runs out in the stack
    // ^ Any account will do for this
    pub user_stake_ata: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub metadata_program: Program<'info, Metadata>
}

#[account]
pub struct UserStakeInfo {
    pub token_account: Pubkey,
    pub stake_start_time: i64,
    pub last_stake_redeem: i64,
    pub total_earned: u64,
    pub user_pubkey: Pubkey,
    pub stake_state: StakeState,
    pub is_initialized: bool,
}

// Stake State enum will be one of the fields for our UserStakeInfo PDA
#[derive(Debug, PartialEq, AnchorDeserialize, AnchorSerialize, Clone)]
pub enum StakeState {
    Unstaked,
    Staked
}

// Default value as Unstaked for StakeState
impl Default for StakeState {
    fn default() -> Self {
        StakeState::Unstaked
    }
}

// Create a Metadata struct and an implementation of id that returns a pubkey
// This is so that we can use the Metadata Program like the other programs (System and Token)
#[derive(Clone)]
pub struct Metadata;
impl anchor_lang::Id for Metadata {
    fn id() -> Pubkey {
        MetadataTokenId
    }
}

#[error_code]
pub enum StakeError {
    #[msg("NFT already staked")]
    AlreadyStaked,

    #[msg("State account is uninitialized")]
    UninitializedAccount,

    #[msg("Stake state is invalid")]
    InvalidStakeState,
}
