const EventEmitter = require('events');
const noble = require('noble');
const DeviceData = require('./lib/device-data');

const DEFAULT_DEVICE_NAME = 'Flower care';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

const SERVICE_UUIDS = [DATA_SERVICE_UUID];
const CHARACTERISTIC_UUIDS = [DATA_CHARACTERISTIC_UUID, FIRMWARE_CHARACTERISTIC_UUID, REALTIME_CHARACTERISTIC_UUID];

class MiFlora extends EventEmitter {
    constructor(macAddress) {
        super();
        this.noble = noble;
        this._macAddress = macAddress;
        noble.on('discover', (peripheral) => {
//            console.log('noble:onDiscover');
            
            if (this._macAddress !== undefined) {
                if (this._macAddress.toLowerCase() === peripheral.address.toLowerCase()) {
                    console.log('connect to macAdress :' + this._macAddress);
                    // start listening the specific device
                    this.connectDevice(peripheral, this);
                }
            } else if (peripheral.advertisement.localName === DEFAULT_DEVICE_NAME) {
                console.log('connect to ' + DEFAULT_DEVICE_NAME);
                // start listening found device
                this.connectDevice(peripheral, this);
            }
        });
        
        noble.on('scanStart', () => {
            console.log('noble:onScanStart');
        });
        noble.on('scanStop', () => {
            console.log('noble:onScanStop');
            this.startScanning();
        });
        
        noble.on('warning', (message) => {
            console.log('noble:onWarning:' + message);
        });        
    }

    connectDevice(peripheral, context) {
        // prevent simultanious connection to the same device
        console.log('connect to device : ' + peripheral);
        if (peripheral.state === 'disconnected') {
            peripheral.connect();
            
            peripheral.once('connect', () => {
                peripheral.discoverSomeServicesAndCharacteristics(SERVICE_UUIDS, CHARACTERISTIC_UUIDS, function (error, services, characteristics) {
                    console.log('discover some service - services : ' + services);
                    console.log('discover some service - error    :' + error);
                    characteristics.forEach((characteristic) => {
                        switch (characteristic.uuid) {
                            case DATA_CHARACTERISTIC_UUID:
                                characteristic.read((error, data) => {
                                    if (error) console.log('data characteristics - error :' + error);
                                    
                                    let temperature = data.readUInt16LE(0) / 10;
                                    let lux = data.readUInt32LE(3);
                                    let moisture = data.readUInt16BE(6);
                                    let fertility = data.readUInt16LE(8);
                                    let deviceData = new DeviceData(peripheral.id,
                                            temperature,
                                            lux,
                                            moisture,
                                            fertility);
                                    console.table(deviceData);
                                    context.emit('data', deviceData);
                                });
                                break;
                            case FIRMWARE_CHARACTERISTIC_UUID:
                                characteristic.read((error, data) => {
                                    if (error) console.log('firmware characteristics - error :' + error);
                                    
                                    const firmware = {
                                        deviceId: peripheral.id,
                                        batteryLevel: parseInt(data.toString('hex', 0, 1), 16),
                                        firmwareVersion: data.toString('ascii', 2, data.length)
                                    };
                                    console.table(firmware);
                                    context.emit('firmware', firmware);
                                });
                                break;
                            case REALTIME_CHARACTERISTIC_UUID:
                                characteristic.write(REALTIME_META_VALUE, false);
                                break;
                        }
                    });
                });
            });
        }
    }


    startScanning() {
        if (noble.state === 'poweredOn') {
            console.log('Lets start scanning.');
            noble.startScanning([], true, (e) => {
                console.table(e);
            });
        } else {
            // bind event to start scanning
            console.log('Wait for stateChange.');
            noble.on('stateChange', (state) => {
                console.log('noble state : ' + state);
                if (state === 'poweredOn') {
                    console.log('Ready set! start scanning!...');
                    noble.startScanning([], true, (e) => {
                        console.table(e);
                    });
                }
            });
        }
    }

    stopScanning() {
        console.log("stopScanning...");
        noble.stopScanning();
    }
}

module.exports = MiFlora;