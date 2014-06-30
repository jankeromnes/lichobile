'use strict';


var Game = require('./game'),
  Qajax = require('qajax'),
  render = require('./render'),
  storage = require('./storage'),
  StrongSocket = require('./socket');

var ground, game, socket;

var onMove = function(from, to) {
  socket.send('move', { from: from, to: to });
};

ground = render.ground({movable: { events: { after: onMove }}});

function startGame() {

  if (game) {
    game.stopClocks();
    game = undefined;
  }
  if (socket) socket = undefined;
  if (ground.getOrientation() === 'black') ground.toggleOrientation();
  ground.startPos();

  Qajax({
    headers: { 'Accept': 'application/vnd.lichess.v1+json', 'X-Requested-With': 'XMLHttpRequest' },
    url: window.apiEndPoint + '/setup/ai',
    method: 'POST',
    data: {
      variant: storage.get('settings.variant'),
      clock: storage.get('settings.clock'),
      time: storage.get('settings.time'),
      increment: storage.get('settings.increment'),
      level: storage.get('settings.aiLevel'),
      color: storage.get('settings.color')
    }
  }).then(Qajax.filterSuccess).then(Qajax.toJSON).done(function(data) {
    game = Game(data);
    var clockEls;

    socket = new StrongSocket(
      data.url.socket,
      data.player.version,
      {
        options: { debug: true },
        events: {
          possibleMoves: function(e) {
            game.setPossibleMoves(e);
            ground.setDests(game.getPossibleMoves());
          },
          move: function(e) {
            if (game.isOpponentToMove(e.color)) {
              ground.move(e.from, e.to);
            }
          },
          promotion: function(e) {
            var pieces = {};
            pieces[e.key] = { color: game.lastPlayer(), role: 'queen'};
            ground.setPieces(pieces);
          },
          enpassant: function(e) {
            var pieces = {};
            pieces[e] = null;

            ground.setPieces(pieces);
          },
          // check: function(e) {
          // },
          clock: function(e) {
            game.updateClocks(e);
          },
          end: function() {
            console.log('game finished');
            game.finish();
          },
          state: function(e) {
            game.updateState(e);
            ground.setColor(game.currentPlayer());
          },
          castling: function(e) {
            var pieces = {};
            var pos = ground.getPosition();
            pieces[e.rook[0]] = null;
            pieces[e.rook[1]] = pos[e.rook[0]];
            ground.setPieces(pieces);
          }
        }
      }
    );

    if (game.hasClock()) {
      clockEls = render.clocks();
      game.setClocks(clockEls.top, clockEls.bot);
    }

    if (game.getFen()) {
      ground.setFen(game.getFen());
    }

    ground.setDests(game.getPossibleMoves());
    ground.setColor(game.currentPlayer());

    if (game.currentPlayer() === 'black') {
      ground.toggleOrientation();
      ground.move(game.lastMove().from, game.lastMove().to);
    }

    if (game.hasClock()) game.startClock();


  }, function(err) {
    console.log('post request to lichess failed', err);
  });

}

module.exports = startGame;