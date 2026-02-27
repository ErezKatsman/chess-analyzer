// lib/mappers/chesscom.ts
import type { IChessGameRes, IGame } from '../interfaces/games';
import { getFenArrayFromPgn } from '../chess/pgn';

type PlayerColor = 'white' | 'black';

function normalizeUsername(userName: string): string {
  return userName.trim().toLowerCase();
}

function getOpeningFromEcoUrl(ecoUrl?: string): string {
  if (!ecoUrl) return '';
  const last = ecoUrl.split('/').filter(Boolean).pop();
  return last ? last.replace(/-/g, ' ') : '';
}

function getWinnerColor(game: IChessGameRes): PlayerColor | null {
  if (game.white?.result === 'win') return 'white';
  if (game.black?.result === 'win') return 'black';
  return null;
}

function buildResultText(game: IChessGameRes): string {
  const winnerColor = getWinnerColor(game);

  if (!winnerColor) {
    const whiteResult = game.white?.result ?? 'unknown';
    const blackResult = game.black?.result ?? 'unknown';

    return `Draw (${whiteResult} / ${blackResult})`;
  }

  const loserColor: PlayerColor = winnerColor === 'white' ? 'black' : 'white';
  const winnerName = game[winnerColor]?.username ?? 'unknown';
  const loserReason = game[loserColor]?.result ?? 'unknown';

  return `${winnerName} won by ${loserReason}`;
}

export function transformChessComGames(games: IChessGameRes[], userName: string): IGame[] {
  const normalizedUserName = normalizeUsername(userName);

  return games
    .map((game) => {
      const uuid = game.uuid ?? '';
      if (!uuid) return null;

      const whiteName = (game.white?.username ?? '').toLowerCase();
      const isWhite = whiteName === normalizedUserName;

      const userColor: PlayerColor = isWhite ? 'white' : 'black';
      const opponentColor: PlayerColor = isWhite ? 'black' : 'white';

      const winnerColor = getWinnerColor(game);
      const isWon = winnerColor ? winnerColor === userColor : false;
      const isDraw = winnerColor === null;

      const opponentPlayer = game[opponentColor];
      const ecoUrl = game.eco ?? '';
      const opening = getOpeningFromEcoUrl(ecoUrl);

      let fenArr: string[] = [];
      try {
        fenArr = getFenArrayFromPgn(game.pgn, { includeInitial: true });
      } catch {
        fenArr = [];
      }

      if (fenArr.length === 0) return null;

      return {
        isWon,
        isDraw,
        isWhite,
        opponent: {
          name: opponentPlayer?.username ?? 'unknown',
          rating: opponentPlayer?.rating ?? 0,
          result: opponentPlayer?.result ?? 'unknown',
          profile: opponentPlayer?.['@id'] ?? '',
        },
        gameDetails: {
          result: buildResultText(game),
          fenArr,
          opening,
          ecoUrl,
        },
        url: game.url ?? '',
        pgn: game.pgn ?? '',
        timeControl: game.time_control ?? '',
        endTime: game.end_time ?? 0,
        rated: Boolean(game.rated),
        players: {
          white: {
            username: game.white?.username ?? 'unknown',
            rating: game.white?.rating ?? 0,
            result: game.white?.result ?? 'unknown',
            profile: game.white?.['@id'] ?? '',
          },
          black: {
            username: game.black?.username ?? 'unknown',
            rating: game.black?.rating ?? 0,
            result: game.black?.result ?? 'unknown',
            profile: game.black?.['@id'] ?? '',
          },
        },
        uuid,
        timeClass: game.time_class ?? '',
      };
    })
    .filter((g): g is IGame => Boolean(g));
}
