const noble = require('@abandonware/noble');
const Yeelight = require('yeelight2');

const LE_SERVICES = ["fff0"];
const LE_CHARACTERISTICS = ["fff1"];
const LE_CLICK = 198;
const LE_DOUBLE_CLICK = 199;
const LE_DOUBLE_CLICK_DELAY = 300;
const LE_CONNECTED_CHECK_INTERVAL = 5000;
const LE_NAME_FILTERS = ["TrackerPA"];
const YEELIGHT_PORT = 55443;
const IP_FIRST_LAMP = "192.168.1.143";
const IP_SECOND_LAMP = "192.168.1.144";
const EFFECT_SUDDEN = "sudden";
const EFFECT_SUDDEN_DELAY = 0;
const YEELIGHT_POWER_ON_STATE = "on";
const YEELIGHT_POWER_OFF_STATE = "off";
const SOFT_TEMP = 3500;

var currentScene = 0;
var sceneApplicationPending = false;
var connectedPeripherals = new Set();

noble.on('discover', function (peripheral) {
    if (peripheral.advertisement.localName && LE_NAME_FILTERS.includes(peripheral.advertisement.localName.trim())) {
        console.log('Peripheral discovered (ID: %s, Name: %s, Address: %s [%s], Connectable: %s, RSSI: %s)',
            peripheral.id, peripheral.advertisement.localName, peripheral.address, peripheral.addressType, peripheral.connectable, peripheral.rssi);
        if (peripheral.connectable) {
            connectToPeripheral(peripheral);
        }
    }
});

function connectToPeripheral(peripheral) {
    peripheral.connect(function (error) {
        console.log('Connected to peripheral: ' + peripheral.id);
        connectedPeripherals.add(peripheral);
        peripheral.discoverServices(LE_SERVICES, function (error, services) {
            console.log('Discovered the following services:');
            for (var serviceIndex = 0; serviceIndex < services.length; serviceIndex++) {
                var service = services[serviceIndex];
                service.discoverCharacteristics(LE_CHARACTERISTICS, function (error, characteristics) {
                    console.log('  ' + service);
                    console.log('  Discovered the following characteristics:');
                    for (var charecteristicIndex = 0; charecteristicIndex < characteristics.length; charecteristicIndex++) {
                        var charecteristic = characteristics[charecteristicIndex];
                        console.log('    ' + charecteristic);
                        if (charecteristic.properties.includes("notify")) {
                            charecteristic.on('data', function (data, isNotification) {
                                var dataArray = data.toJSON().data;
                                console.log('<%s> Data Read: %s, Notification: %s', peripheral.address, JSON.stringify(dataArray), isNotification);
                                if (dataArray.length > 0) {
                                    var eventType = dataArray[dataArray.length - 1];
                                    changeLights(eventType);
                                }
                            });
                            charecteristic.subscribe(function (error) {
                                console.log('      >>>>>Subscribed. Error: ' + JSON.stringify(error));
                            });
                        }
                    }
                });
            }
        });
    });
}

noble.on('rssiUpdate', function (abc) {
    console.log("rssiUpdate: ", JSON.stringify(abc));
});

function disconnectFromPeripheral(peripheral) {
    peripheral.disconnect(function (error) {
        console.log('Disconnected from peripheral. UUID: %s, Error: %s', peripheral.uuid, JSON.stringify(error));
    });
    connectedPeripherals.delete(peripheral);
}

function monitorConnectedPeripherals() {
    var restartBleScan = false;
    connectedPeripherals.forEach(peripheral => {
        if (peripheral.state !== 'connected') {
            console.log("Peripheral <%> no longer connected", peripheral.address);
            restartBleScan = true;
        }
    });
    if (restartBleScan) {
        if (noble.state === 'poweredOn') {
            console.log("Restarting BLE scan");
            stopBleScan();
            startBleScan();
        }
    }
}

function startBleScan() {
    console.log("Starting BLE scan");
    noble.startScanning();
}

