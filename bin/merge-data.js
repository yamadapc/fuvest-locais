'use strict';
var fs = require('fs');
var path = require('path');
var ProgressBar = require('progress');
var _ = require('lodash');

var CWD = process.cwd();

if(!module.parent) {
  if(process.argv[0] === 'node') main(process.argv.slice(2));
  else main(process.argv.slice(1));
}

function main(args) {
  if(args.length < 2) {
    console.log(
      'Usage: merge-data <first-stage-people-file> <second-stage-people-file>' +
      ' <output-file>'
    );
    process.exit(1);
  }

  var results1 = require(toAbsolute(args[0]));
  var people2 = require(toAbsolute(args[1]));

  var pg = new ProgressBar(' Done with [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 80,
    total: _.size(results1),
  });

  var people1 = _.map(results1, function(person, inscricao) {
    pg.tick();
    return _.extend(person, {
      inscricao: inscricao,
      passou: _.some(people2, { inscricao: inscricao }),
    });
  });

  console.log('Writting to output file ' + args[3] + '...');
  fs.writeFileSync(toAbsolute(args[3]), JSON.stringify(people1, null, 2));
  console.log('Done!');
}

function toAbsolute(pth) {
  // Don't do anything if the path is already absolute
  if(pth[0] === '/') {
    return pth;
  } else {
    return path.join(CWD, pth);
  }
}
