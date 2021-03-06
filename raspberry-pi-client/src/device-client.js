/**
 * Software that runs on a device that is connected via P1 to a Dutch smart meter.
 * Provides the capabilities to:
 *
 * - Pair with someone and start listening to their MAM channel with events.
 *   Then handles all events that are published on this channel.
 * - Publish P1 data to an MAM channel.
 * - Send the MAM root and side key to an authorized service provider.
 * - Revoke the access for a service provider to an MAM channel.
 *
 * @module device-client
 */


const logger = require('./logger')(module);
const config = require('./config');

const iota = require('./modules/iota');
const MamClient = require('@decentralized-auth/iota-mam');
const ntru = require('@decentralized-auth/ntru');

const p1Reader = require('./device-client/p1');

const SignedChallenges = require('./device-client/signed-challenges');
const ServiceProviders = require('./device-client/service-providers');
const signing = require('./modules/iota/kerl/signing');

// IOTA message types
const SEND_CHALLENGE_TYPE = 'CHALLENGE';
const CLAIM_RESULT_TYPE = 'CLAIM_RESULT';
const CLAIM_DEVICE_TYPE = 'CLAIM_DEVICE';
const ANSWER_CHALLENGE_TYPE = 'ANSWER_CHALLENGE';
const MAM_DATA_TYPE = 'MAM_DATA';

// MAM message types
const AUTHORIZED_TYPE = 'AUTHORIZED';
const AUTHORIZATION_REVOKED_TYPE = 'AUTHORIZATION_REVOKED';
const DEVICE_ADDED_TYPE = 'DEVICE_ADDED';
const DEVICE_DELETED_TYPE = 'DEVICE_DELETED';
const DATA_MESSAGE_TYPE = 'DATA';
const KEY_ROTATION_TYPE = 'KEY_ROTATION';


