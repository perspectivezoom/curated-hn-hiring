(function(chnh) {
  chnh.Models = chnh.Models || {};
  chnh.Collections = chnh.Collections || {};
  chnh.Views = chnh.Views || {};

  chnh.Models.Entry = Backbone.Model.extend({});

  chnh.Collections.Entries = Backbone.Collection.extend({
    model: chnh.Models.Entry
  });

  chnh.Views.Filters = Backbone.View.extend({
    filterNames: ['ApplyToPerson', 'H1B', 'Intern', 'UI/UX', 'Remote', 'CoFounder'],
    events: {
      'click .filter': 'toggleFilter'
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
      this.entriesView.render();
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
      'click .sort': 'toggleSort'
    },
    toggleSort: function (e) {
      var that = this;
      if ($(e.currentTarget).text() === 'Location') {
        navigator.geolocation.getCurrentPosition(function (location) {
          window.currentLocation = location;
          $('.sort').removeClass('on');
          $('.sort.location').addClass('on');
          that.entriesView.render();
        });
      } else {
        $('.sort').removeClass('on');
        $(e.currentTarget).addClass('on');
        that.entriesView.render();
      }
    },
    comparator: function () {
      if ($('.sort.on').text() === 'Points') {
        return function (entry) {
         return entry.get('index');
        };
      } else {
        return function (entry) {
          if (!window.currentLocation || !entry.get('locations')) {
            return 40000000;
          } else {
            var distances = _.map(entry.get('locations'), function (location) { 
              return geolib.getDistance(window.currentLocation.coords, location) + entry.get('index'); //terrible secondary sort hack
            });
            return Math.min(distances);
          }
        };
      }
    }
  });

  chnh.Views.Entry = Backbone.View.extend({
    template: chnh.prerender($('.entry-list-item').html()),
    tagName: 'li',
    className: 'entry',
    events: {
      'click .gradient-mask': 'expandEntry',
      'click .comment-body' : 'collapseEntry'
    },
    expandEntry: function (e) {
      this.$('.gradient-mask').addClass('hidden');
      this.$('.entry-details').animate({height: this.$('.comment').height()}, 'fast');
    },
    collapseEntry: function (e) {
      var that = this;
      this.$('.entry-details').animate(
        {
          height: 100
        }, 
        {
          duration: 'fast', 
          complete: function () {that.$('.gradient-mask').removeClass('hidden');
        }
      });
    },
    render: function () {
      this.$el.html(this.template(this.model.attributes));
      this.$el.find('p').last().remove(); //terrible hack to get rid of reply link
      return this;
    }
  });

  chnh.Views.Entries = Backbone.View.extend({
    entryViews: [],
    render: function () {
      _.each(this.entryViews, function (entryView) {entryView.remove();});
      this.entryViews = [];

      this.collection.comparator = this.options.sortsView.comparator();
      this.collection.sort();

      var onFilters = this.options.filtersView.onFilters();
      var offFilters = this.options.filtersView.offFilters();
      this.collection.each(function (entry) {
        var tags = entry.get('tags');
        if (_.intersection(tags, onFilters).length === onFilters.length && _.intersection(tags, offFilters).length === 0) {
          var view = new chnh.Views.Entry({model: entry});
          this.$el.append(view.render().el);
          this.entryViews.push(view);
        }
      }, this);
      return this;
    }
  });

  var filtersView = new chnh.Views.Filters({el: $('.filters')});
  filtersView.render();
  var sortsView = new chnh.Views.Sorts({el: $('.sorts')});
  var entries = new chnh.Collections.Entries(_.values(chnh.data.entries));
  var entriesView = new chnh.Views.Entries({el: $('.entries'), collection: entries, filtersView: filtersView, sortsView: sortsView});
  $('.toggleFilters').on('click', function (e) { $(e.currentTarget).toggleClass('on'); $('.filters').toggleClass('hidden'); });
  $('.toggleSorts').on('click', function (e) { $(e.currentTarget).toggleClass('on'); $('.sorts').toggleClass('hidden'); });
  filtersView.entriesView = entriesView;
  sortsView.entriesView = entriesView;
  entriesView.render();
}(window.chnh));