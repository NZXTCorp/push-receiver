const { register } = require('../../src');
const senderId = require('yargs').argv.senderId;

if (!senderId) {
  console.error('Missing senderId');
  return;
}

(async () => {
  try {
    const result = await register(senderId);
    console.log('Successfully registered', result);
  } catch (e) {
    console.error('Error during registration');
    console.error(e);
  }
})();
