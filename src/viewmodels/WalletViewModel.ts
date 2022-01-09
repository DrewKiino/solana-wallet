
import {MySolana, MySolanaDelegate} from '../services/MySolana';
import {TokenBalance} from '../services/TokenBalance';
import {SortModel} from './SortModel';
import {TokenBalanceUiModel} from './TokenBalanceUiModel';
import {WalletViewUiModel} from './WalletViewUiModel';

const DEFAULT_HELPER_TEXT = 'Insert public key here';
const DEFAULT_INPUT_LABEL = '26qv4GCcx98RihuK3c4T6ozB3J7L6VwCuFVc7Ta2A3Uo';

/**
 * The WalletViewModel delegate interface
 */
export interface WalletViewModelDelegate {
  reloadView(uiModel: WalletViewUiModel): void
}

/**
 * The Wallet View Model implementation
 */
export class WalletViewModel implements MySolanaDelegate {
  solana = new MySolana()

  delegate: WalletViewModelDelegate

  private inputPublicKey: string = ''
  private publicKeyError: boolean = false
  private inputLabel: string = DEFAULT_INPUT_LABEL
  private inputHelperText: string = DEFAULT_HELPER_TEXT

  private tokenBalancesByMint: Record<string, TokenBalance> = {}
  private sortModel?: SortModel

  /**
   * The aggregated uiModel data for the given
   * wallet state
   */
  get ['uiModel'](): WalletViewUiModel {
    return {
      publicKey: this.inputPublicKey,
      inputLabel: this.inputLabel,
      inputHelperText: this.inputHelperText,
      publicKeyError: this.publicKeyError,
      tokenBalances: this.makeTokenBalanceUiModels(),
      sortModel: this.sortModel,
    };
  }

  constructor(delegate: WalletViewModelDelegate) {
    this.delegate = delegate;
    this.solana.setDelegate(this);
  }

  /**
   * Sets the public key as the active Solana wallet
   * This kicks off the requests for retrieving the account's
   * SOL address along with all the associated tokens
   * registered in the address.
   * @param {string} value
   */
  setPublicKey(value: string) {
    this.inputPublicKey = value;
    if (value.length == 0) {
      this.inputLabel = DEFAULT_INPUT_LABEL;
      this.inputHelperText = DEFAULT_HELPER_TEXT;
      this.publicKeyError = false;
      this.tokenBalancesByMint = {};
    } else if (!this.solana.isValidPublicKey(value)) {
      this.inputLabel = DEFAULT_INPUT_LABEL;
      this.inputHelperText = 'Not a valid Solana address!';
      this.publicKeyError = true;
      this.tokenBalancesByMint = {};
      console.log(`Public Key ${value} is not valid.`);
    } else {
      this.inputLabel = '';
      this.inputHelperText = 'Retrieving account...';
      this.publicKeyError = false;
      console.log(`Public Key ${value} is valid.`);
      this.solana.publicKey = value;
      this.solana.getSolBalance();
      this.solana.getTokenBalances();
    }
    this.reloadView();
  }

  /**
   * Generates an array of token balance ui models
   * to be used by a view with the given view model
   * data set
   * @return {TokenBalanceUiModel[]}
   */
  makeTokenBalanceUiModels(): TokenBalanceUiModel[] {
    const solMintAddress = process.env.REACT_APP_SOL_MINT || '';
    const solBalance = this.tokenBalancesByMint[solMintAddress];
    const balances: TokenBalanceUiModel[] = [];

    Object.values(this.tokenBalancesByMint)
        .forEach((tokenBalance) => {
          if (tokenBalance.mint == solMintAddress) return;
          const tokenInfo = this.solana.getTokenInfo(tokenBalance.mint);
          // / Hide zero balance
          if (tokenInfo != null && tokenBalance.balance > 0) {
            balances.push({
              tokenInfo: tokenInfo,
              tokenBalance: tokenBalance,
            });
          }
        });

    const sortModel = this.sortModel;

    if (sortModel != null) {
      // Add SOL in now that we know the sort model
      if (solBalance != null) {
        const solInfo = this.solana.getTokenInfo(solBalance.mint);
        if (solInfo != null) {
          balances.push({
            tokenInfo: solInfo,
            tokenBalance: solBalance,
          });
        }
      }
      if (sortModel.field == 'tokenName') {
        balances.sort((a, b) => {
          return a.tokenInfo.symbol.toLowerCase()
              .localeCompare(b.tokenInfo.symbol.toLowerCase());
        });
        if (sortModel.sort == 'asc') {
          balances.reverse();
        }
      } else if (sortModel.field == 'balance') {
        balances.sort((a, b) => {
          if (sortModel.sort == 'asc') {
            return a.tokenBalance.balance > b.tokenBalance.balance ? 1 : -1;
          } else {
            return a.tokenBalance.balance < b.tokenBalance.balance ? 1 : -1;
          }
        });
      }
    } else {
      // Default sorting
      balances.sort((a, b) => a.tokenInfo.symbol.localeCompare(b.tokenInfo.symbol));
      // Make sure Solana is at the top
      if (solBalance != null) {
        const solInfo = this.solana.getTokenInfo(solBalance.mint);
        if (solInfo != null) {
          balances.unshift({
            tokenInfo: solInfo,
            tokenBalance: solBalance,
          });
        }
      }
    }

    return balances;
  }

  /**
   * Callback function for setting the sort model
   * for the wallet view model
   * @param {SortModel} sortModel
   */
  onSortModelChange(sortModel: SortModel | undefined) {
    this.sortModel = sortModel;
    this.reloadView();
  }

  // Solana Delegate

  solanaDelegateDidRefreshTokenInfo() {
    this.reloadView();
  }

  solanaDelegateDidRefreshTokenBalances(balances: TokenBalance[]): void {
    this.inputHelperText = '';
    balances.forEach((e) => this.tokenBalancesByMint[e.mint] = e);
    this.reloadView();
  }

  reloadView() {
    this.delegate.reloadView(this.uiModel);
  }
}

