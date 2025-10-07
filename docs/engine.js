// Initialize chessboard and game -------------------------------------------------
import { Chess } from 'https://esm.sh/chess.js';
import { BotManager } from './engine/src/js/botmanager.js';
import { isValidSquare, optimisedClassRemoval, canPromote } from './engine/src/js/util.js';

// Variables ----------------------------------------------------------------------

const game = new Chess();
const $status = $('#status');
const captureSound = document.getElementById('capture');
const moveSelfSound = document.getElementById('move-self');
const moveCheckSound = document.getElementById('move-check');
const castleSound = document.getElementById('castle');
const promoteSound = document.getElementById('promote');
const gameEndSound = document.getElementById('game-end');
const rootImageDirectory = 'engine/assets/img/chesspieces/wikipedia';
let myBot;
let botManager;
const gameState = {
  inCheck : false,
  checkFlagged : false,
  selected : false,
  hintedSquares : new Set(),
  domSquares : new Map(),
  promotionMove : null,
  selectedSquare : null,
  sourceDomSquare : null,
  legalMovesInPosition : new Map()
}


// Get legal moves of the current playing side
function getLegalMovesForTurn(source,piece) {
  const legalMovesForPiece = game.moves({ square: source, verbose: true }).map(move => move.to)
  gameState.legalMovesInPosition.set(`${source}-${piece}`,legalMovesForPiece) 
  return legalMovesForPiece;
}

// Priming functions --------------------------------------------------------------

function primeOverlays() {
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
      gameState.domSquares.set(position, {
        square: domSquare,
        overlay: hintOverlay,
        hasPiece: domSquare.querySelector('img') !== null
      });
    };
  };
}
// Prime audio to get around sound restrictions
function primeAudio() {
  const sounds = [
    captureSound,
    moveSelfSound,
    moveCheckSound,
    castleSound,
    promoteSound,
    gameEndSound
  ];
  sounds.forEach(sound => {
    sound.volume = 0;
    sound.play().catch(() => {});
    setTimeout(() => { sound.pause(); sound.currentTime = 0; sound.volume = 1; }, 50);
  });
}
// Handle legalMove sounds 
function playMoveSounds(move) {
  if (move.isPromotion()) {
    promoteSound.play();
  } else if (move.isCapture() || move.isEnPassant()){
    captureSound.play();
  } else if (move.isKingsideCastle() || move.isQueensideCastle()) {
    castleSound.play();
  } else {
    moveSelfSound.play();
  };
}

// Utility functions --------------------------------------------------------------

function repositionBoard() {
  board.position(game.fen())
}
function updatePiecesOnSquare(source,target) {
  gameState.domSquares.get(source).hasPiece = false
  gameState.domSquares.get(target).hasPiece = true
}


// Applying and undoing hints and overlays -----------------------------------------

function resetPreviousSourceHighlight(source) {
  const sourceSquare = gameState.sourceDomSquare 
  if (sourceSquare && source !== sourceSquare.dataset.square) {
    sourceSquare.classList.remove('orange-highlight')
  }
}

function applyHintOverlay(source,piece) {
  // Effeciently check cache for legal Moves
  let legalMoves;
  const key = `${source}-${piece}`
  if (gameState.legalMovesInPosition.has(key)) {
    legalMoves = gameState.legalMovesInPosition.get(key)
  } else {
    legalMoves = getLegalMovesForTurn(source,piece)
  }

  // Iterate to add hints
  const domSquares = gameState.domSquares;
  const sourceSquare = domSquares.get(source).square
  resetPreviousSourceHighlight(source)
  sourceSquare.classList.add('orange-highlight')
  gameState.sourceDomSquare = sourceSquare
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
    gameState.hintedSquares.add(toadd); // store overlay to clear later
  };
  gameState.legalMoves = new Set(legalMoves)
}
function applyKingSquareCheckOverlay(turn) {
  const kingSquare = game.findPiece({type: 'k',color:turn})[0];
  const kingInCheckSquare = gameState.domSquares.get(kingSquare).square;
  kingInCheckSquare.classList.add('check-red-background')
  gameState.checkFlagged = kingInCheckSquare;
}
function undoHintOverlay(){
  for (const overlay of gameState.hintedSquares) {
      let classList = overlay.classList
      optimisedClassRemoval(classList,'red-background')
      optimisedClassRemoval(classList,'visible')
  }
  gameState.hintedSquares.clear();
}
function undoKingSquareCheckOverlay(checkFlagged) {
  const kingInCheckSquare = checkFlagged
  kingInCheckSquare.classList.remove('check-red-background')
  gameState.checkFlagged = false;
}

