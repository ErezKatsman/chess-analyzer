export const fetchGames = async (userName: string) => {
  const res = await fetch(
    `https://api.chess.com/pub/player/${userName}/games/2024/09`
  );
  const data = await res.json();
  return data;
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
