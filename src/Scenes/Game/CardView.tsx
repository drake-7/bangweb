import { CSSProperties, Ref, useContext, useImperativeHandle, useMemo, useRef } from "react";
import { getDivRect } from "../../Utils/Rect";
import CardSignView from "./CardSignView";
import { GameTableContext } from "./GameScene";
import { getLocalizedCardName } from "./GameStringComponent";
import { CardRef } from "./Model/CardTracker";
import { Card, CardImage, GameTable, getCardBackface, getCardImage, isCardKnown } from "./Model/GameTable";
import { PlayingSelectorTable, countSelectedCubes, isCardCurrent, isCardPrompted, isCardSelected, isHandSelected, isResponse, isSelectionPlaying, isValidCardTarget, isValidCubeTarget, selectorCanPickCard, selectorCanPlayCard } from "./Model/TargetSelector";
import { SelectorConfirmContext } from "./Model/TargetSelectorManager";
import useCardOverlay from "./Model/UseCardOverlay";
import "./Style/CardAnimations.css";
import "./Style/CardView.css";
import spriteCube from "/media/sprite_cube.png";

export const SPRITE_CUBE = spriteCube;

export function getCardUrl(image: string) {
    return `/cards/${image}.png`;
}

export interface CardProps {
    cardRef?: Ref<CardRef>;
    card: Card;
    showBackface?: boolean;
}

export function getSelectorCardClass(table: GameTable, card: Card) {
    const selector = table.selector;
    if (isSelectionPlaying(selector)) {
        if (isHandSelected(table, card) || isCardSelected(selector, card.id)) {
            return 'card-selected';
        }
        if (selector.selection.mode === 'target' || selector.selection.mode === 'modifier') {
            if (isValidCubeTarget(table as PlayingSelectorTable, card)) {
                return 'card-targetable-cubes';
            } else if (isValidCardTarget(table as PlayingSelectorTable, card)) {
                return 'card-targetable';
            }
        }
    }
    if (isCardCurrent(selector, card)) {
        return 'card-current';
    } else if (isCardPrompted(selector, card)) {
        return 'card-current';
    } else if (selectorCanPlayCard(selector, card)) {
        if (selector.selection.mode === 'start') {
            return 'card-playable';
        } else {
            return 'card-modified';
        }
    } else if (selectorCanPickCard(table, card)) {
        return 'card-pickable';
    }
    if (isResponse(selector)) {
        if (selector.request.highlight_cards.includes(card.id)) {
            return 'card-highlight';
        }
        if (selector.request.origin_card === card.id) {
            return 'card-origin';
        }
    }
    return null;
}

export default function CardView({ cardRef, card, showBackface }: CardProps) {
    const table = useContext(GameTableContext);
    const selector = table.selector;

    const { handleClickCard } = useContext(SelectorConfirmContext);

    const divRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(cardRef, () => ({
        getRect: () => divRef.current ? getDivRect(divRef.current) : null
    }));

    let [backfaceImage, cardImage, cardAlt] = useMemo(() => {
        const backfaceImage: CardImage = { image: getCardBackface(card) };
        const cardImage = getCardImage(card);
        const cardAlt = isCardKnown(card) ? getLocalizedCardName(card.cardData.name) : "";
        return [backfaceImage, cardImage, cardAlt] as const;
    }, [card]);

    useCardOverlay(cardImage ?? backfaceImage, cardAlt, divRef);

    const selectorCardClass = getSelectorCardClass(table, card);
    const selectedCubes = countSelectedCubes(selector, card);

    let style: CSSProperties | undefined;
    let classes = ['card-view'];

    if (card.animation) {
        switch (true) {
        case 'flipping' in card.animation:
            style = {
                '--duration': card.animation.flipping.duration + 'ms'
            } as CSSProperties;

            showBackface = true;

            classes.push('card-animation', 'z-10', 'card-animation-flip');
            if (card.animation.flipping.backface) {
                backfaceImage.image = card.animation.flipping.backface;
            }
            if (card.animation.flipping.cardImage) {
                cardImage = card.animation.flipping.cardImage;
            } else {
                classes.push('card-animation-reverse');
            }
            break;
        case 'turning' in card.animation:
            style = {
                '--duration': card.animation.turning.duration + 'ms'
            } as CSSProperties;

            classes.push('card-animation', 'z-10', 'card-animation-turn');
            if (!card.inactive) classes.push('card-animation-reverse');
            break;
        case 'flash' in card.animation:
            style = {
                '--duration': card.animation.flash.duration + 'ms'
            } as CSSProperties;

            classes.push('z-10', 'card-animation-flash');
            break;
        case 'short_pause' in card.animation:
            classes.push('z-10');
            break;
        }
    } else {
        if (card.inactive) {
            classes.push('card-horizontal');
        }
        if (selectorCardClass) {
            classes.push(selectorCardClass);
        }
    }

    return (
        <div ref={divRef} style={style} className={classes.join(' ')}
            onClick={handleClickCard(card)} >
            { cardImage ? <div className="card-front">
                <img className="card-view-img" src={getCardUrl(cardImage.image)} alt={cardAlt} />
                {cardImage.sign && <div className="card-view-inner">
                    <CardSignView sign={cardImage.sign} />
                </div>}
                {card.num_cubes > 0 && <div className="card-cubes">
                    {[...Array(card.num_cubes)].map((item, i) => (
                        <img key={i} className={`card-cube${card.num_cubes - i <= selectedCubes ? ' card-cube-selected' : ''}`} src={SPRITE_CUBE} alt=""  />
                    ))}
                </div>}
            </div> : <div className="card-back">
                <img className="card-view-img" src={getCardUrl(backfaceImage.image)} alt="" />
            </div> }
            { showBackface && <div className="card-back-flip">
                <img className="card-view-img" src={getCardUrl(backfaceImage.image)} alt=""  />
            </div> }
        </div>
    )
}