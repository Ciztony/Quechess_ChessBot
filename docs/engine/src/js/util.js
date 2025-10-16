import { Ui } from './ui.js';



export class BoardUtilities {
  static isValidSquare(square) {
    return /^[a-h][1-8]$/.test(square);
  }
  static canPromote(game, source, target, piece) {
    if (piece[1] !== 'P') return false;
    return game.moves({ verbose: true }).some(move => 
      move.from === source &&
      move.to === target &&
      move.promotion // only promotion moves have this property
    );
  }
  static moveObjToStandardNotation(move) {
    return [move.from,move.to]
  }
}
export class BoardHelpers { 
  static repositionBoard(board,game) {
    board.position(game.fen())
  }
  static updatePiecesOnSquare(gameState,source,target) { // Updates the pieces in the dom square cache to efficiently look up dom squares
    gameState.domSquares.get(source).hasPiece = false
    gameState.domSquares.get(target).hasPiece = true
  }
  static resetBoard(engine) {
    engine.ui.undoHintOverlay()
    // Undo selected piece highlight
    if (engine.gameState.lastMoveDomPair) {
      engine.ui.undoPostMoveHighlight()
    }
    // Undo king check overlay
    if (engine.gameState.checkFlagged) {
      engine.ui.undoKingSquareCheckOverlay()
    }
    if (engine.gameState.sourceDomSquare) { // Reset gamestate
      engine.gameState.sourceDomSquare.classList.remove('selected-highlight')
      engine.gameState.sourceDomSquare = false
      engine.gameState.selectedSquare = false
      engine.gameState.selected = false
    } 
    // Reset board and chess
    engine.board.start(false)
    engine.game.reset()
    engine.updateStatus()
    Ui.displayText(['']) // Reset textdisplay
  }
}

// Effecient class removal
export function optimisedClassRemoval(classList,class_) {
  if (classList.contains(class_)) {
    classList.remove(class_)
  }
}

// Calculates a random choice from a list
export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
