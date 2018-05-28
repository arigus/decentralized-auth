# Known issues

This document describes known issues with the decentralized-auth software.

## State of app
Only the happy flow works at the moment. Edge cases and error handling still need to be implemented.

## DDOS attacks
Addresses are public. So service providers and Raspberry Pi Energy Data Readers can easily be DDOSed.

## IOTA timestamps cannot be trusted
Since timestamps are not verifiable a dishonest node can fake them. The getLastMessage implementation tries to retrieve the last message. In theory a device can for example be spammed with messages in the past. A device cannot be claimed by an attacker because he or she has to intercept the SIGNED_CHALLENGE and replay it quicker than the original message arrives.

## IOTA seed can only be used once on every run of raspberry-pi-client
Since:

1. The MAM stream is opened on an address generated from the seed
1. Only ONE message can be published to a MAM root (otherwise fetching throws an error, see this [MAM.fetch exception issue of mam.client.js](https://github.com/iotaledger/mam.client.js/issues/5))
1. The applications start publishing data to their MAM root

Every time the raspberry-pi-client is run a new seed needs to be used otherwise fetching will fail.

This can be solved by keeping track of the last used MAM root. That in combination with a process manager that restarts it on failure would make the client more robust.

## Service provider and device can see all events of owner
The MAM root of the private MAM channel is communicated to the service provider. This is so that the service provider can proof that consent was given to access the stream. Because all events of the device owner are published on this MAM stream the service provider and device client can also view authorizations and added or removed devices that are not related to them. Also after the device is removed or the consent is revoked.

To solve this privacy issue separate MAM streams need to be setup per device and service provider.