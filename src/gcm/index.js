const path = require('path');
const request = require('../utils/request');
const protobuf = require('protobufjs');
const Long = require('long');
const { waitFor } = require('../utils/timeout');
const fcmKey = require('../fcm/server-key');
const { toBase64 } = require('../utils/base64');

// Hack to fix PHONE_REGISTRATION_ERROR #17 when bundled with webpack
// https://github.com/dcodeIO/protobuf.js#browserify-integration
protobuf.util.Long = Long;
protobuf.configure();

const serverKey = toBase64(Buffer.from(fcmKey));

const REGISTER_URL = 'https://android.clients.google.com/c2dm/register3';
const CHECKIN_URL = 'https://android.clients.google.com/checkin';

let root;
let AndroidCheckinResponse;

module.exports = {
  register,
  checkIn,
};

async function register(appId) {
  try {
    const options = await checkIn();
    if (options) {
      const credentials = await doRegister(options, appId);
      if (credentials) {
        return credentials;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function checkIn(androidId, securityToken) {
  try {
    
  await loadProtoFile();
  const buffer = getCheckinRequest(androidId, securityToken);
  const body = await request({
    url     : CHECKIN_URL,
    method  : 'POST',
    headers : {
      'Content-Type' : 'application/x-protobuf',
    },
    data         : buffer,
    encoding     : null,
    responseType : 'arraybuffer',
  });
  if (body?.data) {
    const message = AndroidCheckinResponse.decode(body.data);
    const object = AndroidCheckinResponse.toObject(message, {
      longs : String,
      enums : String,
      bytes : String,
    });
    return object;
  }
  return null;
  } catch (err) {
    console.warn(err);
    return null;
  }
}

async function doRegister({ androidId, securityToken }, appId) {
  const body = {
    app         : 'org.chromium.linux',
    'X-subtype' : appId,
    device      : androidId,
    sender      : serverKey,
  };
  const response = await postRegister({ androidId, securityToken, body });
  const token = response.split('=')[1];
  return {
    token,
    androidId,
    securityToken,
    appId,
  };
}

async function postRegister({ androidId, securityToken, body, retry = 0 }) {
  try {
    const requestBody = new URLSearchParams(body);
    const response = await request({
      url     : REGISTER_URL,
      method  : 'POST',
      headers : {
        Authorization    : `AidLogin ${androidId}:${securityToken}`,
        'Content-Length' : requestBody.toString().length,
        'Content-Type'   : 'application/x-www-form-urlencoded',
      },
      data : requestBody,
    });

    if (/^Error/.test(response.data) || response.status !== 200) {
      console.warn(`Register request has failed with ${response.data}`);
      if (retry >= 5) {
        throw new Error('GCM register has failed');
      }
      console.warn(`Retry... ${retry + 1}`);
      await waitFor(1000);
      return postRegister({ androidId, securityToken, body, retry : retry + 1 });
    }
    
    return response.data;
  } catch (err) {
    console.warn(err);
    return null;
  }
}

async function loadProtoFile() {
  if (root) {
    return;
  }
  root = await protobuf.load(path.join(__dirname, 'checkin.proto'));
  return root;
}

function getCheckinRequest(androidId, securityToken) {
  const AndroidCheckinRequest = root.lookupType(
    'checkin_proto.AndroidCheckinRequest'
  );
  AndroidCheckinResponse = root.lookupType(
    'checkin_proto.AndroidCheckinResponse'
  );
  const payload = {
    userSerialNumber : 0,
    checkin          : {
      type        : 3,
      chromeBuild : {
        platform      : 2,
        chromeVersion : '63.0.3234.0',
        channel       : 1,
      },
    },
    version       : 3,
    id            : androidId ? Long.fromString(androidId) : undefined,
    securityToken : securityToken
      ? Long.fromString(securityToken, true)
      : undefined,
  };
  const errMsg = AndroidCheckinRequest.verify(payload);
  if (errMsg) throw Error(errMsg);
  const message = AndroidCheckinRequest.create(payload);
  return AndroidCheckinRequest.encode(message).finish();
}
