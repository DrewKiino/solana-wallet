import * as DotEnv from 'dotenv';
DotEnv.config();
import {MySolana} from '../src/services/MySolana';
import {describe, it} from 'mocha';
import {expect} from 'chai';

const solana = new MySolana(process.env.REACT_APP_TEST_PUBLIC_KEY);

describe('Get User Balance', () => {
  it('User has SOL', async () => {
    const result = await solana.getSolBalance();
    expect(result.mint).equal(process.env.REACT_APP_SOL_MINT);
    expect(result.balance).greaterThanOrEqual(0);
  });
  it('User has USDC', async () => {
    const result = await solana.getTokenBalance(process.env.REACT_APP_USDC_MINT);
    expect(result.mint).equal(process.env.REACT_APP_USDC_MINT);
    expect(result.balance).greaterThanOrEqual(0);
  });
  it('User has tokens', async () => {
    const result = await solana.getTokenBalances();
    expect(result.length).greaterThanOrEqual(1);
  });
});
