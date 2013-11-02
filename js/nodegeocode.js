var geocoder = require('geocoder');
var fs = require('fs');
var _ = require('underscore');

var path = process.argv[2];
var worker = null;

var applyLocations = function (locationHash, json) {
  _.each(json.entries, function (entry, key) {
    if (json.entries[key].locationNames) {
      _.each(json.entries[key].locationNames, function (locationName) {
        var location = locationHash[locationName];
        if (!_.contains(json.entries[key].locations, location)) {
          json.entries[key].locations.push(location);
        }
      });
    }
  });

  fs.writeFileSync(path, JSON.stringify(json));
};

fs.readFile(path, 'utf8', function (err, data) {
  var json = JSON.parse(data);
  var locationNames = [];

  _.each(json.entries, function (entry, key) {
    if (entry.locationNames) {
      locationNames = _.union(locationNames, entry.locationNames);
    }
  });

  var locationHash = {};
  worker = setInterval(function () {
    if (locationNames.length) {
      var locationName = locationNames.pop();

      geocoder.geocode(locationName, function (err, data) {
        var values = data.results[0].geometry.location;
        locationHash[locationName] = { latitude: values.lat, longitude: values.lng };
        console.log(locationName);
        console.log(values);
      });
    } else {
      clearInterval(worker);
      console.log('finished calling google');
      applyLocations(locationHash, json);
    }
  }, 2000);
});