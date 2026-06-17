const BaseModel = require('./BaseModel');

class Deal extends BaseModel {
  constructor(data) {
    super('deals', data);
  }
}

Deal.collectionName = 'deals';
Deal.hiddenFields = [];

module.exports = Deal;
