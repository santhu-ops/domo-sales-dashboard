const BaseModel = require('./BaseModel');

class Activity extends BaseModel {
  constructor(data) {
    super('activities', data);
  }
}

Activity.collectionName = 'activities';
Activity.hiddenFields = [];

module.exports = Activity;
