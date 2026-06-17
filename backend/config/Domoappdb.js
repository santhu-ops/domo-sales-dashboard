/**
 * Domo AppDB Service
 * Replaces all MongoDB/Mongoose calls with Domo AppDB REST API.
 * 
 * Domo AppDB stores data in "datastores" (collections) and "documents" (rows).
 * API Base: https://api.domo.com/api/datastores/v1/collections
 * 
 * Your Access Token: DDCIbb6e7f4505d61a96500fb139986080b2e5a4bde2f277aece
 * Set it in .env as: DOMO_ACCESS_TOKEN=DDCIbb6e7f4505d61a96500fb139986080b2e5a4bde2f277aece
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://api.domo.com/api/datastores/v1/collections';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Each collection maps to a Domo datastore name.
const DATASTORE_IDS = {
  users:      process.env.DOMO_DS_USERS      || '',
  accounts:   process.env.DOMO_DS_ACCOUNTS   || '',
  activities: process.env.DOMO_DS_ACTIVITIES || '',
  alerts:     process.env.DOMO_DS_ALERTS     || '',
  customers:  process.env.DOMO_DS_CUSTOMERS  || '',
  deals:      process.env.DOMO_DS_DEALS      || '',
  products:   process.env.DOMO_DS_PRODUCTS   || '',
  sales:      process.env.DOMO_DS_SALES      || '',
};

function getHeaders() {
  const token = process.env.DOMO_ACCESS_TOKEN;
  if (token && token.startsWith('DDCI')) {
    return {
      'X-DOMO-Developer-Token': token,
      'Content-Type': 'application/json',
    };
  }
  return {
    Authorization: `bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ─── Local File Fallback Helpers ──────────────────────────────────────────────

function getLocalFile(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readLocal(collection) {
  const file = getLocalFile(collection);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeLocal(collection, data) {
  const file = getLocalFile(collection);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Core CRUD ────────────────────────────────────────────────────────────────

/**
 * List all documents in a datastore.
 */
async function findAll(collection, filter = null) {
  try {
    const dsId = _dsId(collection);
    const url = `https://api.domo.com/api/datastores/v2/collections/${dsId}/documents/query`;
    const body = filter ? { filters: [filter] } : {};
    const res = await axios.post(url, body, { headers: getHeaders() });
    return res.data.documents || [];
  } catch (err) {
    console.warn(`[Domo AppDB] Failed to query ${collection} from Domo API (${err.message}). Using local JSON fallback.`);
    return readLocal(collection);
  }
}

/**
 * Find a single document by its Domo document ID.
 */
async function findById(collection, id) {
  try {
    const dsId = _dsId(collection);
    const url = `${BASE_URL}/${dsId}/documents/${id}`;
    const res = await axios.get(url, { headers: getHeaders() });
    return res.data;
  } catch (err) {
    console.warn(`[Domo AppDB] Failed to find document ${id} from Domo API (${err.message}). Using local JSON fallback.`);
    const localDocs = readLocal(collection);
    const found = localDocs.find(d => d.id === id);
    if (!found) {
      throw new Error(`Document with ID ${id} not found`);
    }
    return found;
  }
}

/**
 * Find documents matching a field=value condition.
 */
async function findWhere(collection, field, operator, value) {
  return findAll(collection, { field, operator, value: String(value) });
}

/**
 * Create a new document.
 */
async function create(collection, data) {
  const newId = generateId();
  const docContent = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  try {
    const dsId = _dsId(collection);
    const url = `${BASE_URL}/${dsId}/documents`;
    const res = await axios.post(url, { content: docContent }, { headers: getHeaders() });
    
    // Sync local file
    const localDocs = readLocal(collection);
    localDocs.push({ id: res.data.id, content: docContent });
    writeLocal(collection, localDocs);
    
    return { ...data, id: res.data.id, _id: res.data.id };
  } catch (err) {
    console.warn(`[Domo AppDB] Failed to create document in Domo API (${err.message}). Using local JSON fallback.`);
    const localDocs = readLocal(collection);
    localDocs.push({ id: newId, content: docContent });
    writeLocal(collection, localDocs);
    return { ...data, id: newId, _id: newId };
  }
}

/**
 * Update a document by ID.
 */
async function updateById(collection, id, updates) {
  try {
    const dsId = _dsId(collection);
    const existing = await findById(collection, id);
    const merged = { ...existing.content, ...updates, updatedAt: new Date().toISOString() };
    const url = `${BASE_URL}/${dsId}/documents/${id}`;
    await axios.put(url, { content: merged }, { headers: getHeaders() });
    
    // Sync local
    const localDocs = readLocal(collection);
    const idx = localDocs.findIndex(d => d.id === id);
    if (idx !== -1) {
      localDocs[idx].content = merged;
      writeLocal(collection, localDocs);
    }
    return { ...merged, id, _id: id };
  } catch (err) {
    console.warn(`[Domo AppDB] Failed to update document ${id} in Domo API (${err.message}). Using local JSON fallback.`);
    const localDocs = readLocal(collection);
    const idx = localDocs.findIndex(d => d.id === id);
    if (idx === -1) {
      throw new Error(`Document with ID ${id} not found in local store`);
    }
    const merged = { ...localDocs[idx].content, ...updates, updatedAt: new Date().toISOString() };
    localDocs[idx].content = merged;
    writeLocal(collection, localDocs);
    return { ...merged, id, _id: id };
  }
}

/**
 * Delete a document by ID.
 */
async function deleteById(collection, id) {
  try {
    const dsId = _dsId(collection);
    const url = `${BASE_URL}/${dsId}/documents/${id}`;
    await axios.delete(url, { headers: getHeaders() });
    
    // Sync local
    const localDocs = readLocal(collection);
    const filtered = localDocs.filter(d => d.id !== id);
    writeLocal(collection, filtered);
    return { id, deleted: true };
  } catch (err) {
    console.warn(`[Domo AppDB] Failed to delete document ${id} in Domo API (${err.message}). Using local JSON fallback.`);
    const localDocs = readLocal(collection);
    const filtered = localDocs.filter(d => d.id !== id);
    writeLocal(collection, filtered);
    return { id, deleted: true };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _dsId(collection) {
  const id = DATASTORE_IDS[collection];
  if (!id) throw new Error(
    `Domo datastore ID not configured for collection "${collection}". ` +
    `Check your backend/.env file.`
  );
  return id;
}

function generateId() {
  return require('crypto').randomUUID();
}

module.exports = {
  findAll,
  findById,
  findWhere,
  create,
  updateById,
  deleteById,
  generateId,
  DATASTORE_IDS,
};