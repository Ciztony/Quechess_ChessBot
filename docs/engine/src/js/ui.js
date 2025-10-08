import { optimisedClassRemoval } from './util.js';

export class Ui {
    constructor(game,gameState,sound) {
        this.gameState = gameState
        this.game = game
        this.sound = sound
    }
    // Get legal moves for current player
    getLegalMovesForTurn(source,piece) {
        const legalMovesForPiece = this.game.moves({ square: source, verbose: true }).map(move => move.to)
        this.gameState.legalMovesInPosition.set(`${source}-${piece}`,legalMovesForPiece) 
        return legalMovesForPiece;
    }
    // Prime hint overlays
    primeOverlays() {
    for (const file  of 'abcdefgh') {
        for (let rank=1;rank<9;rank++) {
        const position = `${file}${rank}`;
        //console.log(position)
        const domSquare = document.querySelector(`[data-square="${position}"]`);
        const hintOverlay = document.createElement('div')
        hintOverlay.classList.add('hint-highlight');
        hintOverlay.style.display = 'none'
        // Position overlay relative to the board
        domSquare.appendChild(hintOverlay);
        this.gameState.domSquares.set(position, {
            square: domSquare,
            overlay: hintOverlay,
            hasPiece: domSquare.querySelector('img') != null
        });
        };
    };
    }
    // Reset previous source highlight
    resetPreviousSourceHighlight(source) {
      const sourceSquare = this.gameState.sourceDomSquare 
      if (sourceSquare && source !== sourceSquare.dataset.square) {
        sourceSquare.classList.remove('orange-highlight')
      }
    }
    applyHintOverlay(source,piece) {
      // Effeciently check cache for legal Moves
      const key = `${source}-${piece}`
      const legalMoves = this.gameState.legalMovesInPosition.has(key)
        ? this.gameState.legalMovesInPosition.get(key)
        : this.getLegalMovesForTurn(source, piece);
    
      // Iterate to add hints
      const domSquares = this.gameState.domSquares;
      const sourceSquare = domSquares.get(source).square
      this.resetPreviousSourceHighlight(source)
      sourceSquare.classList.add('orange-highlight')
      this.gameState.sourceDomSquare = sourceSquare
      for (const legalMove of legalMoves) {
        let { square, overlay, hasPiece } = domSquares.get(legalMove)
        let toadd;  
        if (hasPiece) {
          square.classList.add('red-background')
          toadd = square
        } else {
          overlay.classList.add('visible')
          toadd = overlay
        }
        this.gameState.hintedSquares.add(toadd); // store overlay to clear later
      };
      this.gameState.legalMoves = new Set(legalMoves)
    }
    applyKingSquareCheckOverlay(turn) {
      const kingSquare = this.game.findPiece({type: 'k',color:turn})[0];
      const kingInCheckSquare = this.gameState.domSquares.get(kingSquare).square;
      kingInCheckSquare.classList.add('check-red-background')
      this.gameState.checkFlagged = kingInCheckSquare;
    }
    applyPostMoveHighlight(source,target) {
      const domSquares = this.gameState.domSquares
      const sourceDomSquare = domSquares.get(source).square
      const targetDomSquare = domSquares.get(target).square
      sourceDomSquare.classList.add('post-move-overlay')
      targetDomSquare.classList.add('post-move-overlay')
      this.gameState.lastMoveDomPair = {source:sourceDomSquare,target:targetDomSquare}
    }
    undoPostMoveHighlight() {
      const {source,target} = this.gameState.lastMoveDomPair
      optimisedClassRemoval(source.classList,'post-move-overlay')
      optimisedClassRemoval(target.classList,'post-move-overlay')
      this.gameState.lastMoveDomPair = false
    }
    undoHintOverlay(){
      for (const overlay of this.gameState.hintedSquares) {
          let classList = overlay.classList
          optimisedClassRemoval(classList,'red-background')
          optimisedClassRemoval(classList,'visible')
      }
      this.gameState.hintedSquares.clear();
    }
    undoKingSquareCheckOverlay(checkFlagged) {
      const kingInCheckSquare = checkFlagged
      kingInCheckSquare.classList.remove('check-red-background')
      this.gameState.checkFlagged = false;
    }

    displayPromotionPieces(color,add,remove) {
        for (const piece of 'BNRQ') {
            let pieceNotation = color+piece
            let pieceObj = document.getElementById(pieceNotation).classList
            pieceObj.add(add)
            pieceObj.remove(remove)
        }
    }
    // Main wrapper for handling promotion in main
    handlePromotion(source,target) {
        this.displayPromotionPieces(this.game.turn(),'visible','invisible')
        this.gameState.promotionMove = { source, target };
    }
  // Displaying text
  static displayText(textList) {
    const el = document.getElementById('textdisplay');
    el.innerHTML = ''
    for (const line of textList) {
      el.innerHTML += `${line}<br>`
    }
  }
}