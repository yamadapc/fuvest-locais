'use strict'; /* global describe, it */
var should = require('should');
var get2aFase = require('../bin/get-2a-fase');

describe('get-2a-fase', function() {
  describe('parseEntry(entry)', function() {
    it('gets exposed', function() {
      should.exist(get2aFase.parseEntry);
    });

    it('parses out applicant information from input lines', function() {
      get2aFase.parseEntry('426.192... 6396060 OCTAVIO DA MOTTA').should.eql({
        nome: 'OCTAVIO DA MOTTA',
        inscricao: '6396060',
        cpf: '426.192...',
      });

      get2aFase.parseEntry('463.986... 3379471 OTAVIO RUI VIEIRA').should.eql({
        nome: 'OTAVIO RUI VIEIRA',
        inscricao: '3379471',
        cpf: '463.986...',
      });
    });
  });
});
