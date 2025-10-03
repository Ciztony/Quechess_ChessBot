// Initialize chessboard and game
import { Chess } from 'https://esm.sh/chess.js';
import { dumbBot } from './mybot1.js'
import { isValidSquare } from './engine/src/js/util.js';
const game = new Chess();
const $status = $('#status');
const checkOverlay = document.createElement('div');
const captureSound = document.getElementById('capture');
const moveSelfSound = document.getElementById('move-self');
const moveCheckSound = document.getElementById('move-check');
const castleSound = document.getElementById('castle');
const promoteSound = document.getElementById('promote');
const gameEndSound = document.getElementById('game-end');
const promotion = document.getElementById('promotion');
const rootImageDirectory = 'engine/assets/img/chesspieces/wikipedia';
checkOverlay.classList.add("check-overlay");
let gameState = {
  inCheck : false,
  checkFlagged : false,
  selected : false,
  hintedSquares : new Set(),
  domSquares : new Map(),
  promotionMove : null,
  selectedSquare : null,
  promotionPieces : new Set(),
  sourceDomSquare : null,
  legalMoves : new Set(),
  piecesOnSquare : new Set()
}

export function getLegalMoves(game,color) {
    const filtered = game.moves({verbose:true});
    return filtered.filter(piece=>piece.color===color);
}

