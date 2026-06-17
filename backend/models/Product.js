const BaseModel = require('./BaseModel');

class Product extends BaseModel {
  constructor(data) {
    super('products', data);
  }
}

Product.collectionName = 'products';
Product.hiddenFields = [];

module.exports = Product;
