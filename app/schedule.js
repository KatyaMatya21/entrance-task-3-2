/**
 * Calculates electric device running schedule
 * @class Schedule
 */
class Schedule {

  /**
   * @constructor
   * @param {object} data
   */
  constructor(data) {
    this.devices = data.devices;
    this.rates = data.rates;
    this.maxPower = data.maxPower;

    this.schedule = {};
    this.currentPowerForHour = {};
    this.totalMoneySpent = 0;
    this.deviceMoneySpent = {};

    this.hoursTable = [];
    this.devicesTable = [];

    this.errors = [];

    this.init();

    this.createHoursTable();
    this.createDevicesTable();
    this.createSchedule();
  }

  /**
   * Initializes the arrays
   */
  init() {
    for (let s = 0; s < 24; s++) {
      this.schedule[s] = [];
    }

    for (let c = 0; c < 24; c++) {
      this.currentPowerForHour[c] = this.maxPower;
    }
  }

  /**
   * Gets mode of specific hour
   * @param {int} time
   * @returns {string}
   */
  getModeForHour(time) {
    return (time < 7 || time >= 21) ? 'night' : 'day';
  }

  /**
   * Gets rates matching specific hour
   * @param {int} hour
   * @returns {*}
   */
  getRatesForHour(hour) {
    return this.rates.filter((rate) => this.isTimeIncludes(hour, rate.from, rate.to));
  }

  /**
   * Checks if specified hour is in specified interval
   * @param {int} time
   * @param {int} from
   * @param {int} to
   * @returns {boolean}
   */
  isTimeIncludes(time, from, to) {
    if (from > to) {
      if (time >= from || (time >= 0 && time < to)) {
        return true;
      }
    } else {
      if (time >= from && time < to) {
        return true;
      }
    }
    return false;
  };

  /**
   * Retrieves record from hoursTable
   * @param {int} hour
   * @returns {object}
   */
  getHourItem(hour) {
    return this.hoursTable[this.hoursTable.findIndex((item) => item.hour === hour)];
  };

  /**
   * Creates a sorted table with hours and rates
   */
  createHoursTable() {
    for (let i = 0; i < 24; i++) {
      let hour = {};
      hour['hour'] = i;
      hour['power'] = this.maxPower;
      hour['mode'] = this.getModeForHour(i);
      hour['workers'] = [];
      hour['workers_id'] = [];
      hour['price'] = this.getRatesForHour(i)
        .reduce(function (price, rate) {
          return rate.value < price ? rate.value : price;
        }, 999);
      this.hoursTable.push(hour);
    }

    this.hoursTable.sort(function (a, b) {
      return a.price - b.price;
    });
  }

  /**
   * Creates a sorted table with devices
   */
  createDevicesTable() {
    this.devicesTable = this.devices.slice();
    this.devicesTable.sort(function (a, b) {
      return a.duration === 24 ? -1 : (a.power * a.duration - b.power * b.duration);
    });
    this.devicesTable.reverse();
  }

  /**
   * Creates a sorted table with resulting info
   */
  createSchedule() {
    for (let device of this.devicesTable) {

      // Copy hoursTable array
      let availableHours = this.hoursTable.slice();

      if (device['mode']) {
        availableHours = this.hoursTable.filter(function (hour) {
          return hour.mode === device.mode;
        });
      }

      // Filter out hours without enough power
      availableHours = availableHours.filter(function (hour) {
        return hour.power >= device.power;
      });


      // Sort by price and time
      availableHours.sort(function (a, b) {
        return a.price - b.price || a.hour - b.hour;
      });

      if (!availableHours.length) {
        this.errors.push('No more space available for ' + device.name);
        continue;
      }

      if (availableHours.length < device.duration) {
        this.errors.push('Not enough available hours for ' + device.name);
        continue;
      }

      for (let firstHour of availableHours) {

        // Take device.duration records from available hours
        let cHours = availableHours.slice(0, device.duration);

        if (cHours.length < device.duration) {
          this.errors.push('Not enough continuously available hours for ' + device.name);
          break;
        }

        // Check if there is enough space for continuous run of device
        if (!cHours.every((h) => (h.power >= device.power))) {
          continue;
        }

        for (let i = 0; i < device.duration; i++) {
          let targetHour = firstHour.hour + i;

          // Handle midnight
          if (targetHour === 24) {
            targetHour = 0;
          }

          this.getHourItem(targetHour).power -= device.power;
          this.getHourItem(targetHour).workers.push(device.name);
          this.getHourItem(targetHour).workers_id.push(device.id);

          this.totalMoneySpent += device.power / 1000 * this.getHourItem(targetHour).price;

          if (typeof this.deviceMoneySpent[device.id] === 'undefined') {
            this.deviceMoneySpent[device.id] = 0;
          }
          this.deviceMoneySpent[device.id] += device.power / 1000 * this.getHourItem(targetHour).price;
        }
        break;
      }

      this.hoursTable.sort(function (a, b) {
        return a.hour - b.hour;
      });
    }
  }

  /**
   * Gets object with resulting info
   * @returns {{schedule: {}, consumedEnergy: {}}}
   */
  getSchedule() {
    let output = {
      'schedule': {},
      'consumedEnergy': {},
      'devices': {}
    };

    for (let hour of this.hoursTable) {
      output.schedule[hour.hour] = hour.workers_id;
    }

    output.consumedEnergy.value = +this.totalMoneySpent.toFixed(3);
    let formattedDeviceMoneySpent = {...this.deviceMoneySpent};

    for (var key in formattedDeviceMoneySpent) {
      if (formattedDeviceMoneySpent.hasOwnProperty(key)) {
        formattedDeviceMoneySpent[key] = +formattedDeviceMoneySpent[key].toFixed(4);
      }
    }

    output.consumedEnergy.devices = formattedDeviceMoneySpent;

    // Add id = device name mapping for easier visualization
    for(let device of this.devices) {
      output.devices[device.id] = device.name;
    }

    return output;
  }

  getErrors() {
    return this.errors;
  }

}

module.exports = Schedule;
