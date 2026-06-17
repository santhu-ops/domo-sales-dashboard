const BaseModel = require('./BaseModel');

class Sale extends BaseModel {
  constructor(data) {
    super('sales', data);
  }
}

Sale.collectionName = 'sales';
Sale.hiddenFields = [];

module.exports = Sale;
