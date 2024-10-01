export interface IUserGamesRes {
  games: IChessGameRes[];
}

export interface IChessGameRes {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  accuracies: {
    white: number;
    black: number;
  };
  tcn: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: Player;
  black: Player;
  eco: string;
}

interface Player {
  rating: number;
  result: string;
  "@id": string;
  username: string;
  uuid: string;
}

export interface IGame {
  isWon: boolean;
  isWhite: boolean;
  opponent: {
    name: string;
    rating: number;
    result: string;
    profile: string;
  };
  gameDetails: {
    result: string;
    fenArr: string[]; // This array appears empty, but it's likely used for storing FEN strings
    opening: string | undefined;
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
