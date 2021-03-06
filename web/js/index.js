'use strict'; /* global google */
var Promise = require('bluebird');
var $ = require('jquery');
var _ = require('lodash');

var RATE_LIMIT = 8;
var requestsSentInLastSecond = 0;

setInterval(function() {
  logger('Resetting rate limit');
  requestsSentInLastSecond = 0;
}, 1000);

function initialize() {
  Promise.promisifyAll(google.maps.Geocoder.prototype);

  var mapOptions = {
    center: { lat: -23.5367595, lng: -46.645081},
    zoom: 10
  };

  var map = new google.maps.Map(
    document.getElementById('map-canvas'),
    mapOptions
  );

  $.getJSON('/data/locexa1f.json', null, function(data) {
    var locations = _.map(data, function(location, range) {
      return _.extend(location, {
        range: _.map(range.split('-'), function(n) {
          return parseFloat(n);
        }),
      });
    });

    var geocodedLocationsP = placeLocationMarkers(map, _.values(data));

    $.getJSON('/data/results1.json', null, function(results1) {
      $.getJSON('/data/people2.json', null, function(people2) {
        var people2Grouped = _.groupBy(people2, 'inscricao');

        geocodedLocationsP
          .then(function(geocodedLocations) {
            var people1 = _.map(results1, function(nome, inscricao) {
              inscricao = parseFloat(inscricao);

              return {
                nome: nome,
                inscricao: inscricao,
                location: locationForInscricao(geocodedLocations, inscricao),
                passou: !!people2Grouped[inscricao],
              };
            });

            var relevantPeople = _.filter(people1, function(person) {
              return person.location.geocoding;
            });

            var groupedPeople = _.groupBy(relevantPeople, function(person) {
              return person.location.local;
            });

            var circles = _.map(groupedPeople, function(people) {
              var geocoding = people[0].location.geocoding;
              var color = randomColor();
              var aprovedPercentage = _.where(people, { passou: true }).length / people.length;

              return new google.maps.Circle({
                center: geocoding.geometry.location,
                fillColor: color,
                fillOpacity: 0.35,
                map: map,
                radius: aprovedPercentage * 10000,
                strokeColor: color,
                strokeOpacity: 0.3,
                strokeWeight: 1,
              });
            });
          });
      });
    });
  });
}

// copied from SO question/answer 1484506
function randomColor() {
  var letters = '0123456789ABCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function locationForInscricao(locations, inscricao) {
  return _.find(locations, function(location) {
    return inLocation(location, inscricao);
  });
}

function inLocation(location, inscricao) {
  return inscricao >= location.range[0] && inscricao <= location.range[1];
}

function placeLocationMarkers(map, locations) {
  var geocoder = new google.maps.Geocoder();
  return Promise.map(locations, function(item) {
    return geocodeAsync(geocoder, { address: item.endereco })
      .then(function(results) {
        var bestResult = _.first(results);
        if(!bestResult) {
          return item;
        }

        return _.extend(item, {
          geocoding: bestResult,
          marker: new google.maps.Marker({
            position: bestResult.geometry.location,
            map: map,
            title: item.local,
            icon: 'marker-1a-fase.png',
          }),
        });
      });
  });
}

function geocodeAsync(geocoder, req) {
  return new Promise(function(fulfill, reject) {
    if(requestsSentInLastSecond >= RATE_LIMIT) {
      logger('Above rate limit, waiting');
      setTimeout(function() {
        geocodeAsync(geocoder, req).then(fulfill, reject);
      }, 2000);
      return;
    }

    requestsSentInLastSecond++;
    geocoder.geocode(req, function(geocoderResult, geocoderStatus) {
      logger(geocoderStatus);
      switch(geocoderStatus) {
        case google.maps.GeocoderStatus.OK:
          fulfill(geocoderResult);
          break;
        case google.maps.GeocoderStatus.ZERO_RESULTS:
          fulfill(geocoderResult);
          break;
        case google.maps.GeocoderStatus.OVER_QUERY_LIMIT:
          geocodeAsync(geocoder, req).then(fulfill, reject);
          break;
        default:
          var err = new Error('Unknown geocoder status ' + geocoderStatus);
          err.geocoderStatus = geocoderStatus;
          reject(err);
          break;
      }
    });
  });
}

function logger(msg) {
  $('.logger').append(msg + '<br />');
}

google.maps.event.addDomListener(window, 'load', initialize);
