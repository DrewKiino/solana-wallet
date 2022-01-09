import {TokenListProvider} from '@solana/spl-token-registry';
import * as Solana from '@solana/web3.js';
import {TokenBalance} from './TokenBalance';
import {TokenInfo} from './TokenInfo';

/**
 * The Solana service delegate interface
 */
export interface MySolanaDelegate {
  solanaDelegateDidRefreshTokenBalances(balances: TokenBalance[]): void
  solanaDelegateDidRefreshTokenInfo(): void
}

/**
 * The Solana Web3 service wrapper
 */
export class MySolana {
  private tokenInfoByMintAddress: Record<string, TokenInfo> = {}

  connection = new Solana.Connection(process.env.REACT_APP_MAIN_CLUSTER_URL || '')
  publicKey: string

  delegate?: MySolanaDelegate

  constructor(publicKey: string = '') {
    this.publicKey = publicKey;
    this.refreshTokenInfo();
  }

  /**
   * Sets the delegate for this Solana service
   * @param {MySolanaDelegate} delegate
   */
  setDelegate(delegate: MySolanaDelegate) {
    this.delegate = delegate;
  }

  /**
   * Refreshes the list of token information for all tokens
   * registered in the SPL program ecosystem
   */
  private refreshTokenInfo() {
    new TokenListProvider().resolve().then((tokens) => {
      const clusterId = Number(process.env.REACT_APP_MAIN_CLUSTER_ID);
      const tokenList = tokens.filterByChainId(clusterId).getList();

      tokenList.forEach((e) => {
        this.tokenInfoByMintAddress[e.address] = {
          mint: e.address,
          symbol: e.symbol,
          logoURI: e.logoURI,
        };
      });

      this.delegate?.solanaDelegateDidRefreshTokenInfo();
    });
  }

  /**
   * Requests the SOL balance for the given Solana public blockchain address
   * @param {string} mintAddress
   * @return {Promise<TokenBalance>}
   */
  async getSolBalance(): Promise<TokenBalance> {
    const result = await this.connection.getParsedAccountInfo(
        this.makePublicKey(this.publicKey),
    );
    const account: Solana.AccountInfo<Buffer | Solana.ParsedAccountData> | null = result.value;
    if (account != null) {
      const tokenBalance: TokenBalance = {
        mint: process.env.REACT_APP_SOL_MINT || '',
        balance: account.lamports * 0.000000001,
      };
      this.delegate?.solanaDelegateDidRefreshTokenBalances([tokenBalance]);
      return tokenBalance;
    }
    return Promise.reject(Error('No balance found'));
  };

  /**
   * Requests the token balances for the given mint address
   * currently registered for the given Solana blockchain address
   * @param {string} mintAddress
   * @return {Promise<TokenBalance[]>}
   */
  async getTokenBalance(mintAddress: string) {
    const filter = {mint: this.makePublicKey(mintAddress)};
    const result = await this.connection.getParsedTokenAccountsByOwner(
        this.makePublicKey(this.publicKey),
        filter,
    );
    if (result.value != null) {
      const account: Solana.AccountInfo<Solana.ParsedAccountData> = result.value[0].account;
      const balance = account.data.parsed.info.tokenAmount.uiAmount;
      const tokenBalance: TokenBalance = {
        mint: mintAddress,
        balance: balance,
      };
      this.delegate?.solanaDelegateDidRefreshTokenBalances([tokenBalance]);
      return tokenBalance;
    }
    return Promise.reject(Error('No balance found'));
  }

  /**
   * Requests all the token balances currently registered for the given
   * Solana blockchain address
   * @return {Promise<TokenBalance[]>}
   */
  async getTokenBalances() {
    const result = await this.connection.getParsedTokenAccountsByOwner(
        this.makePublicKey(this.publicKey),
        {programId: this.makePublicKey(process.env.REACT_APP_TOKEN_PROGRAM_ID || '')},
    );
    const balances = result.value
        .map((e) => {
          return this.makeTokenBalance(e.account);
        })
        // Skip parsinig SOL balance since getSolBalance gives the proper balance
        .filter((e) => e.mint != process.env.REACT_APP_SOL_MINT || '');
    this.delegate?.solanaDelegateDidRefreshTokenBalances(balances);
    return balances;
  }

  /**
   * Maps the given account model into a simplified token balance model
   * @param {Solana.AccountInfo<Solana.ParsedAccountData>} account
   * @return {TokenBalance}
   */
  private makeTokenBalance(account: Solana.AccountInfo<Solana.ParsedAccountData>): TokenBalance {
    const accountInfo = account.data.parsed.info;
    const balance = accountInfo.tokenAmount.uiAmount;
    return {
      mint: accountInfo.mint,
      balance: balance,
    };
  }

  /**
   * Returns the cached token information for the given mint address
   * @param {string} mintAddress
   * @return {TokenInfo | undefined}
   */
  getTokenInfo(mintAddress: string): TokenInfo | undefined {
    return this.tokenInfoByMintAddress[mintAddress];
  }

  /**
   * Generates a public key for the given address string
   * Will throw an error if the string is invalid
   * @param {string} value
   * @return {Solana.PublicKey}
   */
  makePublicKey(value: string): Solana.PublicKey {
    return new Solana.PublicKey(value);
  }

  /**
   * Checks if the given string is a valid public key
   * @param {string} value
   * @return {Boolean}
   */
  isValidPublicKey(value: string): Boolean {
    try {
      new Solana.PublicKey(value);
      return true;
    } catch {
      return false;
    }
  }
}
