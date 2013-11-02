var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var getTopLevelComments = function ($) {
  var $allComments = $('body > center > table > tr > td > table > tr > td > table > tr');
  var topLevelComments = [];
  $allComments.each(function (index, row) {
    if ($(row).find('img[src="s.gif"]').attr('width') === '0') {
      topLevelComments.push(row);
    }
  });
  return $(topLevelComments);
};

var parseRow = function ($, index, row, data) {
  var $row = $(row);
  if ($row.find('.comhead').first().find('a').last().attr('href') === undefined) {
    return data; // indicates a deleted entry
  }
  var id = $row.find('.comhead').first().find('a').last().attr('href').match(/\d+/g)[0];
  var commentBody = $($row.find('td.default .comment')[0]).html();

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

var getMoreLink = function ($) {
  var lastNoFollowLink = $('a[rel="nofollow"]').last();
  if ($(lastNoFollowLink).text() === 'More') {
    return 'https://news.ycombinator.com' + $(lastNoFollowLink).attr('href');
  }
};

var scrape = function (url, running_data, indexOffset) {
  request(url, function (err, resp, body) {
    var $ = cheerio.load(body);
    var data = running_data || {};
    data.entries = data.entries || {};

    getTopLevelComments($).each(function (index, row) {
      data = parseRow($, index + indexOffset, row, data);
    });

    var moreLink = undefined;//getMoreLink($);
    if (moreLink) {
      scrape(moreLink, data, Object.keys(data.entries).length);
    } else {
      fs.writeFileSync(process.argv[3], JSON.stringify(data));
    }
  });
};

scrape(process.argv[2], {}, 0);