// Promotion ----------------------------------------------------------------------

function handlePromotion(source,target) {
  displayPromotionPieces(game.turn(),'visible','invisible')
  gameState.promotionMove = { source, target };
}
function displayPromotionPieces(color,add,remove) {
  for (const piece of 'BNRQ') {
    let pieceNotation = color+piece
    let pieceObj = document.getElementById(pieceNotation).classList
    pieceObj.add(add)
    pieceObj.remove(remove)
  }
}

// Main piece movement functions --------------------------------------------------

function handleMove(move) {
  gameState.inCheck = game.inCheck();
  if (gameState.inCheck) {
    moveCheckSound.play();
  } else {
    playMoveSounds(move);
  }
  const checkFlagged = gameState.checkFlagged
  // Undo king square check overlay
  if (checkFlagged && !game.isAttacked(checkFlagged)) {
    undoKingSquareCheckOverlay(checkFlagged);
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
      undoHintOverlay();
    }
    applyHintOverlay(source,piece);
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
    handlePromotion(source,target);
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
  if (!isSameSquare || (gameState.hintedSquares.length > 0 && gameState.selected)) {
    undoHintOverlay();
  };
  if (isSameSquare) {
    if (gameState.selected && gameState.selectedSquare === source) {
      undoHintOverlay();
      gameState.selected = false;
      gameState.selectedSquare = null;
    } else {
      undoHintOverlay();
      applyHintOverlay(source,piece);
      gameState.selected = true;
      gameState.selectedSquare = source;
    };
    return 'snapback';
};
  optimisedClassRemoval(gameState.sourceDomSquare.classList,'orange-highlight')
  if (gameState.selected) {
    undoHintOverlay();
    gameState.selected = false;
    gameState.selectedSquare = null;
  };
  if (!isValidSquare(target)) {
    return 'snapback';
  };
  try {
    const result = handleValidMove(source,target,piece)
    if (result) return result
  } catch (e) {
    return 'snapback';
  }

}
function makeMoveByBot(turn) {
  const move = myBot.move(game);
  const source = move[0]
  const target = move[1]
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
  
  if (game.turn() === botColor) {
    // Add delay to simulate bot thinking time
    setTimeout(() => {
      const madeMove = makeMoveByBot(botColor);
      handleMove(madeMove);
      repositionBoard();
    }, 500); // 500ms delay, you can adjust this
  } else {
    repositionBoard();
  }
  
  gameState.legalMoves.clear();
}

// Update game status text, FEN, and PGN
function updateStatus() {
  let status = '';
  const turn = game.turn()
  const moveColor = turn === 'w' ? 'White' : 'Black';
  if (game.isCheckmate()) {
    gameEndSound.play()
    status = `Game over, ${moveColor} is in checkmate.`;
  } else if (game.isDrawByFiftyMoves()) {
    gameEndSound.play()
    status = 'Game over, drawn by 50 move rule.';
  } else if (game.isInsufficientMaterial()) {
    gameEndSound.play()
    status = 'Game over, drawn by insufficient material.';
  } else if (game.isStalemate()) {
    gameEndSound.play()
    status = 'Game over, drawn by stalemate';
  } else if (game.isDraw()) {
    gameEndSound.play()
    status = 'Game over, drawn position.';
  } else {
    status = `${moveColor} to move`;
    if (gameState.inCheck) {
      // Apply king square check overlay
      status += `, ${moveColor} is in check.`;
      applyKingSquareCheckOverlay(turn);
    }
  }
  $status.html(status);
}

// Handle Promotion ------------------------------------------------------------
function handlePromotionDisplay(event) {
    const piecePromoted = event.target.id;
    displayPromotionPieces(game.turn(),'invisible','visible')
    let source = gameState.promotionMove.source
    let target = gameState.promotionMove.target
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
  undoHintOverlay()
  if (gameState.checkFlagged) {
    undoKingSquareCheckOverlay()
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

primeAudio(); // Prepare audio
primeOverlays(); // Prepare hint overlays
updateStatus();
initBotManager();
