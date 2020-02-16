# Introduction

This is a simple Node.js script which shows how to control your Yeelights over LAN using cheap BLE tracker devices. In this case, I purchased some BLE tracker devices that have a button on them. Given this program is running (tested on Mac OS 10.15.3), it automatically discovers any BLE devices named "TrackerPA" as soon as they are available and subscribes to the notification topics for its button. This way I can have as many BLE tracker devices connected as I want. Whenever any tracker disconnects, the BLE scanning is reset and remaining trackers are quickly re-connected.

On receiving a button press notification, I cycle through different scenes for the two Yeelight bulbs in this script. Double pressing the button cycles to the previous scene. You can program your own scenes using this example.

## References

1. <https://lsong.org/node-yeelight/Yeelight.html>
1. <https://www.yeelight.com/download/Yeelight_Inter-Operation_Spec.pdf>
1. <https://github.com/noble/noble/wiki/Getting-started>
1. <https://github.com/noble/noble/blob/master/examples/pizza/central.js>
1. <https://github.com/noble/noble/blob/master/examples/advertisement-discovery.js>
