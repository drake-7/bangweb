import { CSSProperties } from "react";
import { CardId, Milliseconds } from "../../Messages/GameUpdate";
import { getRectCenter } from "../../Utils/Rect";
import CardView from "./CardView";
import { GameTable, getCard, newPocketRef } from "./Model/GameTable";
import { CardTracker } from "./PocketView";
import "./Style/DeckShuffleAnimation.css";
import { isMobileDevice } from "../../Utils/MobileCheck";

export interface DeckShuffleProps {
    tracker: CardTracker;
    table: GameTable;
    cards: CardId[];
    pocket: 'main_deck' | 'shop_deck';
    duration: Milliseconds;
}

const MAX_CARDS = isMobileDevice() ? 10 : 0;

export default function DeckShuffleAnimation({ tracker, table, pocket, cards, duration }: DeckShuffleProps) {
    const fromPocket = pocket === 'main_deck' ? 'discard_pile' : 'shop_discard';

    const startRect = tracker.getPocketPosition(newPocketRef(fromPocket))?.getPocketRect();
    const endRect = tracker.getPocketPosition(newPocketRef(pocket))?.getPocketRect();

    if (startRect && endRect) {
        cards = cards.slice(-MAX_CARDS);

        const startPoint = getRectCenter(startRect);
        const endPoint = getRectCenter(endRect);

        const style = {
            '--startX': startPoint.x + 'px',
            '--startY': startPoint.y + 'px',
            '--diffX': (endPoint.x - startPoint.x) + 'px',
            '--diffY': (endPoint.y - startPoint.y) + 'px',
            '--duration': duration + 'ms',
            '--num-cards': cards.length
        } as CSSProperties;

        const cardIndexStyle = (index: number) => {
            return {
                '--card-index': index
            } as CSSProperties;
        };

        return (
            <div className="deck-shuffle-animation" style={style}>
                {cards.map((id, index) => (
                    <div key={id} className="deck-shuffle-animation-inner" style={cardIndexStyle(cards.length - index - 1)}>
                        <div className="move-top-left-half">
                            <CardView card={getCard(table, id)} showBackface />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return null;
}