// For pasting in console. Include favorite $ before running

(function () {
  'use strict';

  window.scrape = function (old_data) {
    var data = old_data || {};
    data.entries = data.entries || {};

    getTopLevelComments().each(function (index, row) {
      data = parseRow(index, row, data);
    });

    data = updateMetadata(data);
    return data;
  };

  var getTopLevelComments = function () {
    var $allComments = $('body > center > table > tbody > tr > td > table > tbody > tr > td > table > tbody > tr');
    var topLevelComments = [];
    $allComments.each(function (index, row) {
      if ($(row).find('img[src="s.gif"]').attr('width') === '0')
        topLevelComments.push(row);
    });
    return $(topLevelComments);
  };

  var parseRow = function (index, row, data) {
    var $row = $(row);
    if ($row.find('.comhead').first().find('a').last().attr('href') === undefined)
      return data; // indicates a deleted entry
    var id = $row.find('.comhead').first().find('a').last().attr('href').match(/\d+/g)[0];
    var commentBody = $row.find('td.default .comment')[0].outerHTML;

    if (data.entries[id]) {
      if (commentBody !== data.entries[id].commentBody) {
        data.entries[id].requiresAttention = 'commentBodyChanged';
      }
    } else {
      var author = $row.find('.comhead').first().find('a').first().text();

      data.entries[id] = {};
      data.entries[id].id = id;
      data.entries[id].author = author;
      data.entries[id].commentBody = commentBody;
      data.entries[id].companyName = "UNKNOWN";
      data.entries[id].tags = [];
      data.entries[id].locationNames = [];
      data.entries[id].locations = [];

      data.entries[id].requiresAttention = 'newEntry';
    }

    data.entries[id].index = index;
    return data;
  };

  var updateMetadata = function (data) {
    data.metadata = data.metadata || {};
    data.metadata.last_scraped_at = (new Date()).getTime();

    if (!data.metadata.first_scraped) {
      data.metadata.first_scraped = data.metadata.last_scraped_at;
      data.metadata.month = "UNKNOWN";
      data.metadata.url = window.location.href;
    }
    return data;
  };

  //load Underscore and Google Maps API JS first
  window.geocodeData = function (entries) {
    window.geocoder = new google.maps.Geocoder();
    window.entries = entries;
    window.queue = [];
    _.each(_.keys(entries), function (key) {
      var entry = entries[key];
      if (entry.locationNames && entry.locationNames.length != entry.locations.length) {
        _.each(entry.locationNames, function (locationName) {
          queue.push([key, {address: locationName}]);
        });
      }
    });

    window.worker = setInterval(function () {
      if (queue.length) {
        var job = queue.pop();
        var locationName = job[1];
        var key = job[0];
        console.log(locationName.address);
        geocoder.geocode(locationName, function (results, status) {
          var locationResult = results[0].geometry.location;
          var latLong = {latitude: locationResult.lb, longitude: locationResult.mb};
          console.log(latLong);
          if (_.every(entries[key].locations, function (location) {return !_.isEqual(location, latLong); })) {
            entries[key].locations.push(latLong);
          }
        });
      } else {
        clearInterval(worker);
        console.log('DONE!');
      }
    }, 2000);
  };

  //load Underscore first
  window.appendData = function (accumulatedData, newData) {
    var accumulatedEntryCount = _.keys(accumulatedData.entries).length;

    _.each(_.keys(newData.entries), function (key) {
      accumulatedData.entries[key] = newData.entries[key];
      accumulatedData.entries[key].index = accumulatedData.entries[key].index + accumulatedEntryCount;
    });

    return accumulatedData;
  };
}());
