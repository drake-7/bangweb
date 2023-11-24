import { createContext, useEffect, useState } from 'react';
import './App.css';
import Header from './Components/Header';
import getLabel from './Locale/GetLabel';
import { Connection, useHandler, useSocketConnection } from './Messages/Connection';
import { UserInfo } from './Messages/ServerMessage';
import { useSettings } from './Model/AppSettings';
import Env from './Model/Env';
import CurrentScene, { SceneType } from './Scenes/CurrentScene';
import { ImageSrc, serializeImage } from './Utils/ImageSerial';

export const ConnectionContext = createContext<Connection>({
  isConnected: () => false,
  isLocked: () => true,
  setLocked: () => {},
  connect: () => {},
  disconnect: () => {},
  addHandler: () => {},
  removeHandler: () => {},
  sendMessage: () => {},
});

export async function makeUserInfo (username?: string, propic?: ImageSrc): Promise<UserInfo> {
  return {
    name: username ?? '',
    profile_image: await serializeImage(propic, 50)
  };
}

export default function App() {
  const [scene, setScene] = useState<SceneType>({ type: 'connect' });
  const settings = useSettings();
  
  const connection = useSocketConnection();

  useEffect(() => {
    if (settings.myUserId && !connection.isConnected()) {
      connection.connect();
    }
  }, []);

  useHandler(connection, {

    connected: async () => {
      connection.sendMessage({connect: {
        user: await makeUserInfo(settings.username, settings.propic),
        user_id: settings.myUserId,
        commit_hash: Env.commitHash
      }});
    },

    client_accepted: ({ user_id }) => {
      if (settings.myLobbyId) {
        connection.sendMessage({ lobby_join: { lobby_id: settings.myLobbyId }});
      }
      settings.setMyUserId(user_id);
      connection.setLocked(true);
      setScene({ type: 'waiting_area' });
    },

    disconnected: () => {
      setScene({ type: 'connect' });
    },

    ping: () => {
      connection.sendMessage({ pong: {} });
    },

    lobby_error: message => console.error('Lobby error: ', getLabel('lobby', message)),

    lobby_remove_user: ({ user_id }) => {
      if (user_id === settings.myUserId) {
        settings.setMyLobbyId(undefined);
        connection.setLocked(true);
        setScene({ type: 'waiting_area' });
      }
    },
    
    lobby_entered: ({ lobby_id, name, options }) => {
      if (scene.type != 'lobby' || (settings.myLobbyId != lobby_id)) {
        connection.setLocked(true);
        settings.setMyLobbyId(lobby_id);
        setScene({ type: 'lobby', lobbyInfo: { name, options } });
      }
    },

    lobby_edited: lobbyInfo => {
      if (scene.type == 'lobby') {
        setScene({ type: 'lobby', lobbyInfo });
      }
    }

  }, [settings, scene]);

  return (
    <div className="flex flex-col min-h-screen">
      <ConnectionContext.Provider value={connection}>
        <Header scene={scene} settings={settings} />
        <div className="current-scene">
          <CurrentScene scene={scene} setScene={setScene} settings={settings} />
        </div>
      </ConnectionContext.Provider>
    </div>
  );
}