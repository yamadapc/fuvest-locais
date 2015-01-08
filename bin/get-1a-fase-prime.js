'use strict';
var fs = require('fs');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var colors = require('colors');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

var ALPHABET = _.map(_.range(97, 123), function(n) {
    return String.fromCharCode(n);
});

var completeResults = {};
var pendingRequests = {};

var persistInterval = setInterval(function() {
  console.log(
    '[PERSISTING]'.yellow +
    ' Writing results to disk (total = ' + _.size(completeResults) +
    ', pending = ' + _.size(pendingRequests) + ')'
  );

  try {
    fs.writeFileSync('results.json', JSON.stringify(completeResults, null, 2));
    fs.writeFileSync('pending-requests.json', JSON.stringify(pendingRequests, null, 2));
  } catch(err) {
    console.log('[ERROR]'.red + err.message);
  }
}, 10000);

getAllPeople('', 141888)
  .then(function(/*results*/) {
    console.log('DONE'.green);
    clearTimeout(persistInterval);
    fs.writeFileSync('results.json', JSON.stringify(completeResults, null, 2));
    process.exit(0);
  });

function getAllPeople(startPrefix/*, knownLimit */) {
  return Promise.map(ALPHABET, function(c) {
    var query = startPrefix + c;
    return makeQuery(query)
      .catch(handleError.bind(null, query));
  });

  function handleError(query, err) {
    console.log('[ERROR] '.red + err.message);
    if(err.overflowingResults) {
      return getAllPeople(query, err.overflowingResults);
    }

    console.log('[RETRY] '.blue + 'Retrying query ' + query);
    return makeQuery(query).catch(handleError.bind(null, query));
  }
}

function makeQuery(q) {
  if(_.size(pendingRequests) > 50) {
    console.log('[WAITING] '.yellow + 'More than 50 requests are pending; waiting 10s');
    return wait(10000).then(function() {
      return makeQuery(q);
    });
  }
  pendingRequests[q] = true;

  return request
    .get('http://www.fuvest.br/b/locexa2f.php')
    .query({
      s: q,
      anofuv: 2015
    })
    .timeout(50000)
    .endAsync()
    .then(
      function(res) {
        delete pendingRequests[q];
        console.log('[HTTP]'.magenta + ' http://www.fuvest.br/b/locexa2f.php?s=' + q);
        return parseResponse(q, res.text);
      },
      function(err) {
        delete pendingRequests[q];
        throw err;
      }
    );
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
    '[SUCCESS] '.green + parsedResults.length + ' results at ' + q +
    ' (total = ' + _.size(completeResults) + ')'
  );

  return parsedResults;
}

function wait(timeout) {
  return new Promise(function(fulfill) {
    setTimeout(function() {
      fulfill();
    }, timeout);
  });
}
