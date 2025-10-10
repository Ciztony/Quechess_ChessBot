// Initialize chessboard and game -------------------------------------------------
import { Chess } from 'https://esm.sh/chess.js';
import { BotManager } from './engine/src/js/botmanager.js';
import { Sound } from './engine/src/js/sound.js'
import { Ui } from './engine/src/js/ui.js';
import { isValidSquare, optimisedClassRemoval, canPromote } from './engine/src/js/util.js';

// Variables ----------------------------------------------------------------------

const game = new Chess(); // Board logic representation
const rootImageDirectory = 'engine/assets/img/chesspieces/wikipedia';
let myBot;
let botManager;
const $status = $('#status')
const sound = new Sound()
const gameState = {
  inCheck : false,
  checkFlagged : false,
  selected : false,
  hintedSquares : new Set(),
  domSquares : new Map(),
  promotionMove : null,
  selectedSquare : null,
  sourceDomSquare : null,
  legalMovesInPosition : new Map(),
  lastMoveDomPair: false
}
const ui = new Ui(game,gameState,sound)
// Utility functions --------------------------------------------------------------

function repositionBoard() {
  board.position(game.fen())
}
function updatePiecesOnSquare(source,target) {
  gameState.domSquares.get(source).hasPiece = false
  gameState.domSquares.get(target).hasPiece = true
}
// Main piece movement functions --------------------------------------------------
function updateStatus() {
      let status = '';
      const turn = game.turn()
      const moveColor = turn === 'w' ? 'White' : 'Black';
      if (game.isCheckmate()) {
        sound.GAMEENDSOUND.play()
        status = `Game over, ${moveColor} in checkmate.`;
      } else if (game.isDrawByFiftyMoves()) {
        sound.GAMEENDSOUND.play()
        status = 'Game over, drawn by 50 move rule.';
      } else if (game.isInsufficientMaterial()) {
        sound.GAMEENDSOUND.play()
        status = 'Game over, drawn by insufficient material.';
      } else if (game.isStalemate()) {
        sound.GAMEENDSOUND.play()
        status = 'Game over, drawn by stalemate';
      } else if (game.isDraw()) {
        sound.GAMEENDSOUND.play()
        status = 'Game over, drawn position.';
      } else {
        status = `${moveColor} to move`;
        if (gameState.inCheck) {
          // Apply king square check overlay
          status += `, ${moveColor} is in check.`;
          ui.applyKingSquareCheckOverlay(turn);
        }
      }
      $status.html(status);
    }

function handleMove(move) {
  gameState.inCheck = game.inCheck();
  if (gameState.inCheck) {
    sound.MOVECHECKSOUND.play();
  } else {
    sound.playMoveSounds(move);
  }
  const checkFlagged = gameState.checkFlagged
  // Undo king square check overlay
  if (checkFlagged && !game.isAttacked(checkFlagged)) {
    ui.undoKingSquareCheckOverlay(checkFlagged);
  }
  updateStatus()
}
// Prevent dragging opponent pieces or when game is over
function handleDragStart(source, piece) {
  if (game.isGameOver()) return false;
  const turn = game.turn();
  const whiteToMove = turn === 'w';
  const isWhitePiece = piece.startsWith('w');
  if ((whiteToMove && !isWhitePiece) || (!whiteToMove && isWhitePiece) || (turn === botColor)) { // If piece does not belong to the current color or move belongs to bot, then abort
    return false ;
  } else {
    if (!(gameState.selected && gameState.selectedSquare === source)) {
    // Apply hint overlay
    if (gameState.selected) {
      ui.undoHintOverlay();
    }
    ui.applyHintOverlay(source,piece);
    };
  };
}
// Handle piece drop
function handleValidMove(source,target,piece) {
  let move;
  const rank = Number(target[1]);
  const file = Number(source[1])
  if (canPromote(rank,file,piece)) {
    ui.handlePromotion(source,target); // Displays promotion ui for player
  } else {
    move = game.move({
      from: source,
      to: target, 
    });
    updatePiecesOnSquare(source,target) // Update the piece cache when a piece is moved
    if (!move) return 'snapback';
    handleMove(move);
  }
  return
}
function handleDrop(source, target,piece) {
  const isSameSquare = source === target;
  // Undo hint overlay and selection logic
  if (!isSameSquare || (gameState.hintedSquares.size > 0 && gameState.selected)) {
    ui.undoHintOverlay();
  };
  if (isSameSquare) {
    if (gameState.selected && gameState.selectedSquare === source) {
      ui.undoHintOverlay();
      gameState.selected = false;
      gameState.selectedSquare = null;
    } else {
      ui.undoHintOverlay();
      ui.applyHintOverlay(source,piece);
      gameState.selected = true;
      gameState.selectedSquare = source;
    };
    return 'snapback';
};
  optimisedClassRemoval(gameState.sourceDomSquare.classList,'selected-highlight') // Remove the highlight for the source piece that was selected before movement
  if (gameState.selected) {
    ui.undoHintOverlay();
    gameState.selected = false;
    gameState.selectedSquare = null;
  };
  if (!isValidSquare(target)) {
    return 'snapback';
  };
  const result = handleValidMove(source,target,piece)
  if (result) return result

}
function makeMoveByBot() {
  const move = myBot.move(game);
  const source = move[0]
  const target = move[1]
  // Apply post move highlight showing which piece moved from where to where
  if (gameState.lastMoveDomPair) {
    ui.undoPostMoveHighlight()
  }
  ui.applyPostMoveHighlight(source,target)
  
  console.log('Evaluating...');
  console.log(`Made move: ${source} to ${target}`)
  const madeMove = game.move(
    {
      from:source,
      to:target,
      promotion:move[2]
    }
  );
  updatePiecesOnSquare(source,target)
  return madeMove;
}
function handleSnapEnd(source,target) {
  gameState.sourceDomSquare = null;
  repositionBoard();

  // Reset before highlighting player move
  if (gameState.lastMoveDomPair) {
    ui.undoPostMoveHighlight()
  }
  ui.applyPostMoveHighlight(source,target)

  if (game.turn() === botColor) {
    // Add delay to simulate bot thinking time
    setTimeout(() => {
      const madeMove = makeMoveByBot(botColor);
      handleMove(madeMove);
      repositionBoard();
    }, 500); 
  }
  gameState.legalMoves.clear(); // Reset legal moves
}

