use anchor_lang::prelude::*;

declare_id!("FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E");

#[program]
pub mod counter_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.authority = ctx.accounts.authority.key();

        emit!(CounterInitialized {
            authority: ctx.accounts.authority.key(),
            count: 0,
        });

        Ok(())
    }

    pub fn increment(ctx: Context<UpdateCounter>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        let old_count = counter.count;
        counter.count = counter.count.checked_add(1).unwrap();

        emit!(CounterIncremented {
            authority: ctx.accounts.authority.key(),
            old_count,
            new_count: counter.count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn decrement(ctx: Context<UpdateCounter>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        require!(counter.count > 0, CounterError::UnderflowError);

        let old_count = counter.count;
        counter.count = counter.count.checked_sub(1).unwrap();

        emit!(CounterDecremented {
            authority: ctx.accounts.authority.key(),
            old_count,
            new_count: counter.count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCounter<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump,
        has_one = authority
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

// Events
#[event]
pub struct CounterInitialized {
    pub authority: Pubkey,
    pub count: u64,
}

#[event]
pub struct CounterIncremented {
    pub authority: Pubkey,
    pub old_count: u64,
    pub new_count: u64,
    pub timestamp: i64,
}

#[event]
pub struct CounterDecremented {
    pub authority: Pubkey,
    pub old_count: u64,
    pub new_count: u64,
    pub timestamp: i64,
}

// Custom errors
#[error_code]
pub enum CounterError {
    #[msg("Counter cannot be decremented below zero")]
    UnderflowError,
}
