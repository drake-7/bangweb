import { RefObject, createContext, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import useEvent from "react-use-event-hook";
import { LobbyState } from "../../Model/SceneState";
import { UserId } from "../../Model/ServerMessage";
import { BangConnection, GameChannel } from "../../Model/UseBangConnection";
import { isMobileDevice } from "../../Utils/MobileCheck";
import { getDivRect } from "../../Utils/Rect";
import useEventConditional from "../../Utils/UseEventConditional";
import { MapRef, useMapRef } from "../../Utils/UseMapRef";
import { LobbyContext, getUser } from "../Lobby/Lobby";
import AnimationView from "./Animations/AnimationView";
import CardChoiceView from "./CardChoiceView";
import CardOverlayView from "./CardOverlayView";
import { SPRITE_CUBE } from "./CardView";
import GameLogView from "./GameLogView";
import { PocketType } from "./Model/CardEnums";
import { useCardOverlayState } from "./Model/CardOverlayTracker";
import { CardTracker, PlayerRef, PocketRef } from "./Model/CardTracker";
import { Card, Player, PocketId, getPlayer, newGameTable } from "./Model/GameTable";
import { PlayerId } from "./Model/GameUpdate";
import { selectorCanConfirm, selectorCanUndo } from "./Model/TargetSelector";
import { handleClickCard, handleClickPlayer, handleSendGameAction } from "./Model/TargetSelectorManager";
import useGameState from "./Model/UseGameState";
import PlayerSlotView from "./PlayerSlotView";
import PlayerView from "./PlayerView";
import PocketView from "./Pockets/PocketView";
import StackPocket from "./Pockets/StackPocket";
import StationsView from "./Pockets/StationsView";
import TrainView from "./Pockets/TrainView";
import PromptView from "./PromptView";
import StatusBar from "./StatusBar";
import "./Style/GameScene.css";
import "./Style/PlayerGridDesktop.css";
import "./Style/PlayerGridMobile.css";

export interface GameProps {
  myUserId?: UserId;
  connection: BangConnection;
  lobbyState: LobbyState;
  gameChannel: GameChannel;
  overlayRef: RefObject<HTMLDivElement>;
}

const EMPTY_TABLE = newGameTable();
export const GameTableContext = createContext(EMPTY_TABLE);

function useCardTracker(playerRefs: MapRef<PlayerId, PlayerRef>, pocketRefs: MapRef<PocketType, PocketRef>, cubesRef: RefObject<HTMLDivElement>): CardTracker {
  return useMemo(() => ({
    getPlayerPockets(player: PlayerId) {
      return playerRefs.get(player);
    },

    getTablePocket(pocket: PocketId) {
      if (!pocket) {
        return null;
      } else if ('player' in pocket) {
        return this.getPlayerPockets(pocket.player)?.getPocket(pocket.name) ?? null;
      } else {
        return pocketRefs.get(pocket.name);
      }
    },

    getCubesRect(card: Card | null) {
      if (card) {
        return this.getTablePocket(card.pocket)?.getCardRect(card.id) ?? null;
      } else {
        return cubesRef.current ? getDivRect(cubesRef.current) : null;
      }
    }
  }), [playerRefs, pocketRefs, cubesRef]);
}

export default function GameScene({ myUserId, connection, lobbyState, gameChannel, overlayRef }: GameProps) {
  const { table, selectorDispatch, gameLogs, gameError, clearGameError } = useGameState(gameChannel, myUserId);

  const pocketRefs = useMapRef<PocketType, PocketRef>();
  const playerRefs = useMapRef<PlayerId, PlayerRef>();
  const cubesRef = useRef<HTMLDivElement>(null);

  const isGameOver = table.status.flags.includes('game_over');
  
  const handleReturnLobby = useEvent(() => connection.sendMessage({ lobby_return: {} }));

  const setRef = (pocket: PocketType) => {
    return (value: PocketRef | null) => {
      pocketRefs.set(pocket, value);
    };
  };

  const tracker = useCardTracker(playerRefs, pocketRefs, cubesRef);
  const { overlayId, cardOverlayTracker } = useCardOverlayState();

  const clickIsAllowed = !isGameOver
    && table.self_player !== undefined
    && table.selector.selection.mode !== 'finish'
    && table.selector.prompt.type === 'none';
  
  const onClickCard = useEventConditional(clickIsAllowed, (card: Card) => handleClickCard(table, selectorDispatch, card));
  const onClickPlayer = useEventConditional(clickIsAllowed, (player: Player) => handleClickPlayer(table, selectorDispatch, player));
  const handleConfirm = useEventConditional(clickIsAllowed && selectorCanConfirm(table), () => selectorDispatch({ confirmPlay: {} }));
  const handleUndo = useEventConditional(clickIsAllowed && selectorCanUndo(table), () => selectorDispatch({ undoSelection: {} }));

  const gameActionSent = useRef(false);
  useEffect(() => {
    if (gameActionSent.current) {
      gameActionSent.current = false;
    } else {
      handleSendGameAction(table.selector, action => {
        connection.sendMessage({ game_action: action });
        gameActionSent.current = true;
      });
    }
  }, [table.selector, connection]);

  const shopPockets = (table.pockets.shop_deck.length !== 0 || table.pockets.shop_selection.length !== 0) && (
    <div className="pocket-group relative">
      <div className="absolute">
        <StackPocket pocketRef={setRef('shop_discard')} cards={table.pockets.shop_discard} />
      </div>
      <StackPocket showCount pocketRef={setRef('shop_deck')} cards={table.pockets.shop_deck} />
      <PocketView
        pocketRef={setRef('shop_selection')}
        cards={table.pockets.shop_selection.slice(0).reverse()}
        onClickCard={onClickCard}
        cardOverlayTracker={cardOverlayTracker} />
    </div>
  );

  const trainPockets = (table.pockets.stations.length !== 0 || table.pockets.train_deck.length !== 0) && (
    <div className="train-row">
      <div className="train-row-inner">
        <StackPocket showCount pocketRef={setRef('train_deck')} cards={table.pockets.train_deck} />
        <div className="train-stations-container">
          <StationsView
            pocketRef={setRef('stations')}
            cards={table.pockets.stations}
            onClickCard={onClickCard}
            cardOverlayTracker={cardOverlayTracker} />
          <TrainView
            pocketRef={setRef('train')}
            onClickCard={onClickCard}
            cardOverlayTracker={cardOverlayTracker} />
        </div>
      </div>
    </div>
  );

  const tableCubes = <div className='table-cubes' ref={cubesRef}>
    {table.status.num_cubes > 0 && <>
      <img src={SPRITE_CUBE} alt="" />
      <div>x{table.status.num_cubes}</div>
    </>}
  </div>;

  const mainDeck = (table.pockets.discard_pile.length !== 0 || table.pockets.main_deck.length !== 0 || table.animation) &&
    <div className="pocket-group">
      <StackPocket slice={10}
        pocketRef={setRef('discard_pile')}
        cards={table.pockets.discard_pile}
        onClickCard={onClickCard}
        cardOverlayTracker={cardOverlayTracker} />
      <StackPocket showCount
        pocketRef={setRef('main_deck')}
        cards={table.pockets.main_deck}
        onClickCard={onClickCard}
        cardOverlayTracker={cardOverlayTracker} />
    </div>;

  const scenarioCards =
    (table.pockets.scenario_deck.length !== 0 || table.pockets.scenario_card.length !== 0
      || table.pockets.wws_scenario_deck.length !== 0 || table.pockets.wws_scenario_card.length !== 0)
    && <div className="pocket-group">
      {(table.pockets.scenario_deck.length !== 0 || table.pockets.scenario_card.length !== 0) && <>
        <div className="inline-block card-faded">
          <StackPocket slice={2} showCount
            pocketRef={setRef('scenario_deck')}
            cards={table.pockets.scenario_deck}
            cardOverlayTracker={cardOverlayTracker} />
        </div>
        <StackPocket slice={2}
          pocketRef={setRef('scenario_card')}
          cards={table.pockets.scenario_card}
          onClickCard={onClickCard}
          cardOverlayTracker={cardOverlayTracker} />
      </>}
      {(table.pockets.wws_scenario_deck.length !== 0 || table.pockets.wws_scenario_card.length !== 0) && <>
        <StackPocket slice={2} showCount
          pocketRef={setRef('wws_scenario_deck')}
          cards={table.pockets.wws_scenario_deck} />
        <StackPocket slice={2}
          pocketRef={setRef('wws_scenario_card')}
          cards={table.pockets.wws_scenario_card}
          onClickCard={onClickCard}
          cardOverlayTracker={cardOverlayTracker} />
      </>}
    </div>;

  const selectionPocket = table.pockets.selection.length !== 0 && (
    <div className="selection-view whitespace-nowrap">
      <PocketView
        pocketRef={setRef('selection')}
        cards={table.pockets.selection}
        onClickCard={onClickCard}
        cardOverlayTracker={cardOverlayTracker} />
    </div>
  );

  const movingPlayers = (table.animation && 'move_players' in table.animation) ?
    table.animation.move_players.players.map(p => p.from) : [];

  const playerViews = table.alive_players.map((player_id, index) => {
    const player = getPlayer(table, player_id);
    const user = getUser(lobbyState.users, player.userid);

    return <div key={player_id} className="player-grid-item" player-index={index}>
      {movingPlayers.includes(player_id)
        ? <PlayerSlotView playerRef={value => playerRefs.set(player_id, value)} />
        : <PlayerView playerRef={value => playerRefs.set(player_id, value)} user={user} player={player}
          onClickPlayer={onClickPlayer} onClickCard={onClickCard} cardOverlayTracker={cardOverlayTracker} />}
    </div>;
  });

  return <LobbyContext.Provider value={lobbyState}>
    <GameTableContext.Provider value={table}>
      <div className="game-scene">
        <div className="main-deck-row">
          <div>
            {shopPockets}{tableCubes}{mainDeck}{scenarioCards}
          </div>
          {trainPockets}
        </div>
        <div className="player-grid" num-players={table.alive_players.length}>
          {playerViews}
        </div>
        {selectionPocket}
        <PromptView prompt={table.selector.prompt} selectorDispatch={selectorDispatch} />
        <CardChoiceView tracker={tracker}
          onClickCard={onClickCard}
          pocketRef={setRef('hidden_deck')}
          cardOverlayTracker={cardOverlayTracker} />
        <AnimationView tracker={tracker} />
        <StatusBar
          myUserId={myUserId}
          gameError={gameError}
          handleClearGameError={clearGameError}
          handleReturnLobby={handleReturnLobby}
          handleConfirm={handleConfirm}
          handleUndo={handleUndo}
          onClickCard={onClickCard}
        />
        { isMobileDevice() || <CardOverlayView tracker={tracker} overlayId={overlayId} /> }
      </div>
      { overlayRef.current && createPortal(<GameLogView logs={gameLogs} />, overlayRef.current) }
    </GameTableContext.Provider>
  </LobbyContext.Provider>;
}