module.exports = class DeviceClient { // eslint-disable-line padded-blocks


  /**
   * Constructor for a DeviceClient.
   * @constructor DeviceClient
   * @param {string} seed IOTA seed of the device client
   * @param {string} sharedSecret Secret with which the device can be paired
   * @param {string} initialSideKey Initial side key to use in MAM 'restricted'
   *                                (for publishing messages of type "DATA")
   * @param {string} checkMessageIntervalMs Interval in milliseconds in which to
   *                                        check for new IOTA and MAM messages
   */
  constructor(seed, sharedSecret, initialSideKey, checkMessageIntervalMs) {
    this.seed = seed;
    this.secret = sharedSecret; // Shared secret on Pi

    this.signedChallenges = new SignedChallenges();
    this.authorizedServiceProviders = new ServiceProviders();
    this.seenMessages = new Set(); // To avoid processing same message (below)
    this.mam = new MamClient(seed, iota, 'restricted', initialSideKey);
    this.init(checkMessageIntervalMs);
  }


  /**
   * Creates a challenge (a salt to be signed with the secret) that can be
   * signed via {@link signing.sign} with a secret of length {@link secretLength}.
   *
   * @function createChallenge
   * @param {int} secretLength Length of the secret
   * @returns {string} The challenge
   */
  static createChallenge(secretLength) {
    const trytes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
    const HASH_LENGTH = 243; // kerl

    const challenge = new Array(HASH_LENGTH - secretLength)
      .fill()
      .map(() => trytes.charAt(Math.floor(trytes.length * Math.random())))
      .join('');

    return challenge;
  }


  /**
   * Creates a random tryte string of 10 characters.
   *
   * @function createSideKey
   * @returns {string} The side key
   */
  static createSideKey() {
    const trytes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
    const SIDE_KEY_LENGTH = 10;
    const sideKey = new Array(SIDE_KEY_LENGTH)
      .fill()
      .map(() => trytes.charAt(Math.floor(trytes.length * Math.random())))
      .join('');

    return sideKey;
  }


  /**
   * Returns a challenge to the sender.
   *
   * @function sendChallenge
   * @param {string} seed Our IOTA seed
   * @param {string} sender Our IOTA address
   * @param {string} receiver IOTA address of receiver of the challenge
   * @param {string} challenge Challenge to be returned signed with key on the box
   * @returns {Promise}
   */
  sendChallenge(seed, sender, receiver) {
    const challenge = DeviceClient.createChallenge(this.secret.length);
    const message = { type: SEND_CHALLENGE_TYPE, sender, challenge };

    // Also store the challenge
    const signedChallenge = signing.sign(challenge, this.secret);
    this.signedChallenges.add(signedChallenge);

    return iota.send(seed, receiver, message);
  }


  /**
   * Sends claim result to receiver. If signed challenge is valid, starts
   * listening to the root.
   *
   * @function processChallenge
   * @param {string} seed Our IOTA seed
   * @param {string} sender Our IOTA address
   * @param {string} receiver IOTA address of receiver of successful claim
   * @param {string} root MAM Root of the sender we will start listening to
   * @param {string} signedChallenge Signed challenge send by sender
   * @returns {null}
   */
  processChallenge(seed, sender, receiver, root, signedChallenge) {
    let message;
    if (this.signedChallenges.isValid(signedChallenge)) {
      logger.info(`Setting MAM root to ${root}`);
      this.root = root;
      message = { type: CLAIM_RESULT_TYPE, status: 'OK', sender };
    } else {
      message = { type: CLAIM_RESULT_TYPE, status: 'NOK', reason: 'Signed challenge invalid' };
    }

    // Only use signed challenge once to prevent replay attacks
    this.signedChallenges.remove(signedChallenge);

    return iota.send(seed, receiver, message);
  }


  /**
   * Send encrypted MAM data to a service provider.
   *
   * @function sendMamData
   * @param {string} seed IOTA seed of sender
   * @param {string} address IOTA address of the service provider
   * @param {string} publicKey Public key of the service provider in trytes
   * @returns {Promise} containing IOTA transactions
   */
  async sendMamData(seed, address, publicKey) {
    const { channel: { side_key, next_root } } = this.mam.getMamState();
    const mamData = {
      root: ntru.encrypt(next_root, publicKey),
      sideKey: ntru.encrypt(side_key, publicKey),
    };

    logger.info(`Provide service provider ${address} with encrypted MAM data`);

    const message = { type: MAM_DATA_TYPE, root: this.root, mamData };
    return iota.send(seed, address, message);
  }


  /**
   * Create a key rotation message.
   * Message has structure:
   * ```
   * {
   *   type: 'KEY_ROTATION,
   *   authorizedSp1: 'Side key encrypted with authorizedSp1's key',
   *   authorizedSp2: 'Side key encrypted with authorizedSp2's key'
   * }
   * ```
   * @function makeKeyRotationMessage
   * @param {string} serviceProviders List of remaining authorized
   *                                  service providers
   * @param {string} sideKey Our new side key we are using
   * @returns {null}
   */
  static createKeyRotationMessage(serviceProviders, sideKey) {
    const keysForServiceProviders = serviceProviders.map(sp => ({
      key: sp.iotaAddress,
      val: ntru.encrypt(sideKey, sp.publicKeyTrytes),
    })).reduce((map, obj) => {
      map[obj.key] = obj.val; // eslint-disable-line no-param-reassign
      return map;
    }, {});

    const message = {
      type: KEY_ROTATION_TYPE,
      ...keysForServiceProviders,
    };

    return message;
  }


  /**
   * Informs {@link authorizedServiceProviders} of the new side key. The 'key
   * rotation' message is transferred via MAM, and the new side key is encrypted
   * with the public key of the remaining authorized service providers (if any).
   *
   * @function informUpdateSideKey
   * @param {string} authorizedServiceProviders List of remaining authorized
   *                                            service providers
   * @param {string} newSideKey Our new side key we are using
   * @returns {null}
   */
  informUpdateSideKey(authorizedServiceProviders, newSideKey) {
    const message = DeviceClient.createKeyRotationMessage(
      authorizedServiceProviders,
      newSideKey,
    );
    return this.mam.attach(message);
  }


  /**
   * Message handler for the P1 port.
   *
   * @function handleP1Message
   * @param {string} P1 telegram
   * @returns {undefined}
   */
  handleP1Message(telegram) {
    const message = {
      type: DATA_MESSAGE_TYPE,
      raw: telegram,
      timestamp: Date.now(),
    };

    // 5.0 sends one message every 10 seconds, newer versions one every second
    if (config.smartMeterVersion === 5.0) {
      // Only handle 1 in 10 messages for now, because otherwise the node crashes
      if (Math.floor(Math.random() * 10) === 0) {
        this.mam.attach(message);
      }
    }
    this.mam.attach(message);
  }


  /**
   * Retrieves one message from this device's address and dispatches it to the
   * appropriate message handler.
   *
   * @function processIotaMessage
   * @param {string} address The address to fetch the message from
   * @returns {Promise} with transactions or null
   */
  async processIotaMessage(address) {
    logger.info(`Getting last message from address ${address} ...`);

    try {
      const msg = await iota.getLastMessage({ addresses: [address] });
      if (!msg) {
        logger.info('No messages');
        return null;
      }

      // To avoid processing the same last message over and over we keep track
      // of already processed messages (note: stringified versions so set
      // operations that use equals (like set.has()) work as intended)
      if (this.seenMessages.has(JSON.stringify(msg))) {
        logger.info('No new IOTA messages');
        return null;
      }
      this.seenMessages.add(JSON.stringify(msg));

      logger.info(`Received new IOTA message of type ${msg.type}`);
      switch (msg.type) {
        case CLAIM_DEVICE_TYPE: {
          return this.sendChallenge(
            this.seed,
            address,
            msg.sender,
          );
        }
        case ANSWER_CHALLENGE_TYPE: {
          return this.processChallenge(
            this.seed,
            address,
            msg.sender,
            msg.root,
            msg.signedChallenge,
          );
        }
        default: {
          throw new Error(`Unknown IOTA message type: ${msg.type}`);
        }
      }
    } catch (err) {
      // NOTE: Winston logger seems to swallow JavaScript errors
      // console.log(err.message);
      logger.error(err.message);
      return null;
    }
  }


  static formatTrytes(trytes) { return `${trytes.slice(0, 10)}...`; }


  /**
   * Process MAM message for added authorization.
   * @param message {Object} MAM message of type {@link AUTHORIZED_TYPE}.
   * @returns {undefined}
   */
  processAuthorizedMessage(message) {
    const { serviceProvider } = message.policy;
    logger.info(`Authorizing service provider ${JSON.stringify(serviceProvider)}`);
    this.authorizedServiceProviders.add(serviceProvider);
    this.sendMamData(this.seed, serviceProvider.iotaAddress, serviceProvider.publicKeyTrytes);
  }


  /**
   * Process MAM message revoked: authorization
   * @param message {Object} MAM message of type {@link AUTHORIZATION_REVOKED_TYPE}.
   * @returns {undefined}
   */
  async processAuthorizationRevokedMessage(message) {
    const newSideKey = DeviceClient.createSideKey();
    this.authorizedServiceProviders.remove(message.policy.serviceProvider);
    try {
      this.informUpdateSideKey(this.authorizedServiceProviders.getAll(), newSideKey);
      this.mam.changeSideKey(newSideKey);
    } catch (err) {
      logger.error(`processAuthorizationRevokedMessage failed: ${err}`);
    }
  }


  /**
   * Retrieves and processes MAM messages by dispatching the type of message to
   * its handler.
   *
   * @function processMamMessage
   * @returns {undefined}
   */
  async processMamMessage() {
    const IS_PAIRED = (typeof this.root !== 'undefined');
    if (!IS_PAIRED) {
      logger.info('IOTA MAM: No root received (device not paired)');
      return;
    }
    logger.info(`IOTA MAM: Fetching from root ${DeviceClient.formatTrytes(this.root)}`);
    try {
      const mode = 'private';
      const mamMsg = await this.mam.fetchSingle(this.root, mode);
      if (typeof mamMsg === 'undefined') {
        // no message, you can try again later, keep root
        logger.info('No new MAM message');
        return;
      }
      const { nextRoot, message } = mamMsg;
      switch (message.type) {
        case AUTHORIZED_TYPE: {
          this.processAuthorizedMessage(message);
          break;
        }
        case AUTHORIZATION_REVOKED_TYPE: {
          this.processAuthorizationRevokedMessage(message);
          break;
        }
        case DEVICE_ADDED_TYPE: {
          this.authorizedServiceProviders.clear();
          break;
        }
        case DEVICE_DELETED_TYPE: {
          this.authorizedServiceProviders.clear();
          break;
        }
        default: {
          logger.info(`Unknown MAM msg type: ${message.type}`);
        }
      }
      logger.info(`IOTA MAM: Setting root to ${DeviceClient.formatTrytes(nextRoot)}`);
      this.root = nextRoot;
    } catch (err) {
      logger.error(`In processMamMessage: ${err}`);
    }
  }


  /**
   * Start the DeviceClient (check for messages and process them).
   *
   * @function start
   * @param {int} intervalMs Interval in milliseconds in which to check for
   *                         messages.
   */
  async init(intervalMs) {
    const [address] = await iota.getAddress(this.seed, 1);
    logger.info(`Starting device client on address ${address}`);

    p1Reader.tryInitP1(telegram => this.handleP1Message(telegram));

    setInterval(() => this.processIotaMessage(address), intervalMs);
    setInterval(() => this.processMamMessage(), intervalMs);
  }
};
