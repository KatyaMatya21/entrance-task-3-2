const assert = require('assert');
const Schedule = require('../app/schedule');

const sampleData = {
  'devices': [
    {
      'id': 'F972B82BA56A70CC579945773B6866FB',
      'name': 'Посудомоечная машина',
      'power': 950,
      'duration': 3,
      'mode': 'night',
    },
    {
      'id': 'C515D887EDBBE669B2FDAC62F571E9E9',
      'name': 'Духовка',
      'power': 2000,
      'duration': 2,
      'mode': 'day',
    },
    {
      'id': '02DDD23A85DADDD71198305330CC386D',
      'name': 'Холодильник',
      'power': 50,
      'duration': 24,
    },
    {
      'id': '1E6276CC231716FE8EE8BC908486D41E',
      'name': 'Термостат',
      'power': 50,
      'duration': 24,
    },
    {
      'id': '7D9DC84AD110500D284B33C82FE6E85E',
      'name': 'Кондиционер',
      'power': 850,
      'duration': 1,
    },
  ],
  'rates': [
    {
      'from': 7,
      'to': 10,
      'value': 6.46,
    },
    {
      'from': 10,
      'to': 17,
      'value': 5.38,
    },
    {
      'from': 21,
      'to': 23,
      'value': 5.38,
    },
    {
      'from': 23,
      'to': 7,
      'value': 1.79,
    },
  ],
  'maxPower': 2100,
};

describe('Schedule', function () {

  describe('getModeForHour', function () {

    const schedule = new Schedule(sampleData);

    it('should return night for night hours', function () {
      assert.equal(schedule.getModeForHour(21), 'night');
      assert.equal(schedule.getModeForHour(22), 'night');
      assert.equal(schedule.getModeForHour(23), 'night');
      for (let i = 0; i < 7; i++) {
        assert.equal(schedule.getModeForHour(i), 'night');
      }
    });

    it('should return day for day hours', function () {
      for (let i = 7; i < 21; i++) {
        assert.equal(schedule.getModeForHour(i), 'day');
      }
    });

    it('should throw an Error when no hour was passed', function () {
      assert.throws(schedule.getModeForHour, Error, 'getModeForHour not throwing an error');
    });

  });

  describe('isTimeIncludes', function () {
    const schedule = new Schedule(sampleData);

    it('should properly identify legit values', function () {
      assert.equal(schedule.isTimeIncludes(15, 10, 18), true);
      assert.equal(schedule.isTimeIncludes(11, 9, 12), true);
      assert.equal(schedule.isTimeIncludes(15, 9, 11), false);
      assert.equal(schedule.isTimeIncludes(11, 15, 20), false);
    });

    it('should handle midnight passing', function () {
      assert.equal(schedule.isTimeIncludes(1, 0, 3), true);
      assert.equal(schedule.isTimeIncludes(0, 23, 6), true);
    });

    it('should handle incorrect values', function () {
      assert.throws(() => schedule.isTimeIncludes(222, 23, 7), Error,
        'isTimeIncludes does not throw an error for incorrect hours');
    });

  });

  describe('getRatesForHour', function () {
    const schedule = new Schedule(sampleData);

    it('should properly identify rate for specific hour', function () {
      assert.deepEqual(schedule.getRatesForHour(15), [sampleData.rates[1]]);
      assert.deepEqual(schedule.getRatesForHour(22), [sampleData.rates[2]]);
    });

    it('should identify rates including from value into calculation', function () {
      assert.deepEqual(schedule.getRatesForHour(7), [sampleData.rates[0]]);
    });

    it('should identify rates not including to value into calculation', function () {
      assert.deepEqual(schedule.getRatesForHour(23), [sampleData.rates[3]]);
    });

    it('should properly handle when there are no rates for the hour', function () {
      assert.equal(schedule.getRatesForHour(18).length, 0);
    });

  });

  describe('getHourItem', function () {
    const schedule = new Schedule(sampleData);
    const item = schedule.hoursTable[schedule.hoursTable.findIndex((item) => item.hour === 0)];

    it('should be able to find an item', function () {
      assert.deepEqual(schedule.getHourItem(0), item);
    });

    it('should be able to handle missing item', function () {
      assert.equal(typeof schedule.getHourItem(999), 'undefined');
    });

    it('should return a reference to the object', function () {
      assert.equal(schedule.getHourItem(0), item);
    });

    it('should not return a copy of object', function () {
      assert.notEqual(schedule.getHourItem(0), {...item});
    });

  });

  describe('createHoursTable', function () {
    const schedule = new Schedule(sampleData);

    it('should contain 24 hours', function () {
      assert.equal(schedule.hoursTable.length, 24);
    });

    it('should not contain duplicates', function () {
      let ar = [];
      for (let item of schedule.hoursTable) {
        assert.equal(ar.indexOf(item.hour), -1);
        ar.push(item.hour);
      }
    });

  });

  describe('createDevicesTable', function () {
    const schedule = new Schedule(sampleData);

    it('should contain all devices', function () {
      assert.equal(schedule.devices.length, sampleData.devices.length);
    });

    it('should contain all devices', function () {
      let ar = [];
      for (let item of schedule.devicesTable) {
        assert.equal(ar.indexOf(item.id), -1);
        ar.push(item.id);
      }
    });

    it('should sort by total power consumption', function () {
      let current = 999999;
      for (let item of schedule.devicesTable) {
        assert.equal(((item.power * item.duration) <= current), true);
        current = item.power * item.duration;
      }
    });

  });

  describe('getErrors', function () {

    it('should handle error for unavailable power', function () {
      let sampleDataClone = JSON.parse(JSON.stringify(sampleData));
      sampleDataClone.devices.push({
        'id': '666',
        'name': 'Коллайдер',
        'power': 10000000,
        'duration': 1,
        'mode': 'night'
      });
      const schedule = new Schedule(sampleDataClone);

      assert.equal(schedule.getErrors().length, 1);
    });

    it('should handle error for not available hours', function () {
      let sampleDataClone = JSON.parse(JSON.stringify(sampleData));
      sampleDataClone.devices.push({
        'id': '666',
        'name': 'Коллайдер',
        'power': 10,
        'duration': 25,
        'mode': 'day'
      });
      const schedule = new Schedule(sampleDataClone);

      assert.equal(schedule.getErrors().length, 1);
    });


    it('should handle error for not available continuous hours', function () {
      let sampleDataClone = JSON.parse(JSON.stringify(sampleData));
      sampleDataClone.devices = [
        {
          'id': 'FAAAAAABBBBBBXXXCCCCCCCCCC1',
          'name': 'Коллайдер 1',
          'power': 2000,
          'duration': 6,
          'mode': 'night'
        },
        {
          'id': 'FAAAAAABBBBBBXXXCCCCCCCCCC3',
          'name': 'Коллайдер 2',
          'power': 2000,
          'duration': 4,
          'mode': 'night'
        }
      ];
      const schedule = new Schedule(sampleDataClone);

      assert.equal(schedule.getErrors().length, 1);
    });

  });

});
