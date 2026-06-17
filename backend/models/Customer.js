const BaseModel = require('./BaseModel');

class Customer extends BaseModel {
  constructor(data) {
    super('customers', data);
  }

  get fullName() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
}

Customer.collectionName = 'customers';
Customer.hiddenFields = [];

module.exports = Customer;
