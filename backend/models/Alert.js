const BaseModel = require('./BaseModel');

class Alert extends BaseModel {
  constructor(data) {
    super('alerts', data);
  }
}

Alert.collectionName = 'alerts';
Alert.hiddenFields = [];

module.exports = Alert;
