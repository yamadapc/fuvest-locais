'use strict';
var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

if(!module.parent) {
  main();
}

function main() {
  fetchNames()
    .then(function(entries) {
      console.log(JSON.stringify(entries, undefined, 2));
    });
}
exports.main = main;

function fetchNames() {
  return Promise
    .map(
      [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z' ],
      fetchLetter
    )
    .map(parseEntries)
    .then(_.flatten);
}
exports.fetchNames = fetchNames;

function fetchLetter(letter) {
  var url = 'http://www.fuvest.br/vest2015/listconv/cham' +
            letter.toUpperCase() + '2015.stm';

  return request
    .get(url)
    .endAsync()
    .then(function(res) {
      return res.text;
    });
}
exports.fetchLetter = fetchLetter;

function parseEntries(html) {
  var $ = cheerio.load(html);
  var entries = $('#idPageDIVContent > pre')
    .text()
    .split('\r\n')
    .slice(3, -1);

  return entries.map(parseEntry);
}
exports.parseEntries = parseEntries;

function parseEntry(entry) {
  var cpf = entry.split(' ')[0];
  var inscricao = entry.split(' ')[1];
  var nome = entry.split(' ').slice(2).join(' ');

  return {
    cpf: cpf,
    inscricao: inscricao,
    nome: nome,
  };
}
exports.parseEntry = parseEntry;
