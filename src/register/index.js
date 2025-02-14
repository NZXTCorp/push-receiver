const { v4: uuidv4 } = require('uuid');
const { register: registerGCM } = require('../gcm');
const registerFCM = require('../fcm');

module.exports = register;

async function register(senderId) {
  // Should be unique by app - One GCM registration/token by app/appId
  try {
    const appId = `wp:receiver.push.com#${uuidv4()}`;
    const subscription = await registerGCM(appId);
    const result = await registerFCM({
      token : subscription.token,
      senderId,
      appId,
    });
    // Need to be saved by the client
    return Object.assign({}, result, { gcm : subscription });
  } catch {
    return null;
  }
}
