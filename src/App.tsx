import * as dotenv from 'dotenv';
dotenv.config({path: __dirname+'/.env'});
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import {TextField} from '@material-ui/core';
import {WalletViewModel, WalletViewModelDelegate} from './viewmodels/WalletViewModel';
import {WalletViewUiModel} from './viewmodels/WalletViewUiModel';
import {DataGrid, GridCellParams, GridSortDirection} from '@material-ui/data-grid';

class App extends React.Component implements WalletViewModelDelegate {
  viewModel: WalletViewModel

  constructor(props: any) {
    super(props);
    this.viewModel = new WalletViewModel(this);
    this.state = this.viewModel.uiModel;
  }

  // React methods

  render() {
    const uiModel = this.state as WalletViewUiModel;

    // generate the appropriate token columns
    const columns = [
      {field: 'icon', headerName: 'Symbol', width: 125, sortable: false, renderCell: (params: GridCellParams) => (
        <img className='Icon' src={params.row.tokenInfo.logoURI} />
      )},
      {field: 'tokenName', headerName: 'Token', width: 125, renderCell: (params: GridCellParams) => (
        <strong>{params.row.tokenInfo.symbol}</strong>
      )},
      {field: 'balance', headerName: 'Balance', type: 'number', width: 150, renderCell: (params: GridCellParams) => (
        <div>{params.row.tokenBalance.balance.toFixed(9)}</div>
      )},
    ];

    const rows = uiModel.tokenBalances;

    // map the appropriate sorted models
    const sortModels = [];
    if (uiModel.sortModel != null) {
      sortModels.push({
        field: uiModel.sortModel.field,
        sort: uiModel.sortModel.sort as GridSortDirection,
      });
    }

    return <div className='App'>
      <div className='HeaderContainer'>My Solana Wallet!</div>
      <div className='InputContainer'>
        <TextField
          className='InputContainer'
          value={uiModel.publicKey}
          label={uiModel.inputLabel}
          error={uiModel.publicKeyError}
          helperText={uiModel.inputHelperText}
          onChange={(e) => this.viewModel.setPublicKey(e.target.value)}
        />
      </div>
      <DataGrid
        className='Table'
        autoHeight
        checkboxSelection={false}
        getRowId={(r) => r.tokenInfo.mint}
        rows={rows}
        columns={columns}
        pageSize={10}
        sortModel={sortModels}
        onSortModelChange={(e) => {
          const sortModel = e.sortModel[0];
          if (sortModel == null) {
            this.viewModel.onSortModelChange(undefined);
          } else {
            this.viewModel.onSortModelChange({
              field: sortModel.field,
              sort: sortModel.sort || 'desc',
            });
          }
        }}
      />
    </div>;
  }

  // WalletViewModelDelegate

  reloadView(uiModel: WalletViewUiModel) {
    this.setState(uiModel);
  }
};

export default App;
