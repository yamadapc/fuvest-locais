'use strict';
var cluster = require('cluster');
var fs = require('fs');
var os = require('os');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

if(cluster.isMaster) {
  setupWorkers(_.range(process.argv[2], process.argv[3]));
} else {
  process.on('message', function(grange) {
    worker(cluster.worker.id, grange);
  });
}

function setupWorkers(range) {
  var ncpus = os.cpus().length;
  var grange = groupBlocks(ncpus, range);

  for(var i = 0; i < ncpus; i++) {
    var worker = cluster.fork();
    worker.send(grange[i]);
  }
}

function groupBlocks(ncpus, range) {
  var blockSize = Math.floor(range.length / ncpus);
  var grange = [];

  for(var i = 0; i < ncpus; i++) {
    grange[i] = [];
    for(var j = 0; j < blockSize; j++) {
      grange[i].push(range[blockSize * i + j]);
    }
  }

  return grange;
}

function worker(id, range) {
  Promise.map(range, fetchPerson)
    .filter(function(a) { return a; })
    .then(function(entries) {
      console.log('Done!');
      fs.writeFileSync(
        id + '-people1.json',
        JSON.stringify(entries, null, 2)
      );
    });
}

function fetchPerson(id) {
  return request
    .get('http://www.fuvest.br/b/locexa2f.php')
    .query({
      s: id,
      anofuv: 2015
    })
    .endAsync()
    .then(function(res) {
      console.log('Finished downloading ' + id);
      return parseEntry(res.text);
    })
    .catch(function(/*err*/) {
      console.log('Failed downloading ' + id);
      return false;
    });
}

function parseEntry(html) {
  var $ = cheerio.load(html);
  var info = $('#idPageDIVContent div')
    .text()
    .split('\n')
    .slice(1, 5);

  if(/A pesquisa pelo texto abaixo n/.test(info[0])) {
    return false;
  }

  return {
    nome: info[0].split(' ').slice(1).join(' '),
    inscricao: info[0].split(' ')[0],
    cpf: info[1].split(' ')[1],
    rg: info[2].split(' ')[1],
    convocadoParaSegundaFase: !/Você n/.test(info[3]),
  };
}
