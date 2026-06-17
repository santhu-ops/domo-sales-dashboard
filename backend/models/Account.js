const BaseModel = require('./BaseModel');

class Account extends BaseModel {
  constructor(data) {
    super('accounts', data);
  }
}

Account.collectionName = 'accounts';
Account.hiddenFields = [];

module.exports = Account;
