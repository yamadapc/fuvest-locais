'use strict';
var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

Promise.map(_.range(1000008, 7994049), fetchPerson)
  .map(parseEntry)
  .then(function(entries) {
    console.log(JSON.stringify(entries, null, 2));
  });

function fetchPerson(id) {
  console.log('Started downloading ' + id);
  return request
    .get('http://www.fuvest.br/b/locexa2f.php')
    .query({
      s: id,
      anofuv: 2015
    })
    .endAsync()
    .then(function(res) {
      console.log('Finished downloading ' + id);
      return res.text;
    });
}

function parseEntry(html) {
  var $ = cheerio.load(html);
  var info = $('#idPageDIVContent div')
    .text()
    .split('\n')
    .slice(1, 5);

  return {
    nome: info[0].split(' ')[1],
    inscricao: info[0].split(' ')[0],
    cpf: info[1].split(' ')[1],
    rg: info[2].split(' ')[1],
    convocadoParaSegundaFase: /Você não foi convocado/.test(info[3]),
  };
}
