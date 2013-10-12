describe("Curated HN Hiring", function () {
  beforeEach(function () {
    window.analytics = {track: 'foo'};
    spyOn(analytics, 'track');

    $('#jasmine_content').remove();
    $('body').prepend("<div id='jasmine_content'></div>");
  });

  describe("Views", function () {
    describe("Navigation", function () {
      var view = null;

      beforeEach(function () {
        $('#jasmine_content').html("<div class='nav'><div data-vent='foo' class='vent button'></div></div>");
        view = new chnh.Views.Navigation({el: $('.nav')});
      });

      describe("onVentButton", function () {
        it("toggles the 'on' class of the button", function () {
          expect(view.$('.button')).not.toHaveClass('on');
          view.$('.button').click();
          expect(view.$('.button')).toHaveClass('on');
        });

        it("triggers on vent the data-vent property of the target element", function () {
          var ventSpy = jasmine.createSpy();
          chnh.vent.on('foo', ventSpy);
          view.$('.button').click();
          expect(ventSpy).toHaveBeenCalled();
        });
      });
    });

    describe("Filters", function () {
      var view = null;
      var viewClass = chnh.Views.Filters;
      var showView = function () {
        view = new chnh.Views.Filters({el: $('.filters')});
        view.render();
      };

      beforeEach(function () {
        $('#jasmine_content').html("<div class='filters'><input class='regex' /></div>");
      });

      describe("toggleOwnDisplay", function () {
        it("is bound to the toggle-filter vent", function () {
          spyOn(viewClass.prototype, 'toggleOwnDisplay');
          showView();
          expect(view.toggleOwnDisplay).not.toHaveBeenCalled();
          chnh.vent.trigger('toggle-filter');
          expect(view.toggleOwnDisplay).toHaveBeenCalled();
        });

        it("toggles the hidden class on the view's el", function () {
          showView();
          expect(view.$el).not.toHaveClass('hidden');
          view.toggleOwnDisplay();
          expect(view.$el).toHaveClass('hidden');
          view.toggleOwnDisplay();
          expect(view.$el).not.toHaveClass('hidden');
        });
      });

      describe("render", function () {
        it("populates its el with a filter button for each item in its filterNames", function () {
          showView();
          expect(view.$('.filter.button').length).toEqual(view.filterNames.length);
        });
      });

      describe("toggleFilter", function () {
        it("cycles the on off class of the button", function () {
          showView();
          expect(view.$('.filter.button').first()).not.toHaveClass('on');
          expect(view.$('.filter.button').first()).not.toHaveClass('off');
          view.$('.filter.button').first().click();
          expect(view.$('.filter.button').first()).toHaveClass('on');
          expect(view.$('.filter.button').first()).not.toHaveClass('off');
          view.$('.filter.button').first().click();
          expect(view.$('.filter.button').first()).not.toHaveClass('on');
          expect(view.$('.filter.button').first()).toHaveClass('off');
          view.$('.filter.button').first().click();
          expect(view.$('.filter.button').first()).not.toHaveClass('on');
          expect(view.$('.filter.button').first()).not.toHaveClass('off');
        });

        it("triggers a filter event on vent", function () {
          var ventSpy = jasmine.createSpy();
          chnh.vent.on('filter', ventSpy);
          showView();
          expect(ventSpy).not.toHaveBeenCalled();
          view.$('.filter.button').first().click();
          expect(ventSpy).toHaveBeenCalled();
        });

        it("hits analytics with the filter clicked", function () {
          showView();
          var button = view.$('.filter.button').first().click();
          expect(analytics.track).toHaveBeenCalledWith('Clicked Filter', { value: view.filterNames[0], on: button.hasClass('on'), off: button.hasClass('off') });
        });
      });

      describe("onRegex", function () {
        it("calls the regex event on vent", function () {
          jasmine.Clock.useMock();
          showView();
          var ventSpy = jasmine.createSpy();
          chnh.vent.on('regex', ventSpy);
          expect(ventSpy).not.toHaveBeenCalled();
          $('.regex').trigger('keyup');
          jasmine.Clock.tick(1000);
          expect(ventSpy).toHaveBeenCalled();
        });
      });

      describe("regex", function () {
        it("returns null if the regex input is blank", function () {
          showView();
          expect(view.regex()).toBeNull();
        });

        it("returns a regex for the text in .regex input", function () {
          showView();
          view.$('.regex').val('foo');
          var regex = view.regex();
          expect(regex).not.toBeNull();
          expect('foobar'.match(regex)).toBeTruthy();
          expect('bar'.match(regex)).toBeFalsy();
        });
      });

      describe("onFilters", function () {
        it("returns an array of filters that have class on", function () {
          showView();
          var $filter = view.$('.filter.button').first();
          
          expect(view.onFilters().length).toEqual(0);
          $filter.addClass('on');
          expect(view.onFilters().length).toEqual(1);
          expect(view.onFilters()[0]).toEqual($filter.text());
        });
      });

      describe("offFilters", function () {
        it("returns an array of filters that have class off", function () {
          showView();
          var $filter = view.$('.filter.button').first();
          
          expect(view.offFilters().length).toEqual(0);
          $filter.addClass('off');
          expect(view.offFilters().length).toEqual(1);
          expect(view.offFilters()[0]).toEqual($filter.text());
        });
      });
    });
  });
});