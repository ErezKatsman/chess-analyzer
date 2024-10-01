import { IGame } from "@/lib/interfaces/games";
import { fetchGames } from "@/lib/userUtils";
import React from "react";

interface IProps {
  searchParams: {
    userName: string;
  };
}

const UserPage = async (props: IProps) => {
  const data: IGame[] = await fetchGames(props.searchParams.userName);
  console.log(data);
  return (
    <main>
      {data.map((g: IGame) => (
        <h2 key={g.uuid}>g</h2>
      ))}
    </main>
  );
};

export default UserPage;