// Get legal moves of the current playing side
function getLegalMovesForTurn(source,colour) {
  const totalLegalMoves = game.moves({verbose:true});
  const legalMoves = totalLegalMoves.filter(piece=>((piece.color===colour)&&(piece.from===source))).map(piece=>piece.to);
  return legalMoves;
}
function primeOverlays() {
  for (const file  of 'abcdefgh') {
    for (let rank=1;rank<9;rank++) {
      const position = `${file}${rank}`;
      //console.log(position)
      let domSquare = document.querySelector(`[data-square="${position}"]`);
      let hintOverlay = document.createElement('div')
      hintOverlay.classList.add('hint-highlight');
      hintOverlay.style.display = 'none'
      // Position overlay relative to the board
      domSquare.appendChild(hintOverlay);
      gameState.domSquares.set(position, {
        square: domSquare,
        overlay: hintOverlay
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
function repositionBoard() {
  board.position(game.fen())
}
function updatePiecesOnSquare(source,target) {
  gameState.piecesOnSquare.delete(source)
  gameState.piecesOnSquare.add(target)
}
function resetPreviousSourceHighlight(source) {
  const sourceSquare = gameState.sourceDomSquare 
  if (sourceSquare && source !== sourceSquare.dataset.square) {
    sourceSquare.classList.remove('orange-highlight')
  }
}
function applyHintOverlay(source,turn) {
  const legalMoves = getLegalMovesForTurn(source,turn);
  const domSquares = gameState.domSquares;
  const sourceSquare = domSquares.get(source).square
  resetPreviousSourceHighlight(source)
  sourceSquare.classList.add('orange-highlight')
  gameState.sourceDomSquare = sourceSquare
  for (const legalMove of legalMoves) {
    let { square, overlay } = gameState.domSquares.get(legalMove)
    let hasPiece = square.querySelector("img")!=null
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
      overlay.classList.remove('red-background','visible')
  }
  gameState.hintedSquares.clear();
}
function undoKingSquareCheckOverlay() {
  const kingInCheckSquare = gameState.checkFlagged;
  kingInCheckSquare.classList.remove('check-red-background')
  gameState.checkFlagged = false;
}
function handlePromotion(source,target) {
  displayPromotionPieces(game.turn(),'visible','invisible')
  gameState.promotionMove = { source, target };
}
function handleMove(move) {
  gameState.inCheck = game.inCheck();
  if (gameState.inCheck) {
    moveCheckSound.play();
  } else {
    playMoveSounds(move);
  }
  // Undo king square check overlay
  if (gameState.checkFlagged && !game.isAttacked(gameState.checkFlagged)) {
    undoKingSquareCheckOverlay();
  }
}
function displayPromotionPieces(color,add,remove) {
  for (const piece of 'BNRQ') {
    let pieceNotation = color+piece
    let pieceObj = document.getElementById(pieceNotation).classList
    pieceObj.add(add)
    pieceObj.remove(remove)
  }
}
// Prevent dragging opponent pieces or when game is over
function onDragStart(source, piece) {
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
    applyHintOverlay(source,turn);
    };
  };
}
export function canPromote(rank,source,piece) {
  return ((rank === 8 && source[1] === '7') || (rank === 1 && source[1] === '2')) && piece[1] === 'P'
}
// Handle piece drop
function handleValidMove(source,target,piece) {
  let move;
  const rank = Number(target[1]);
  console.log(source[1])
  //console.log(piece,rank);
  if (canPromote(rank,source,piece)) {
    handlePromotion(source,target);
  } else {
    move = game.move({
      from: source,
      to: target, 
    });
    updatePiecesOnSquare(source,target)
    if (!move) return 'snapback';
    handleMove(move);
    updateStatus()
  }
  return
}
function onDrop(source, target,piece) {
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
      applyHintOverlay(source,game.turn());
      gameState.selected = true;
      gameState.selectedSquare = source;
    };
    return 'snapback';
};
  gameState.sourceDomSquare.classList.remove('orange-highlight')
  console.log(gameState.sourceDomSquare)
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
  const move = dumbBot.move(game,turn);
  console.log('Evaluating...');
  console.log(`Made move: ${move[0]} to ${move[1]}`)
  const madeMove = game.move(
    {
      from:move[0],
      to:move[1],
      promotion:move[2]
    }
  );
  updatePiecesOnSquare(move[0],move[1])
  return madeMove;
}
function onSnapEnd() {
  gameState.sourceDomSquare = null
  if (game.turn() === botColor) {
      const madeMove = makeMoveByBot(game.turn());
      handleMove(madeMove);
      updateStatus()
  }
  repositionBoard();
  gameState.legalMoves.clear()
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
const boardConfig = {
  position: 'start',
  draggable: true,
  pieceTheme: `${rootImageDirectory}/{piece}.png`,
  onDragStart,
  onDrop,
  onSnapEnd,
  };
const board = Chessboard('myBoard', boardConfig);
const botColor = board.orientation()==='white' ? 'b' :'w';
// Add event listener to look out for promotion click
promotion.addEventListener('click', (event) => {
  if (event.target.tagName === 'BUTTON' && gameState.promotionMove) {
    const piecePromoted = event.target.id;
    displayPromotionPieces(game.turn(),'invisible','visible')
    let source = gameState.promotionMove.source
    let target = gameState.promotionMove.target
    let move = game.move({
      from: gameState.promotionMove.source,
      to: gameState.promotionMove.target,
      promotion: piecePromoted
    });
    updatePiecesOnSquare(source,target)
    if (!move) return repositionBoard(); // reset if invalid
    let turn = game.turn()
    if (turn === botColor) {
      makeMoveByBot(turn);
      updateStatus()
    };
    repositionBoard();
    handleMove(move);
    gameState.promotionMove = null;
  }
});
document.getElementById('myBoard').addEventListener('click', (event) => {
  const squareClicked = event.target
  let source = gameState.selectedSquare
  let target = squareClicked.dataset.square
  if (!(gameState.legalMoves.has(target))) return;
  if (!gameState.selected) return
  const piece = gameState.sourceDomSquare.lastChild.dataset.piece
  undoHintOverlay()
  gameState.sourceDomSquare.classList.remove('orange-highlight')
  gameState.selected = false
  gameState.selectedSquare = null
  handleValidMove(source,target,piece)
  gameState.legalMoves.clear()
  if (!gameState.promotionMove && !game.isGameOver()) {
    const botMove = makeMoveByBot(game.turn())
    handleMove(botMove)
    updateStatus()
  }
  repositionBoard()
})
primeAudio(); // Prepare audio
primeOverlays(); // Prepare hint overlays
updateStatus();
