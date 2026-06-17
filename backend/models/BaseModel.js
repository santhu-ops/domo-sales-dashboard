const Domoappdb = require('../config/Domoappdb');
const bcrypt = require('bcryptjs');

function isEqual(val, criterion) {
  if (val === criterion) return true;
  if (val === null || val === undefined || criterion === null || criterion === undefined) {
    return val === criterion;
  }
  if (typeof criterion === 'object' && typeof criterion.toString === 'function') {
    return String(val) === criterion.toString();
  }
  if (typeof val === 'object' && typeof val.toString === 'function') {
    return val.toString() === String(criterion);
  }
  return String(val) === String(criterion);
}

function matchQuery(doc, query) {
  if (!query) return true;
  for (const key of Object.keys(query)) {
    if (key === '$or') {
      if (!Array.isArray(query[key])) continue;
      let matched = false;
      for (const subQuery of query[key]) {
        if (matchQuery(doc, subQuery)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(query[key])) continue;
      for (const subQuery of query[key]) {
        if (!matchQuery(doc, subQuery)) return false;
      }
      continue;
    }

    const val = doc[key];
    const criterion = query[key];

    if (
      criterion &&
      typeof criterion === 'object' &&
      !Array.isArray(criterion) &&
      !(criterion instanceof Date) &&
      typeof criterion.toString !== 'function'
    ) {
      for (const op of Object.keys(criterion)) {
        const expected = criterion[op];
        if (op === '$regex') {
          const options = criterion.$options || '';
          const regex = new RegExp(expected, options);
          if (!regex.test(String(val || ''))) return false;
        } else if (op === '$eq') {
          if (!isEqual(val, expected)) return false;
        } else if (op === '$ne') {
          if (isEqual(val, expected)) return false;
        } else if (op === '$in') {
          if (!Array.isArray(expected)) return false;
          let matched = false;
          for (const item of expected) {
            if (isEqual(val, item)) {
              matched = true;
              break;
            }
          }
          if (!matched) return false;
        } else if (op === '$gt') {
          if (!(val > expected)) return false;
        } else if (op === '$gte') {
          if (!(val >= expected)) return false;
        } else if (op === '$lt') {
          if (!(val < expected)) return false;
        } else if (op === '$lte') {
          if (!(val <= expected)) return false;
        }
      }
    } else {
      if (!isEqual(val, criterion)) return false;
    }
  }
  return true;
}

class QueryChain {
  constructor(promise, hiddenFields = []) {
    this.promise = promise;
    this.hiddenFields = hiddenFields;
    this._sortObj = null;
    this._skipVal = 0;
    this._limitVal = null;
    this._selectStr = '';
  }

  sort(sortObj) {
    this._sortObj = sortObj;
    return this;
  }

  skip(skipVal) {
    this._skipVal = skipVal;
    return this;
  }

  limit(limitVal) {
    this._limitVal = limitVal;
    return this;
  }

  select(selectStr) {
    this._selectStr = selectStr || '';
    return this;
  }

  then(onFulfilled, onRejected) {
    return this.promise.then(docs => {
      let results = Array.isArray(docs) ? [...docs] : docs;

      const processDoc = (doc) => {
        if (!doc) return doc;
        const clean = { ...doc };
        const selectTokens = this._selectStr.split(/\s+/).filter(Boolean);
        const includeForce = selectTokens.filter(t => t.startsWith('+')).map(t => t.slice(1));
        const excludeForce = selectTokens.filter(t => t.startsWith('-')).map(t => t.slice(1));

        for (const field of this.hiddenFields) {
          if (!includeForce.includes(field)) {
            delete clean[field];
          }
        }

        for (const field of excludeForce) {
          delete clean[field];
        }

        return clean;
      };

      if (Array.isArray(results)) {
        if (this._sortObj) {
          const sortKeys = Object.keys(this._sortObj);
          results.sort((a, b) => {
            for (const key of sortKeys) {
              const dir = this._sortObj[key] === -1 ? -1 : 1;
              let valA = a[key];
              let valB = b[key];

              if (valA instanceof Date) valA = valA.getTime();
              if (valB instanceof Date) valB = valB.getTime();

              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
            }
            return 0;
          });
        }

        if (this._skipVal) {
          results = results.slice(this._skipVal);
        }
        if (this._limitVal !== null && this._limitVal !== undefined) {
          results = results.slice(0, this._limitVal);
        }

        return results.map(processDoc);
      } else {
        return processDoc(results);
      }
    }).then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.promise.then(
      res => Promise.resolve(onFinally()).then(() => res),
      err => Promise.resolve(onFinally()).then(() => { throw err; })
    );
  }
}

class BaseModel {
  constructor(collection, data = {}, hiddenFields = []) {
    this._collection = collection;
    this._hiddenFields = hiddenFields;
    Object.assign(this, data);
  }

  async save() {
    if (this._collection === 'users') {
      if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
    }

    if (this._collection === 'sales' && !this.saleNumber) {
      const allSales = await Domoappdb.findAll('sales');
      this.saleNumber = `SL-${String(allSales.length + 1).padStart(5, '0')}`;
    }

    const plain = {};
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_')) {
        plain[key] = this[key];
      }
    }

    if (this._id || this.id) {
      const id = this._id || this.id;
      const updated = await Domoappdb.updateById(this._collection, id, plain);
      Object.assign(this, updated);
    } else {
      const created = await Domoappdb.create(this._collection, plain);
      Object.assign(this, created);
    }
    return this;
  }

  static _createInstance(collection, doc, hiddenFields) {
    if (!doc) return null;
    const ModelClass = this;
    return new ModelClass(doc);
  }

  static find(query = {}) {
    const promise = Domoappdb.findAll(this.collectionName).then(docs => {
      const merged = docs.map(d => ({ id: d.id, _id: d.id, ...d.content }));
      const filtered = merged.filter(doc => matchQuery(doc, query));
      return filtered.map(doc => this._createInstance(this.collectionName, doc, this.hiddenFields));
    });
    return new QueryChain(promise, this.hiddenFields);
  }

  static findOne(query = {}) {
    const promise = Domoappdb.findAll(this.collectionName).then(docs => {
      const merged = docs.map(d => ({ id: d.id, _id: d.id, ...d.content }));
      const found = merged.find(doc => matchQuery(doc, query));
      return found ? this._createInstance(this.collectionName, found, this.hiddenFields) : null;
    });
    return new QueryChain(promise, this.hiddenFields);
  }

  static findById(id) {
    const promise = Domoappdb.findById(this.collectionName, id).then(doc => {
      if (!doc) return null;
      const merged = { id: doc.id, _id: doc.id, ...doc.content };
      return this._createInstance(this.collectionName, merged, this.hiddenFields);
    }).catch(() => null);
    return new QueryChain(promise, this.hiddenFields);
  }

  static async findByIdAndUpdate(id, updates, options = {}) {
    const cleanUpdates = {};
    for (const key of Object.keys(updates)) {
      if (!key.startsWith('$')) {
        cleanUpdates[key] = updates[key];
      } else if (key === '$set') {
        Object.assign(cleanUpdates, updates[key]);
      }
    }

    const existing = await Domoappdb.findById(this.collectionName, id);
    if (!existing) return null;

    const merged = { ...existing.content, ...cleanUpdates };

    if (this.collectionName === 'users' && cleanUpdates.password && !cleanUpdates.password.startsWith('$2a$') && !cleanUpdates.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      merged.password = await bcrypt.hash(cleanUpdates.password, salt);
    }

    await Domoappdb.updateById(this.collectionName, id, merged);
    const updatedMerged = { id, _id: id, ...merged };
    return this._createInstance(this.collectionName, updatedMerged, this.hiddenFields);
  }

  static async findByIdAndDelete(id) {
    try {
      const existing = await Domoappdb.findById(this.collectionName, id);
      if (!existing) return null;
      await Domoappdb.deleteById(this.collectionName, id);
      return { id, deleted: true };
    } catch {
      return null;
    }
  }

  static async create(data) {
    const instance = new this(data);
    await instance.save();
    return instance;
  }

  static async countDocuments(query = {}) {
    const docs = await Domoappdb.findAll(this.collectionName);
    const merged = docs.map(d => ({ id: d.id, _id: d.id, ...d.content }));
    const filtered = merged.filter(doc => matchQuery(doc, query));
    return filtered.length;
  }
}

module.exports = BaseModel;
