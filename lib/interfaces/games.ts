export interface IUserGames {
  games: IChessGame[];
}

export interface IChessGame {
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
