# Raspberry Pi Client

Demo for GDPR proof IOTA MAM for the Raspberry Pi. This client reads P1 data and sends it via IOTA MAM to authorized service providers.

## Requirements

## Features

This client in demonstrates:
- How a device can be paired with your 'digital house' called my home via IOTA
- How the Pi can send P1 data via IOTA MAM
- How service providers can be authorized to access data
- How access can be revoked

For more information on the role of the raspberry-pi-client see [architecture](../docs/architecture) and the [scenarios](../docs/scenarios).

## Installation

```
yarn
```

## Tests

```
yarn run test
```

Note that some tests take a long time because they attach messages to the Tangle.

## Production

Requirements:
- Raspberry Pi with:
  - OS (code is tested with Raspbian Stretch Lite)
  - Internet connection
- P1 cable (RJ11 to USB) in smart meter and USB port of Raspberry Pi

Clone the raspberry-pi-client on your Pi:

```
ssh pi@<pi's IP>
git init
git remote add origin git@github.com:Alliander/decentralized-auth.git
git fetch
git checkout origin/master -- raspberry-pi-client
```

Install dependencies on Pi:

Install Node dependencies:

```
cd raspberry-pi-client
yarn i
```

Install NTRU quantum proof asymmetric encryption lib:
```
sudo apt-get install autoconf libtool # needed for ntrujs
git clone https://github.com/NTRUOpenSourceProject/NTRUEncrypt
cd NTRUEncrypt
./autogen.sh
./configure
sudo make install
cp /usr/local/lib/libntruencrypt* ~/raspberry-pi-client/node_modules/ntrujs/lib/
cp /usr/local/lib/libntruencrypt* ~/raspberry-pi-client/node_modules/ntrujs/lib/lib/
cd ~/raspberry-pi-client/node_modules/ntrujs/build
make
cp Release/addon.node ../lib/addon-linux-arm.node
cd ~/raspberry-pi-client
```

Set environment variables:

```
export IOTA_PROVIDER=xxxx
export IOTA_MIN_WEIGHT_MAGNITUDE=10
export SMART_METER_VERSION=2.2
```

Test installation with:

```
yarn run test
```

Running for real:

Generate a seed with `cat /dev/urandom | LC_ALL=C tr -dc 'A-Z9' | fold -w 81 | head -n 1` and add it into the SEED environment variable:

```
export SEED=<seed>
```

Start the client with `npm start`.

Or run with new SEED without exporting it:

```
SEED=$(cat /dev/urandom | LC_ALL=C tr -dc 'A-Z9' | fold -w 81 | head -n 1) npm start
```

## Running the application locally

- Checkout the code
- `yarn`
- `yarn start`

Run with specific seed:

- `SEED=HWMLSSBKJOTBKVQTJE9OWPPMPZJTDUDIHMMUFIBQJCDJDPRNLAAG99J9UXZIKSQJDTUWFPSXJIZEJMTXV npm start`

Run with random seed:

- `SEED=$(cat /dev/urandom | LC_ALL=C tr -dc 'A-Z9' | fold -w 81 | head -n 1) npm start`