// Main promotion handler  ------------------------------------------------------------
function handlePromotionDisplay(event) {
    if (gameState.promotionMove) {
      const piecePromoted = event.target.id;
      const color = game.turn()

      ui.displayPromotionPieces(color,'invisible','visible')
      let source = gameState.promotionMove.source
      let target = gameState.promotionMove.target

      let move = game.move({
        from: source,
        to: target,
        promotion: piecePromoted
      });
      updatePiecesOnSquare(source,target)
      if (!move) return repositionBoard(); // reset if invalid
      if (game.turn() === botColor) { // Make move by bot after promotion
        makeMoveByBot(botColor);
      };
      repositionBoard();
      handleMove(move);
      gameState.promotionMove = null;
    }
}
document.querySelectorAll('.promotionbuttons').forEach(button => {
  button.addEventListener('click', handlePromotionDisplay);
});

// Create board ----------------------------------------------------------------
async function initBotManager() { // The bot manager handles selection of bots
  const { BotManager } = await import('./engine/src/js/botmanager.js');
  botManager = new BotManager();
  botManager.loadBots();
  myBot = botManager.bots[0]
}

const boardConfig = {
  position: 'start',
  draggable: true,
  pieceTheme: `${rootImageDirectory}/{piece}.png`,
  onDragStart : handleDragStart,
  onDrop : handleDrop,
  onSnapEnd : handleSnapEnd
  };
const board = Chessboard('myBoard', boardConfig);
// Load bots -------------------------------------------------------------------
const botColor = board.orientation()==='white' ? 'b' :'w';

function resetBoard() {
  ui.undoHintOverlay()
  // Undo selected piece highlight
  if (gameState.lastMoveDomPair) {
    ui.undoPostMoveHighlight()
  }
  // Undo king check overlay
  if (gameState.checkFlagged) {
    ui.undoKingSquareCheckOverlay()
  }
  if (gameState.sourceDomSquare) {
    gameState.sourceDomSquare.classList.remove('selected-highlight')
    gameState.sourceDomSquare = false
    gameState.selectedSquare = false
    gameState.selected = false
  } 
  board.start(false)
  game.reset()
  updateStatus()
  Ui.displayText(['']) // Reset textdisplay
}
// Handle option change
function handleOptionChange(event) { // Handles the DOM bot switching
  if (!game.isGameOver()) {
    const botIndex = Number(event.target.value)
    myBot = botManager.bots[botIndex]
    console.log(`Switched to bot: ${myBot.name}`)
    resetBoard()
  }
}
// Main setup functions -----------------------------------------------------------
sound.primeAudio(); // Prepare audio
ui.primeOverlays() // Prepare hint overlays
document.addEventListener('touchmove', function(e) {
  e.preventDefault();
}, { passive: false });
document.getElementById('botversion').addEventListener('change', handleOptionChange);
updateStatus();
initBotManager();
