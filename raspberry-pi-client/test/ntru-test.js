const ntru = require('../src/modules/ntru');

const { expect } = require('../src/common/test-utils');

const seed = 'AYYUXKIAEOGGXPZIM9GGDLERZEBKVNEOGR9SPSF9ANHWSISVHKEQNTADSZFSMYFKGVVRAYFNTXEPWRLJK';

describe('NTRU', () => {
  describe('ntru.toBytes', () =>
    it('should encode string to UTF 8 byte array', () => {
      const bytes = ntru.toBytes('hello');

      expect(bytes).to.deep.equal(new Uint8Array([104, 101, 108, 108, 111]));
    }));

  describe('ntru.createAsymmetricKeyPair', () =>
    it('should create an asymmetric key pair based on seed, deterministically', async () => {
      const keyPair1 = await ntru.createAsymmetricKeyPair(seed);
      const keyPair2 = await ntru.createAsymmetricKeyPair(seed);

      expect(keyPair1.public).to.have.lengthOf(1027);
      expect(keyPair1.private).to.have.lengthOf(1120);
      expect(keyPair1).to.deep.equal(keyPair2);
    }));

  describe('ntru.base64 and back', () =>
    it('convert base 64 and back', async () => {
      const keyPair = await ntru.createAsymmetricKeyPair(seed);

      const b64 = keyPair.public.toString('base64');
      const converted = Buffer.from(b64, 'base64');

      expect(converted).to.deep.equal(keyPair.public);
    }));

  describe('ntru.toTrytes', () =>
    it('should be able to convert keyPair to tryte representation', async () => {
      const keyPair = await ntru.createAsymmetricKeyPair(seed);
      const publicKeyTrytes = ntru.toTrytes(keyPair.public);

      expect(publicKeyTrytes).to.have.lengthOf(2744);
    }));

  describe('ntru.fromTrytes', () =>
    it('should be able to convert tryte representaton of keyPair to keyPair object', async () => {
      const keyPair = await ntru.createAsymmetricKeyPair(seed);
      const publicKeyTrytes = ntru.toTrytes(keyPair.public);
      const publicKeyConverted = ntru.fromTrytes(publicKeyTrytes);

      expect(publicKeyConverted).to.deep.equal(keyPair.public);
    }));
});