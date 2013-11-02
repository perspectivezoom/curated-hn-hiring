var fs = require('fs');
var _ = require('underscore');

var path = process.argv[2];

var updateMetadata = function (data) {
  data.metadata = data.metadata || {};
  data.metadata.last_scraped_at = (new Date()).getTime();

  if (!data.metadata.first_scraped) {
    data.metadata.first_scraped = data.metadata.last_scraped_at;
    data.metadata.month = "UNKNOWN";
    data.metadata.url = "UNKNOWN";
  }
  return data;
};

var guessTags = function (entry) {
  var guessableTags = [
    'Intern',
    'Remote'
  ];
  _.each(guessableTags, function (tag) {
    var regex = new RegExp(tag, "i");
    if (!_.contains(entry.tags, tag) && entry.commentBody.match(regex)) {
      entry.tags.push(tag);
    }
  });
  return entry;
};

var guessLocations = function (entry) {
  var commonLocations = [
    [new RegExp("San Francisco", "i"), "San Francisco, CA"],
    [new RegExp("New York", "i"), "New York, NY"],
    [new RegExp("NYC"), "New York, NY"],
    [new RegExp("London", "i"), "London, UK"]
  ];
  _.each(commonLocations, function (ar) {
    var regex = ar[0];
    var location = ar[1];
    if (!_.contains(entry.locationNames, location) && entry.commentBody.match(regex)) {
      entry.locationNames.push(location);
    }
  });
  return entry;
};

fs.readFile(path, 'utf8', function (err, data) {
  var json = JSON.parse(data);
  json = updateMetadata(json);
  _.each(json.entries, function (entry, key) {
    json.entries[key] = guessTags(json.entries[key]);
    json.entries[key] = guessLocations(json.entries[key]);
  });
  fs.writeFileSync(path, JSON.stringify(json));
});