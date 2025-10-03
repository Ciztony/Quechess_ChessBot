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
  hintedSquares : [],
  domSquares : new Map(),
  promotionMove : null,
  selectedSquare : null,
  promotionPieces : []
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
      hintOverlay.style.display = 'none';
      // Position overlay relative to the board
      hintOverlay.style.top = '0px';
      hintOverlay.style.left = '0px';
      domSquare.appendChild(hintOverlay);
      gameState.domSquares.set(position,domSquare);
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
function applyHintOverlay(source,turn) {
  const legalMoves = getLegalMovesForTurn(source,turn);
  const domSquares = gameState.domSquares;
  for (const legalMove of legalMoves) {
    let moveSquare = domSquares.get(legalMove);
    //console.log(moveSquare.children)
    let overlay = moveSquare.lastChild
    let hasPiece = moveSquare.querySelector("img")!=null
    if (hasPiece) {
      overlay.style.backgroundColor = 'rgb(255,0,0,0.5)';
    } else {
      overlay.style.display = 'block';
    }
    gameState.hintedSquares.push(overlay); // store overlay to clear later
  };
}
function applyKingSquareCheckOverlay(turn) {
  const kingSquare = game.findPiece({type: 'k',color:turn})[0];
  const kingInCheckSquare = gameState.domSquares.get(kingSquare);
  kingInCheckSquare.style.backgroundColor = "rgb(255,0,0)";
  gameState.checkFlagged = kingInCheckSquare;
}
function undoHintOverlay(){
  for (const overlay of gameState.hintedSquares) {
      overlay.style.display = 'none';
  }
  gameState.hintedSquares = [];
}
function undoKingSquareCheckOverlay() {
  const kingInCheckSquare = gameState.checkFlagged;
  kingInCheckSquare.style.backgroundColor = "";
  gameState.checkFlagged = false;
}
function handlePromotion(source,target) {
  displayPromotionPieces(game.turn(),'inline-block',)
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
  updateStatus();
}
function displayPromotionPieces(color,type_) {
  for (const piece of 'BNRQ') {
    let pieceNotation = color+piece
    document.getElementById(pieceNotation).style.display = type_
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
      undoHintOverlay(source);
    }
    applyHintOverlay(source,turn);
    };
  };
}
// Handle piece drop
function onDrop(source, target,piece) {
  const moved = source === target;
  // Undo hint overlay
  if (!moved || (gameState.hintedSquares.length > 0 && gameState.selected)) {
    undoHintOverlay(source);
  };
  if (moved) {
    if (gameState.selected && gameState.selectedSquare === source) {
      undoHintOverlay(source);
      gameState.selected = false;
      gameState.selectedSquare = null;
    } else {
      undoHintOverlay(source);
      applyHintOverlay(source,game.turn());
      gameState.selected = true;
      gameState.selectedSquare = source;
    };
    return 'snapback';
  };
  if (gameState.selected) {
    undoHintOverlay(source);
    gameState.selected = false;
    gameState.selectedSquare = null;
  };
  if (!isValidSquare(target)) {
    return 'snapback';
  };
  let move;
  try {
    const rank = Number(target[1]);
    //console.log(piece,rank);
    const isPromotion = ((rank === 8 && source === 7) || (rank === 1 && source === 2)) && piece === 'P'
    if (isPromotion) {
      handlePromotion(source,target);
    } else {
      move = game.move({
        from: source,
        to: target, 
      });
      if (!move) return 'snapback';
      handleMove(move);
    }
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
  return madeMove;
}
function onSnapEnd() {
  if (game.turn() === botColor) {
      const madeMove = makeMoveByBot(game.turn());
      handleMove(madeMove);
  }
  board.position(game.fen());
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
    let piecePromoted = event.target.id;
    displayPromotionPieces(game.turn(),'none')
    let move = game.move({
      from: gameState.promotionMove.source,
      to: gameState.promotionMove.target,
      promotion: piecePromoted
    });
    if (!move) return board.position(game.fen()); // reset if invalid
    let turn = game.turn()
    if (turn === botColor) {
      makeMoveByBot(turn);
    };
    board.position(game.fen());
    handleMove(move);
    gameState.promotionMove = null;
  }
});
primeAudio(); // Prepare audio
primeOverlays(); // Prepare hint overlays
updateStatus();