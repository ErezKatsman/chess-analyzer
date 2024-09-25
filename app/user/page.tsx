import { IChessGame, IUserGames } from "@/lib/interfaces/games";
import { fetchGames } from "@/lib/userUtils";
import React from "react";

interface IProps {
  searchParams: {
    userName: string;
  };
}

const UserPage = async (props: IProps) => {
  const data: IUserGames = await fetchGames(props.searchParams.userName);
  return (
    <main>
      {data.games.map((g: IChessGame) => (
        <h2 key={g.uuid}>{g.fen}</h2>
      ))}
    </main>
  );
};

export default UserPage;
