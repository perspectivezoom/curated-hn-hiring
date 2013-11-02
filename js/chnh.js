(function (chnh) {
  chnh.Models = chnh.Models || {};
  chnh.Collections = chnh.Collections || {};
  chnh.Views = chnh.Views || {};

  chnh.Models.Entry = Backbone.Model.extend({});

  chnh.Collections.Entries = Backbone.Collection.extend({
    model: chnh.Models.Entry
  });

  chnh.Views.Filters = Backbone.View.extend({
    filterNames: ['ApplyToPerson', 'H1B', 'Intern', 'UI/UX', 'PartTime', 'Remote', 'Relocate'],
    events: {
      'click .filter': 'toggleFilter',
      'keyup .regex' : 'onRegex'
    },
    initialize: function () {
      chnh.vent.on('toggle-filter', this.toggleOwnDisplay, this);
    },
    toggleOwnDisplay: function () {
      this.$el.toggleClass('hidden');
    },
    toggleFilter: function (e) {
      if ($(e.currentTarget).hasClass('on')) {
        $(e.currentTarget).removeClass('on');
        $(e.currentTarget).addClass('off');
      } else if ($(e.currentTarget).hasClass('off')) {
        $(e.currentTarget).removeClass('off');
      } else {
        $(e.currentTarget).addClass('on');
      }
      analytics.track('Clicked Filter', {value: $(e.currentTarget).text(), on: $(e.currentTarget).hasClass('on'), off: $(e.currentTarget).hasClass('off')});
      chnh.vent.trigger('filter');
    },
    onRegex: _.debounce(function () {
        chnh.vent.trigger('regex');
    }, 500),
    regex: function () {
      if (this.$(".regex").val()) {
        return new RegExp(this.$(".regex").val(), "i");
      } else {
        return null;
      }
    },
    onFilters: function () {
      return this.$('.filter.on').map(function (index, el) {return $(el).text();});
    },
    offFilters: function () {
      return this.$('.filter.off').map(function (index, el) {return $(el).text();});
    },
    render: function () {
      _.each(this.filterNames, function (filterName) {
        this.$el.append("<span class='filter button'>" + filterName + "</span>");
      }, this);
    }
  });

  chnh.Views.Sorts = Backbone.View.extend({
    events: {
      'click .sort': 'toggleSort',
      'keyup .coords input': 'maybeLocationSort'
    },
    initialize: function () {
      chnh.vent.on('toggle-sort', this.toggleOwnDisplay, this);
    },
    toggleOwnDisplay: function () {
      this.$el.toggleClass('hidden');
    },
    toggleSort: function (e) {
      analytics.track('Clicked Sort', {value: $(e.currentTarget).text()});
      if ($(e.currentTarget).text() === 'Location') {
        this.getLocation();
      } else {
        $('.sort').removeClass('on');
        $(e.currentTarget).addClass('on');
        chnh.vent.trigger('sort');
      }
    },
    comparator: function () {
      if ($('.sort.on').text() === 'Rank') {
        return function (entry) {
         return entry.get('index');
        };
      } else if ($('.sort.on').text() === 'Recently Added') {
        return function (entry) {
         return -1 * entry.get('id');
        };
      } else {
        var lat = parseFloat(this.$('.coords.lat input').val(), 10);
        var long = parseFloat(this.$('.coords.long input').val(), 10);
        return function (entry) {
          if (!entry.get('locations')) {
            return 40000000; //roughly the circumference of the earth in meters
          } else {
            var distances = _.map(entry.get('locations'), function (location) {
              return geolib.getDistance({latitude: lat, longitude: long}, location) + entry.get('index'); //terrible secondary sort hack
            }); 
            return Math.min.apply(undefined, distances);
          }
        };
      }
    },
    getLocation: function () {
      var that = this;
      navigator.geolocation.getCurrentPosition(function (location) {
        $('.coords.lat input').val(location.coords.latitude);
        $('.coords.long input').val(location.coords.longitude);
        analytics.track('Got Location', {lat: $('.coords.lat input').val(), long: $('.coords.long input').val()});
        that.maybeLocationSort();
      });
    },
    maybeLocationSort: function (e) {
      var lat = parseFloat(this.$('.coords.lat input').val(), 10);
      var long = parseFloat(this.$('.coords.long input').val(), 10);
      if (lat && long && !isNaN(lat) && !isNaN(long)) {
        $('.sort').removeClass('on');
        $('.sort.location').addClass('on');
        chnh.vent.trigger('sort');
      }
    }
  });

  chnh.Views.Entry = Backbone.View.extend({
    template: _.template('<div class="entry-details"><div class="gradient-mask"></div><div class="comment-body"><%= commentBody %></div></div>'),
    tagName: 'li',
    className: 'entry',
    events: {
      'click .gradient-mask': 'expandEntry',
      'click .comment-body' : 'collapseEntry'
    },
    expandEntry: function (e) {
      this.$('.gradient-mask').addClass('hidden');
      this.$('.entry-details').animate({height: this.$('.comment').height()}, 'fast'); //pre-November html
      this.$('.entry-details').animate({height: this.$('.comment-body').height()}, 'fast');
      this.$('.entry-details').addClass('expanded');
    },
    collapseEntry: function (e) {
      var that = this;
      if (this.$('.entry-details').hasClass('expanded')) {
        this.$('.entry-details').animate(
          {
            height: 100
          },
          {
            duration: 'fast',
            complete: function () {
              that.$('.gradient-mask').removeClass('hidden');
              that.$('entry-details').removeClass('expanded');
            }
          }
        );
      } else {
        this.$('.gradient-mask').addClass('hidden');
        this.$('.entry-details').animate({height: this.$('.comment').height()}, 'fast'); //pre-November html
        this.$('.entry-details').animate({height: this.$('.comment-body').height()}, 'fast');
        this.$('.entry-details').addClass('expanded');
      }
    },
    render: function () {
      this.$el.html(this.template(this.model.attributes));
      this.$el.find('p').last().remove(); //terrible hack to get rid of reply link
      return this;
    }
  });

  chnh.Views.Navigation = Backbone.View.extend({
    events: {
      'click .vent.button': 'onVentButton'
    },
    onVentButton: function (e) {
      var $currentTarget = $(e.currentTarget);
      $currentTarget.toggleClass('on');
      chnh.vent.trigger($currentTarget.data('vent'));
    }
  });

  chnh.Views.Entries = Backbone.View.extend({
    entryViews: [],
    initialize: function () {
      chnh.vent.on('filter', this.render, this);
      chnh.vent.on('sort', this.render, this);
      chnh.vent.on('regex', this.render, this);
    },
    render: function () {
      this.clearEntryViews();

      this.collection.comparator = this.options.sortsView.comparator();
      this.collection.sort();

      var onFilters = this.options.filtersView.onFilters();
      var offFilters = this.options.filtersView.offFilters();
      var regex = this.options.filtersView.regex();
      var $entriesHtml = $('<ul></ul>');
      this.collection.each(function (entry) {
        var tags = entry.get('tags');
        if (_.intersection(tags, onFilters).length === onFilters.length && _.intersection(tags, offFilters).length === 0) {
          if (!regex || (entry.get('commentBody').match(regex))) {
            var view = new chnh.Views.Entry({model: entry});
            $entriesHtml.append(view.render().el);
            this.entryViews.push(view);
          }
        }
      }, this);
      this.$el.html($entriesHtml);
      return this;
    },
    clearEntryViews: function () {
      _.each(this.entryViews, function (entryView) { entryView.remove(); });
      this.$el.html('');
      this.entryViews = [];
    }
  });

  chnh.vent = _.extend({}, Backbone.Events);

  chnh.init = function () {
    $.getJSON('data/2013-11.json', function(json) {
      var filtersView = new chnh.Views.Filters({el: $('.filters')});
      filtersView.render();
      var sortsView = new chnh.Views.Sorts({el: $('.sorts')});
      var nav = new chnh.Views.Navigation({el: $('.nav')});
      var entries = new chnh.Collections.Entries(_.values(json.entries));
      var entriesView = new chnh.Views.Entries({el: $('.entries'), collection: entries, filtersView: filtersView, sortsView: sortsView});
      entriesView.render();
    });
  };
}(window.chnh));