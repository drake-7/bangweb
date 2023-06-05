import { Dispatch } from "react";
import { CardIdUpdate, DeckShuffledUpdate, GameString, GameUpdate, Milliseconds, MoveCardUpdate, MoveCubesUpdate, PlayerIdUpdate } from "./GameUpdate";

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

    constructor(channel: GameChannel, tableDispatch: Dispatch<GameUpdate>) {
        this.channel = channel;
        this.tableDispatch = tableDispatch;
    }

    tick(timeElapsed: Milliseconds) {
        const onEndAnimation = () => {
            if (this.updateOnEnd) {
                this.tableDispatch(this.updateOnEnd);
                this.updateOnEnd = undefined;
            }
            this.updateTimer = undefined;
        };

        if (this.updateTimer && (this.updateTimer -= timeElapsed) <= 0) {
            onEndAnimation();
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
                        onEndAnimation();
                    }
                }
            }
        }
    }

    private updateHandlers: Record<string, (update: any) => void> = {
        game_error: this.handleGameError,
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
    };

    private handleGameError(message: GameString) {
        // TODO
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
}