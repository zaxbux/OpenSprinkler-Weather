<img align="left" height="150" src="http://albahra.com/opensprinkler/icon-new.png"><h3>&nbsp;OpenSprinkler Weather Service [![GitHub version](https://img.shields.io/github/package-json/v/opensprinkler/opensprinkler-weather.svg)](https://github.com/OpenSprinkler/OpenSprinkler-Weather)</h3>
&nbsp;[![Build Status](https://api.travis-ci.org/OpenSprinkler/OpenSprinkler-Weather.svg?branch=master)](https://travis-ci.org/) [![devDependency Status](https://david-dm.org/OpenSprinkler/OpenSprinkler-Weather/status.svg)](https://david-dm.org/OpenSprinkler/OpenSprinkler-Weather#info=dependencies)<br>
&nbsp;[Official Site][official] | [Support][help] | [Changelog][changelog]
<br>
This script is used by OpenSprinkler Unified Firmware to update the water level of the device. It also provides timezone information based on user location along with other local information (sunrise, sunset, daylights saving time, etc).

---

[official]: https://opensprinkler.com
[help]: http://support.opensprinkler.com
[changelog]: https://github.com/OpenSprinkler/OpenSprinkler-Weather/releases


---

## Docker

It is possible to build a self-contained docker image from this repository.  It can then be used to run the service
without installing any prerequisites or setting up systemd.

### Building the Docker image
```shell script
./build-docker.sh  # run with -h for other options
```
The above will generate baselineEtoData (if not already done) and then build a complete opensprinkler-weather docker image.