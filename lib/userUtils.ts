import { IChessGameRes, IGame, IUserGamesRes } from "./interfaces/games";

export const fetchGames = async (userName: string) => {
  const res = await fetch(
    `https://api.chess.com/pub/player/${userName}/games/2024/09`
  );
  const data: IUserGamesRes = await res.json();
  return transformData(data.games, userName);
};

export const checkAndSetUserExist = async (
  setIsClickable: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  userName: string
) => {
  const res = await fetch(`https://api.chess.com/pub/player/${userName}`);

  if (res.ok) {
    const data = await res.json();
    if (data && data.player_id) {
      setIsClickable(true);
      setError(null);
    } else {
      setIsClickable(false);
      setError("User not found. Please try again.");
    }
  } else {
    setIsClickable(false);
    setError("User not found. Please try again.");
  }
};

const transformData = (data: IChessGameRes[], userName: string): IGame[] => {
  const tranformed = data.map((game: IChessGameRes) => {
    const isWhite = game.white.username === userName;

    const config: {
      userColor: "white" | "black";
      opponentColor: "white" | "black";
      colorsWin: "white" | "black";
      colorsLose: "white" | "black";
    } = {
      userColor: isWhite ? "white" : "black",
      opponentColor: !isWhite ? "white" : "black",
      colorsWin: game.white.result === "win" ? "white" : "black",
      colorsLose: game.black.result === "win" ? "white" : "black",
    };

    const isWon = game[config.userColor].result === "win" ? true : false;

    const opponent = {
      name: game[config.opponentColor].username,
      rating: game[config.opponentColor].rating,
      result: game[config.opponentColor].result,
      profile: game[config.opponentColor]["@id"],
    };

    const gameDetails = {
      result: `${game[config.colorsWin].username} won by ${
        game[config.colorsLose].result
      }`,
      fenArr: [],
      opening: game.eco.split("/").pop()?.replace(/-/g, " "),
      ecoUrl: game.eco,
    };

    return {
      isWon,
      isWhite,
      opponent,
      gameDetails,
      url: game.url,
      pgn: game.pgn, // TODO: make pgn `1. e4 e5 2. Nf3 Nc6 ... 1-0`
      timeControl: game.time_control, // ? check meanining
      endTime: game.end_time,
      rated: game.rated, // ? check meanining
      players: {
        white: {
          username: game.white.username,
          rating: game.white.rating,
          result: game.white.result,
          profile: game.white["@id"],
        },
        black: {
          username: game.black.username,
          rating: game.black.rating,
          result: game.black.result,
          profile: game.black["@id"],
        },
      },
      uuid: game.uuid,
      timeClass: game.time_class,
    };
  });
  return tranformed;
};
