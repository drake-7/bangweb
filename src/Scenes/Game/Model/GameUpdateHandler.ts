import { Dispatch, SetStateAction } from "react";
import { CardIdUpdate, DeckShuffledUpdate, GameString, GameUpdate, Milliseconds, MoveCardUpdate, MoveCubesUpdate, MoveScenarioDeckUpdate, PlayerIdUpdate, RequestStatusArgs, StatusReadyArgs } from "./GameUpdate";
import { TargetSelectorUpdate } from "./TargetSelectorReducer";

export interface GameChannel {
  getNextUpdate: () => GameUpdate | undefined;
  sendGameAction: (messageType: string, messageValue?: any) => void;
  handleReturnLobby: () => void;
};

export class GameUpdateHandler {
    
    private channel: GameChannel;
    private updateTimer?: number;
    private updateOnEnd?: GameUpdate;

    private tableDispatch: Dispatch<GameUpdate>;
    private selectorDispatch: Dispatch<TargetSelectorUpdate>;
    private setGameLogs: Dispatch<SetStateAction<GameString[]>>;

    constructor(
        channel: GameChannel,
        tableDispatch: Dispatch<GameUpdate>,
        selectorDispatch: Dispatch<TargetSelectorUpdate>,
        setGameLogs: Dispatch<SetStateAction<GameString[]>>
    ) {
        this.channel = channel;
        this.tableDispatch = tableDispatch;
        this.selectorDispatch = selectorDispatch;
        this.setGameLogs = setGameLogs;
    }

    tick(timeElapsed: Milliseconds) {
        if (this.updateTimer && (this.updateTimer -= timeElapsed) <= 0) {
            this.onEndAnimation();
        } else {
            let update: GameUpdate | undefined;
            while (!this.updateTimer && (update = this.channel.getNextUpdate())) {
                const {updateType, updateValue} = update;

                if (updateType in this.updateHandlers) {
                    this.updateHandlers[updateType].call(this, updateValue);
                }
                this.tableDispatch({ updateType, updateValue });
                
                if (typeof(updateValue) == 'object' && 'duration' in updateValue) {
                    this.updateTimer = updateValue.duration as Milliseconds;
                    if (this.updateTimer <= 0) {
                        this.onEndAnimation();
                    }
                }
            }
        }
    }

    private onEndAnimation () {
        if (this.updateOnEnd) {
            this.tableDispatch(this.updateOnEnd);
            this.updateOnEnd = undefined;
        }
        this.updateTimer = undefined;
    }

    private updateHandlers: Record<string, (update: any) => void> = {
        game_error: this.handleGameError,
        game_log: this.handleGameLog,
        game_prompt: this.handleGamePrompt,
        play_sound: this.handlePlaySound,
        move_card: this.handleMoveCard,
        move_cubes: this.handleMoveCubes,
        deck_shuffled: this.handleDeckShuffled,
        show_card: this.handleCardAnimation,
        hide_card: this.handleCardAnimation,
        tap_card: this.handleCardAnimation,
        flash_card: this.handleCardAnimation,
        short_pause: this.handleCardAnimation,
        player_show_role: this.handlePlayerAnimation,
        player_hp: this.handlePlayerAnimation,
        move_scenario_deck: this.handleMoveScenarioDeck,
        request_status: this.handleRequestStatus,
        status_ready: this.handleRequestStatus,
        status_clear: this.handleStatusClear
    };

    private handleGameError(message: GameString) {
        // TODO
    }

    private handleGameLog(message: GameString) {
        this.setGameLogs(logs => logs.concat(message));
    }

    private handleGamePrompt(message: GameString) {
        // TODO
    }

    private handlePlaySound(sound: string) {
        // TODO
    }

    private handleMoveCard({ card, player, pocket }: MoveCardUpdate) {
        this.updateOnEnd = { updateType: 'move_card_end', updateValue: { card, player, pocket } };
    }

    private handleMoveCubes({ num_cubes, target_card }: MoveCubesUpdate) {
        this.updateOnEnd = { updateType: 'move_cubes_end', updateValue: { num_cubes, target_card } };
    }

    private handleDeckShuffled({ pocket }: DeckShuffledUpdate) {
        this.updateOnEnd = { updateType: 'deck_shuffled_end', updateValue: { pocket } };
    }

    private handleCardAnimation({ card }: CardIdUpdate) {
        this.updateOnEnd = { updateType: 'card_animation_end', updateValue: { card } };
    }

    private handlePlayerAnimation({ player }: PlayerIdUpdate) {
        this.updateOnEnd = { updateType: 'player_animation_end', updateValue: { player } };
    }

    private handleMoveScenarioDeck({ player, pocket, duration }: MoveScenarioDeckUpdate) {
        this.updateOnEnd = { updateType: 'move_scenario_deck_end', updateValue: { player, pocket, duration } };
    }

    private handleRequestStatus(status: RequestStatusArgs | StatusReadyArgs) {
        this.selectorDispatch({setRequest: status});
    }

    private handleStatusClear() {
        this.selectorDispatch({setRequest: {}});
    }
}