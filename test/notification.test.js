const axios = require('axios');
const { SENDER_ID, SERVER_KEY } = require('./keys');
const { register, listen } = require('../src/index');

const TIMEOUT = 500000;

const NOTIFICATIONS = {
  SIMPLE : { title : 'Hello world ', body : 'Test' },
  LARGE  : { title : 'Hello world ', body : require('./4kb') },
};

let credentials;
let client;
describe('Parser', function () {
  beforeEach(async function () {
    credentials = await register(SENDER_ID);
  });

  afterEach(async function () {
    if (client) {
      client.destroy();
    }
    credentials = null;
  });

  it(
    'should receive a simple notification',
    async function () {
      await send(NOTIFICATIONS.SIMPLE);
      const notifications = await receive(1);
      expect(notifications.length).toEqual(1);
      expect(notifications[0].notification.notification).toEqual(
        NOTIFICATIONS.SIMPLE
      );
    },
    TIMEOUT
  );

  it(
    'should receive a large notification',
    async function () {
      await send(NOTIFICATIONS.LARGE);
      const notifications = await receive(1);
      expect(notifications.length).toEqual(1);
      expect(notifications[0].notification.notification).toEqual(
        NOTIFICATIONS.LARGE
      );
    },
    TIMEOUT
  );

  it(
    'should receive multiple notifications',
    async function () {
      await send(NOTIFICATIONS.SIMPLE);
      await send(NOTIFICATIONS.LARGE);
      await send(NOTIFICATIONS.SIMPLE);

      const notifications = await receive(3);
      expect(notifications.length).toEqual(3);
      expect(notifications[0].notification.notification).toEqual(
        NOTIFICATIONS.SIMPLE
      );
      expect(notifications[1].notification.notification).toEqual(
        NOTIFICATIONS.LARGE
      );
      expect(notifications[2].notification.notification).toEqual(
        NOTIFICATIONS.SIMPLE
      );
    },
    TIMEOUT
  );
});

async function send(notification) {
  const response = await axios({
    method : 'POST',
    url    : 'https://fcm.googleapis.com/fcm/send',
    data   : {
      to           : credentials.fcm.token,
      notification : notification,
    },
    headers : { Authorization : `key=${SERVER_KEY}` },
  });
  try {
    expect(response.data).not.toBeUndefined();
  } catch (e) {
    throw new Error(
      `sending of notification failed: ${JSON.stringify(response)}`
    );
  }
  return response.data;
}

async function receive(n) {
  const received = [];
  return new Promise((resolve) => {
    const onNotification = (notification) => {
      received.push(notification);
      if (received.length === n) {
        resolve(received);
      }
    };
    credentials.persistentIds = [];
    listen(credentials, onNotification).then((result) => (client = result));
  });
}
