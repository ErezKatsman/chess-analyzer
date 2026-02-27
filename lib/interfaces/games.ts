// lib/interfaces/games.ts

export interface IUserGamesRes {
  games: IChessGameRes[];
}

export interface IChessGameRes {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;

  // not always present in chess.com responses
  accuracies?: {
    white: number;
    black: number;
  };

  tcn?: string;
  uuid: string;

  // not always present in chess.com responses
  initial_setup?: string;
  fen?: string;

  time_class: string;
  rules?: string;

  white: Player;
  black: Player;

  // chess.com uses an opening url string
  eco: string;
}

export interface Player {
  rating: number;
  result: string;
  '@id': string;
  username: string;
  uuid?: string;
}

export interface IGame {
  isWon: boolean;
  isDraw: boolean;
  isWhite: boolean;

  opponent: {
    name: string;
    rating: number;
    result: string;
    profile: string;
  };

  gameDetails: {
    result: string;
    fenArr: string[];
    opening: string;
    ecoUrl: string;
  };

  url: string;
  pgn: string;
  timeControl: string;
  endTime: number;
  rated: boolean;

  players: {
    white: {
      username: string;
      rating: number;
      result: string;
      profile: string;
    };
    black: {
      username: string;
      rating: number;
      result: string;
      profile: string;
    };
  };

  uuid: string;
  timeClass: string;
}
