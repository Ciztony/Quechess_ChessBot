// Initialize chessboard and game -------------------------------------------------
import { Chess } from 'https://esm.sh/chess.js';
import { BotManager } from './engine/src/js/botmanager.js';
import { Sound } from './engine/src/js/sound.js'
import { Ui } from './engine/src/js/ui.js';
import { isValidSquare, optimisedClassRemoval, canPromote } from './engine/src/js/util.js';

// Variables ----------------------------------------------------------------------

const game = new Chess();
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
        status = `Game over, ${moveColor} is in checkmate.`;
      } else if (game.isDrawByFiftyMoves()) {
        this.sound.GAMEENDSOUND.play()
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
  const isWhiteTurn = turn === 'w';
  const isWhitePiece = piece.startsWith('w');
  if ((isWhiteTurn && !isWhitePiece) || (!isWhiteTurn && isWhitePiece) || (turn === botColor)) {
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
  //console.log(piece,rank);
  if (canPromote(rank,file,piece)) {
    ui.handlePromotion(source,target);
  } else {
    move = game.move({
      from: source,
      to: target, 
    });
    updatePiecesOnSquare(source,target)
    if (!move) return 'snapback';
    handleMove(move);
  }
  return
}
function handleDrop(source, target,piece) {
  const isSameSquare = source === target;
  // Undo hint overlay
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
  optimisedClassRemoval(gameState.sourceDomSquare.classList,'orange-highlight')
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
function handleSnapEnd() {
  gameState.sourceDomSquare = null;
  repositionBoard();
  if (game.turn() === botColor) {
    // Add delay to simulate bot thinking time
    setTimeout(() => {
      const madeMove = makeMoveByBot(botColor);
      handleMove(madeMove);
      repositionBoard();
    }, 500); // 500ms delay, you can adjust this
  }
  gameState.legalMoves.clear();
}

// Update game status text, FEN, and PGN
// Main promotion handler  ------------------------------------------------------------
function handlePromotionDisplay(event) {
    const piecePromoted = event.target.id;
    const color = game.turn()
    ui.displayPromotionPieces(color,'invisible','visible')
    let source = gameState.promotionMove.source
    let target = gameState.promotionMove.target
    console.log(gameState.promotionMove)
    let move = game.move({
      from: source,
      to: target,
      promotion: piecePromoted
    });
    updatePiecesOnSquare(source,target)
    if (!move) return repositionBoard(); // reset if invalid
    if (game.turn() === botColor) {
      makeMoveByBot(botColor);
    };
    repositionBoard();
    handleMove(move);
    gameState.promotionMove = null;
}
document.querySelectorAll('.promotionbuttons').forEach(button => {
  button.addEventListener('click', handlePromotionDisplay);
});

// Create board ----------------------------------------------------------------
async function initBotManager() {
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
  if (gameState.lastMoveDomPair) {
    ui.undoPostMoveHighlight()
  }
  if (gameState.checkFlagged) {
    ui.undoKingSquareCheckOverlay()
  }
  if (gameState.sourceDomSquare) {
    gameState.sourceDomSquare.classList.remove('orange-highlight')
    gameState.sourceDomSquare = false
    gameState.selectedSquare = false
    gameState.selected = false
  } 
  board.start(false)
  game.reset()
  updateStatus()
  Ui.displayText([''])
}
// Handle option change
function handleOptionChange(event) {
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
updateStatus();
initBotManager();
document.getElementById('botversion').addEventListener('change', handleOptionChange);
