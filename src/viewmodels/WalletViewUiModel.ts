import {SortModel} from './SortModel';
import {TokenBalanceUiModel} from './TokenBalanceUiModel';

export type WalletViewUiModel = {
  publicKey: string,
  inputLabel: string,
  inputHelperText: string,
  publicKeyError: boolean,
  tokenBalances: TokenBalanceUiModel[],
  sortModel?: SortModel
};

