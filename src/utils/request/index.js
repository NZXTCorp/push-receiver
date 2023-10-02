const axios = require('axios');
const { waitFor } = require('../timeout');

// In seconds
const MAX_RETRY_TIMEOUT = 15;
// Step in seconds
const RETRY_STEP = 5;

module.exports = requestWithRetry;

function requestWithRetry(...args) {
  return retry(0, ...args);
}

async function retry(retryCount = 0, ...args) {
  try {
      return await axios(...args)
  } catch (e) {
      const timeout = Math.min(retryCount * RETRY_STEP, MAX_RETRY_TIMEOUT);
      console.error(`Request failed : ${e.message}`);
      console.error(`Retrying in ${timeout} seconds`);
      await waitFor(timeout * 1000);
      return await retry(retryCount + 1, ...args);
  }
}