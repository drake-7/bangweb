import { SyntheticEvent, useContext, useEffect, useState } from "react";
import { ConnectionContext } from "../../App";
import { useHandler } from "../../Messages/Connection";
import { LobbyId } from "../../Messages/ServerMessage";
import LobbyElement, { LobbyValue } from "./LobbyElement";

function WaitingArea() {
  const connection = useContext(ConnectionContext);
  const [lobbies, setLobbies] = useState<LobbyValue[]>([]);
  const [lobbyName, setLobbyName] = useState(localStorage.getItem('lobbyName'));

  useEffect(() => {
    if (lobbyName) {
      localStorage.setItem('lobbyName', lobbyName);
    } else {
      localStorage.removeItem('lobbyName');
    }
  }, [lobbyName]);

  useEffect(() => {
    connection.sendMessage({ lobby_list: {}});

    let cachedLobbyId = localStorage.getItem('lobby_id');
    if (cachedLobbyId) {
      connection.sendMessage({ lobby_join: { lobby_id: parseInt(cachedLobbyId) }});
    }
  }, []);

  useHandler(connection, {

    lobby_update: ({ lobby_id, name, num_players, state }) => {
      setLobbies(lobbies => {
        let copy = [...lobbies];
        const newLobby = { id: lobby_id, name, num_players, state };
        let index = copy.findIndex(lobby => lobby.id === lobby_id);
        if (index >= 0) {
          copy[index] = newLobby;
        } else {
          copy.push(newLobby);
        }
        return copy;
      });
    },

    lobby_removed: ({ lobby_id }) => setLobbies(lobbies => lobbies.filter((lobby) => lobby.id !== lobby_id)),

  });

  const handleDisconnect = () => {
    connection.disconnect();
  };

  const handleCreateLobby = function (event: SyntheticEvent) {
    event.preventDefault();
    if (lobbyName) {
      const gameOptions = localStorage.getItem('gameOptions');
      connection.sendMessage({ lobby_make: { name: lobbyName, options: gameOptions ? JSON.parse(gameOptions) : undefined }});
    }
  };

  const handleClickJoin = (lobby_id: LobbyId) => {
    connection.sendMessage({ lobby_join: { lobby_id }});
  };

  return (
    <div>
      <h1>Welcome To The Waiting Area</h1>
      <div>
        <button onClick={handleDisconnect}>Disconnect</button>
      </div>
      <div>
        <form onSubmit={handleCreateLobby}>
          <label htmlFor="lobbyName">Lobby Name:</label>
          <input type="text" id="lobbyName" value={lobbyName || ''} onChange={e => setLobbyName(e.target.value)}></input>
          <button type="submit">Create Lobby</button>
        </form>
      </div>
      <div>{lobbies.map((lobby) => (
        <LobbyElement key={lobby.id} lobby={lobby} onClickJoin={handleClickJoin} />
      ))}</div>
    </div>
  );
}

export default WaitingArea;
