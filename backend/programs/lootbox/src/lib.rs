use anchor_lang::prelude::*;
use staking::UserStakeInfo;
use anchor_spl::token;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Burn, Mint, MintTo, Token, TokenAccount},
};

declare_id!("sNFTZhMMtw7PjeWcBFqRnvMpgU8wVWo56dEriUeyvmG");

#[program]
pub mod lootbox {
    use super::*;

    // Gives the user one out of all the possible mint options.
    // And receives payment (burning tokens)
    pub fn open_loobox(ctx: Context<OpenLootbox>, box_number: u64) -> Result<()> {
        let mut loot_box = 10;

        // Run an infinite loop
        loop {
            // If number of NAS tokens is too low, error
            if loot_box > box_number {
                return err!(LootboxError::InvalidLootbox);
            }

            // If loot_box and box_number match, require that the stake_state PDA's total
            // earned is greater than or equal to the box_number passed in
            // You have to have earned more than the box number
            if loot_box == box_number {
                require!(
                    ctx.accounts.stake_state.total_earned >= box_number,
                    LootboxError::InvalidLootbox
                );
                break;
            } else {
                loot_box = loot_box * 2;
            }
        }

        require!(
            !ctx.accounts.lootbox_pointer.is_initialized || ctx.accounts.lootbox_pointer.claimed,
            LootboxError::InvalidLootbox
        );

        // Burn the tokens that the box_number requires
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.stake_mint.to_account_info(),
                    from: ctx.accounts.stake_mint_ata.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                }
            ),
            box_number * u64::pow(10, 2)
        )?;

        let available_shapes: Vec<Pubkey> = vec![
        ];

        let clock = Clock::get()?;
        let i: usize = (clock.unix_timestamp % 5).try_into().unwrap();
        // Add in randomness later for selecting mint
        let mint = available_shapes[i];
        ctx.accounts.lootbox_pointer.mint = mint;
        ctx.accounts.lootbox_pointer.claimed = false;
        ctx.accounts.lootbox_pointer.is_initialized = true;

        Ok(())
    }

    pub fn retrieve_item_from_lootbox(ctx: Context<RetrieveItem>) -> Result<()> {
        // Require that lootbox pointer is not already claimed
        require!(
            !ctx.accounts.lootbox_pointer.claimed,
            LootboxError::AlreadyClaimed
        );

        // Mint item to user
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_gear_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[&[
                    b"mint".as_ref(),
                    &[*ctx.bumps.get("mint_authority").unwrap()]
                ]]
            ),
            1
        )?;

        ctx.accounts.lootbox_pointer.claimed = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct OpenLootbox<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = std::mem::size_of::<LootboxPointer>() + 8,
        seeds = ["lootbox".as_bytes(), user.key().as_ref()],
        bump
    )]
    pub lootbox_pointer: Account<'info, LootboxPointer>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,

    // Swap the next two lines out between prod/testing
    #[account(mut)]
    /*
    #[account(
        mut,
        address = "6YR1nuLqkk8VC1v42xJaPKvE9X9pnuqVAvthFUSDsMUL".parse::<Pubkey>().unwrap()
    )]
    */
    pub stake_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = stake_mint,
        associated_token::authority = user,
    )]
    pub stake_mint_ata: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(
        constraint = stake_state.user_pubkey == user.key()
    )]
    pub stake_state: Account<'info, UserStakeInfo>
}

#[derive(Accounts)]
pub struct RetrieveItem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds=["lootbox".as_bytes(), user.key().as_ref()],
        bump,
        constraint=lootbox_pointer.is_initialized
    )]
    pub lootbox_pointer: Account<'info, LootboxPointer>,

    #[account(
        mut,
        constraint=lootbox_pointer.mint==mint.key()
    )]
    // mint account for shape getting claimed
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer=user,
        associated_token::mint=mint,
        associated_token::authority=user
    )]
    pub user_gear_ata: Account<'info, TokenAccount>,
    /// CHECK: Mint authority - not used as account
    #[account(
        seeds=["mint".as_bytes()],
        bump
    )]
    // mint PDA assigned in client-side script
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}


#[account]
pub struct LootboxPointer {
    mint: Pubkey,
    claimed: bool,
    is_initialized: bool
}

#[error_code]
enum LootboxError {
    #[msg("Mint already claimed")]
    AlreadyClaimed,

    #[msg("Haven't staked long enough for this loot box or invalid loot box number")]
    InvalidLootbox,
}
