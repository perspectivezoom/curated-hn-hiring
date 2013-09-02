// Shamelessly stolen from https://github.com/premii/hn/blob/master/a/js/helper.js
(function(chnh) {
    'use strict';
    var prerender = function(tmpl) {

        return eval( "(function(data){ return '" +
            tmpl.replace(/[\t|\n]/g, '')
                .replace(/'/g, "\\'")
                .replace((RegExp("{\\s*([a-z0-9_][.a-z0-9_]*)\\s*}", "gi")), function (tag, k) {
                    return "' + ( data." + k + " || '' ) + '";
                })
                .replace( /\s\s+/g, ' ' )
            + "'; })" );
    };

    chnh.prerender = prerender;

    var template = function(tmpl, data, prefix) {
        prefix = prefix || '';
        for (var val in data) {
            if (typeof data[val] === 'object') {
                tmpl = template(tmpl, data[val], val + '.');
            }
            else {
                tmpl = tmpl.split("{" + prefix + val + "}").join(data[val]);
            }
        }
        return tmpl;
    };

    chnh.t = template;

})(window.chnh);