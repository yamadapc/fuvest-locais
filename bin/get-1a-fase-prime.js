'use strict';
var fs = require('fs');
var os = require('os');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

var ALPHABET = _.map(_.range(97, 123), function(n) {
    return String.fromCharCode(n);
});

var completeResults = {};

setInterval(function() {
  console.log('[PERSISTING] Writing results to disk');
  fs.appendFileSync('results.json', JSON.stringify(completeResults, null, 2));
}, 1000);

getAllPeople('', 141888)
  .then(function(results) {
    console.log(results);
  });

function getAllPeople(startPrefix, knownLimit) {
  return Promise.map(ALPHABET, function(c) {
    var query = startPrefix + c;
    return makeQuery(query)
      .catch(function(err) {
        if(err.overflowingResults) {
          return getAllPeople(query, err.overflowingResults);
        }
      });
  });
}

function makeQuery(q) {
  return request
    .get('http://www.fuvest.br/b/locexa2f.php')
    .query({
      s: q,
      anofuv: 2015
    })
    .endAsync()
    .then(function(res) {
      console.log('[HTTP] http://www.fuvest.br/b/locexa2f.php?s=' + q);
      return parseResponse(q, res.text);
    });
}

function parseResponse(q, html) {
  var $ = cheerio.load(html);
  var info = $('#idPageDIVContent div').text();

  // When we beat the limit
  var m = info.match(new RegExp(
    'Foram encontrados (\\d+) resultados:\n' +
    'O limite para a pesquisa . de 2000 nomes.')
  );
  if(m) {
    var err = new Error(m[1] + ' overflowing results at ' + q);
    err.overflowingResults = parseFloat(m[1]);
    throw err;
  }

  var results = _.first(info.split('\n').slice(2), function(i) {
    return i !== '';
  });

  var parsedResults = _.map(results, function(i) {
    var si = i.split(' ');
    return {
      inscricao: si[0],
      nome: si.slice(1).join(' '),
    };
  });

  completeResults = _.reduce(parsedResults, function(m, i) {
    m[i.inscricao] = i.nome;
    return m;
  }, completeResults);

  console.log(
    '[SUCCESS] ' + parsedResults.length + ' results at ' + q +
    ' (total = ' + _.size(completeResults) + ')'
  );

  return parsedResults;
}
