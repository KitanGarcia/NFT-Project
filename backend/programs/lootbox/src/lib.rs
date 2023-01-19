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
