/** @jsx m */
import utils from '../../../utils';
import helper from '../../helper';
import widgets from '../../widget/common';
import layout from '../../layout';
import gameApi from '../../../lichess/game';
import i18n from '../../../i18n';
import gameStatus from '../../../lichess/status';
import xhr from '../../../xhr';
const moment = window.moment;

export default function view(ctrl) {
  const header = utils.partialf(widgets.header, null,
    widgets.backButton(ctrl.user().username + ' games')
  );

  function renderBody() {
    return (
      <div className="userGamesWrapper">
        <div className="select_input select_games_filter">
          <label htmlFor="filterGames"></label>
          <select id="filterGames" onchange={ctrl.onFilterChange}>
            {ctrl.availableFilters().map(f => {
              return (
                <option value={f.key} selected={ctrl.currentFilter() === f.key}>
                  {utils.capitalize(i18n(f.label).replace('%s ', ''))} ({f.count})
                </option>
              );
            })}
          </select>
        </div>
        {renderAllGames(ctrl)}
      </div>
    );
  }

  return layout.free(header, renderBody, widgets.empty, widgets.empty);
}

function renderAllGames(ctrl) {
  return (
    <div className="scroller games" config={ctrl.scrollerConfig}>
      <ul className="userGames">
        { ctrl.games().map((g, i) => renderGame(ctrl, g, i, ctrl.userId)) }
        {helper.cond(ctrl.isLoadingNextPage(),
        <li className="list_item loadingNext">loading...</li>
        )}
      </ul>
    </div>
  );
}

function bookmarkAction(ctrl, id, index) {
  const longAction = () => window.plugins.toast.show(i18n('bookmarkThisGame'), 'short', 'top');
  return helper.ontouchY(() => {
    xhr.toggleGameBookmark(id).then(() => {
      ctrl.toggleBookmark(index);
    }, err => utils.handleXhrError(err));
  }, longAction);
}

function renderGame(ctrl, g, index, userId) {
  const wideScreen = helper.isWideScreen();
  const time = gameApi.time(g);
  const mode = g.rated ? i18n('rated') : i18n('casual');
  const title = time + ' • ' + g.variant.name + ' • ' + mode;
  const date = moment(g.timestamp).calendar();
  const status = gameStatus.toLabel(g.status.name, g.winner, g.variant.key) +
    (g.winner ? '. ' + i18n(g.winner === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '');
  const icon = utils.gameIcon(g.perf) || '';
  const userColor = g.players.white.userId === userId ? 'white' : 'black';
  const evenOrOdd = index % 2 === 0 ? 'even' : 'odd';
  const star = g.bookmarked ? 't' : 's';

  return (
    <li className={`list_item bglight userGame ${evenOrOdd}`}>
      <button className="iconStar" data-icon={star} config={bookmarkAction(ctrl, g.id, index)} />
      <div className="nav" config={helper.ontouchY(() => m.route(`/game/${g.id}/${userColor}`))}>
        <span className="iconGame" data-icon={icon} />
        {wideScreen ? helper.viewOnlyBoard(g.fen, g.lastMove, userColor) : null}
        <div className="infos">
          <div className="title">{title}</div>
          <small className="date">{date}</small>
          <div className="players">
            {renderPlayer(g.players, 'white')}
            <div className="swords" data-icon="U" />
            {renderPlayer(g.players, 'black')}
          </div>
          <div className={helper.classSet({
            status: true,
            win: userColor === g.winner,
            loose: g.winner && userColor !== g.winner
          })}>{status}</div>
          {g.opening ?
          <div className="opening">{g.opening.name}</div> : null
          }
        </div>
      </div>
    </li>
  );
}

function renderPlayer(players, color) {
  let player = players[color];
  let playerName;
  if (player.userId) playerName = player.userId;
  else if (player.aiLevel) playerName = utils.aiName(player.aiLevel);
  else playerName = 'Anonymous';

  return (
    <div className={'player ' + color}>
      <span className="playerName">{playerName}</span>
      <br/>
      {helper.cond(player.rating,
      <small className="playerRating">{player.rating}</small>
      )}
    </div>
  );
}