function stopBleScan() {
    console.log("Stopping BLE scan");
    noble.stopScanning();
    new Set(connectedPeripherals).forEach(peripheral => disconnectFromPeripheral(peripheral));
}

function bleInit() {
    console.log("Waiting for BLE adapter");
    noble.on('stateChange', function (state) {
        if (state === 'poweredOn') {
            startBleScan();
        } else {
            stopBleScan();
        }
    });
}

function changeLights(eventType) {
    var sceneModified = false;
    switch (eventType) {
        case LE_CLICK:
            modifyCurrentSceneValue(1);
            sceneModified = true;
            break;

        case LE_DOUBLE_CLICK:
            modifyCurrentSceneValue(-1);
            modifyCurrentSceneValue(-1);
            sceneModified = true;
            break;
    }

    if (sceneModified && !sceneApplicationPending) {
        sceneApplicationPending = true;
        setTimeout(applyYeelightScene, LE_DOUBLE_CLICK_DELAY);
    }
}

function modifyCurrentSceneValue(valueToAdd) {
    currentScene = currentScene + valueToAdd;
    if (currentScene < 1) {
        currentScene = 4;
    }
    if (currentScene > 4) {
        currentScene = 1
    }
}

function applyYeelightScene() {
    console.log("Applying scene: " + currentScene);
    var promises = [];
    switch (currentScene) {
        case 1: // Soft Lamp
            var commands = [
                ["set_power", YEELIGHT_POWER_ON_STATE, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_ct_abx", SOFT_TEMP, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_bright", 100, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY]
            ];
            promises.push(applyYeelightCommands(IP_FIRST_LAMP, commands));
            promises.push(applyYeelightCommands(IP_SECOND_LAMP, commands));
            break;

        case 2: // Night Lamp
            var commands = [
                ["set_power", YEELIGHT_POWER_ON_STATE, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_ct_abx", SOFT_TEMP, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_bright", 1, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY]
            ];
            promises.push(applyYeelightCommands(IP_FIRST_LAMP, commands));
            promises.push(applyYeelightCommands(IP_SECOND_LAMP, commands));
            break;

        case 3: // Baby Time
            promises.push(applyYeelightCommands(IP_FIRST_LAMP, [
                ["set_power", YEELIGHT_POWER_ON_STATE, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_ct_abx", SOFT_TEMP, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY],
                ["set_bright", 1, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY]
            ]));
            promises.push(applyYeelightCommands(IP_SECOND_LAMP, [
                ["set_power", YEELIGHT_POWER_OFF_STATE, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY]
            ]));
            break;

        case 4: // Off
            var commands = [
                ["set_power", YEELIGHT_POWER_OFF_STATE, EFFECT_SUDDEN, EFFECT_SUDDEN_DELAY]
            ];
            promises.push(applyYeelightCommands(IP_FIRST_LAMP, commands));
            promises.push(applyYeelightCommands(IP_SECOND_LAMP, commands));
            break;
    }
    Promise.allSettled(promises).then(results => {
        sceneApplicationPending = false;
    });
}

async function applyYeelightCommands(address, commands) {
    var light = new Yeelight(address, YEELIGHT_PORT);
    light.on('connect', function () {
        var cmdPromises = [];
        commands.forEach(command => {
            var commandCopy = command.slice();
            var method = commandCopy.shift();
            var params = commandCopy; // contains the remaining elements of the array
            var cmdPromise = light.command(method, params);
            cmdPromise.catch(function (error) {
                console.log("Failed to execute Yeelight command. IP: %s, Method: %s, Params: %s. Error: %s",
                    address, method, JSON.stringify(params), JSON.stringify(error));
            });
            cmdPromises.push(cmdPromise);
        });
        Promise.allSettled(cmdPromises).then(results => {
            light.exit();
        });
    });
    light.on('error', function (error) {
        console.log("Failed to connect to Yeelight: " + JSON.stringify(error));
    });
}

console.log("Application startup!!");
bleInit();
setInterval(monitorConnectedPeripherals, LE_CONNECTED_CHECK_INTERVAL);
