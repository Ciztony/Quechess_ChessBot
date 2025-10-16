// Initialize chessboard and game -------------------------------------------------
import { Chess } from 'https://esm.sh/chess.js';
import { BotManager } from './engine/src/js/botmanager.js';
import { Sound } from './engine/src/js/sound.js'
import { Ui } from './engine/src/js/ui.js';
import { BoardUtilities, BoardHelpers, optimisedClassRemoval } from './engine/src/js/util.js';

// Settings you can fiddle around with -------------------------------------------
const rootImageDirectory = 'engine/assets/img/chesspieces/wikipedia';
const botMovementDelayTime = 700
const role = 'w'
const invert = role==='b'?true:false

// Variables ----------------------------------------------------------------------
class Engine {
  constructor() {
    this.game = new Chess(); // Board logic representation
    this.$status = $('#status')
    this.sound = new Sound()

    this.gameState = {
      inCheck : false,
      checkFlagged : false,
      selected : false,
      hintedSquares : new Set(),
      domSquares : new Map(),
      promotionMove : null,
      selectedSquare : null,
      sourceDomSquare : null,
      legalMovesInPosition : new Map(),
      lastMoveDomPair: false,
    }

    this.ui = new Ui(this.game,this.gameState,this.sound)

    this.bindMethods()

    // Create board ----------------------------------------------------------------
    const boardConfig = {
      position: 'start',
      draggable: true,
      pieceTheme: `${rootImageDirectory}/{piece}.png`,
      onDragStart : this.handleDragStart,
      onDrop : this.handleDrop,
      onSnapEnd : this.handleSnapEnd
    };
    this.board = Chessboard('myBoard', boardConfig);
    if (invert) this.board.flip()
    // Load bots -------------------------------------------------------------------
    this.botColor = this.board.orientation()==='white' ? 'b' :'w';
    this.bindListeners()
    this.sound.primeAudio(); // Prepare audio
    this.ui.primeOverlays() // Prepare hint overlays
    this.updateStatus();
    this.initBotManager();
    if (invert) this.makeMoveByBot()
  }
  // Ensures that the methods are properly binded to class
  bindMethods() {
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleSnapEnd = this.handleSnapEnd.bind(this);
    this.handleBotChange = this.handleBotChange.bind(this);
  }
  bindListeners() {
    // Prevent scrolling on mobile
    document.addEventListener('touchmove', function(e) {
      e.preventDefault();
    }, { passive: false });
    // Add option change listener
    document.getElementById('botversion').addEventListener('change', this.handleBotChange);
    // Add listeners for promotion
    const promotionButtons = document.querySelectorAll('.promotionbuttons');
    promotionButtons.forEach(button => {
      button.addEventListener('click', this.handlePromotionDisplay.bind(this));
    });
  }
  // Prep functions
  async initBotManager() { // The bot manager handles selection of bots
    const { BotManager } = await import('./engine/src/js/botmanager.js');
    this.botManager = new BotManager();
    this.botManager.loadBots();
    this.myBot = this.botManager.bots[0]
  }
  // Handle option change
  handleBotChange(event) { // Handles the DOM bot switching
    if (!this.game.isGameOver()) {
      const botIndex = Number(event.target.value)
      this.myBot = this.botManager.bots[botIndex]
      console.log(`Switched to bot: ${this.myBot.name}`)
      BoardHelpers.resetBoard(this)
      if (invert) this.makeMoveByBot()
    }
  }

  // Updates the ui's status
  updateStatus() {
      let status = '';
      const turn = this.game.turn()
      const moveColor = turn === 'w' ? 'White' : 'Black';
      if (this.game.isCheckmate()) {
        this.sound.GAMEENDSOUND.play()
        status = `Game over, ${moveColor} in checkmate.`;
      } else if (this.game.isDrawByFiftyMoves()) {
        this.sound.GAMEENDSOUND.play()
        this.status = 'Game over, drawn by 50 move rule.';
      } else if (this.game.isInsufficientMaterial()) {
        this.sound.GAMEENDSOUND.play()
        status = 'Game over, drawn by insufficient material.';
      } else if (this.game.isStalemate()) {
        this.sound.GAMEENDSOUND.play()
        status = 'Game over, drawn by stalemate';
      } else if (this.game.isDraw()) {
        this.sound.GAMEENDSOUND.play()
        status = 'Game over, drawn position.';
      } else {
        status = `${moveColor} to move`;

        if (this.gameState.inCheck) {
          // Apply king square check overlay
          status += `, ${moveColor} is in check.`;
          this.ui.applyKingSquareCheckOverlay(turn);
        }
        
      }
      this.$status.html(status);
    }
  // Main move handling pipeline
  updatePostMove(move) {
    this.gameState.inCheck = this.game.inCheck();
    if (this.gameState.inCheck) {
      this.sound.MOVECHECKSOUND.play();
    } else {
      this.sound.playMoveSounds(move);
    }

    const checkFlagged = this.gameState.checkFlagged

    // Undo king square check overlay
    if (checkFlagged && !this.game.isAttacked(checkFlagged)) {
      this.ui.undoKingSquareCheckOverlay(checkFlagged);
    }

    this.updateStatus()
  }
  handleMove(source,target,piece) {
    let move;
    if (BoardUtilities.canPromote(this.game,source,target,piece)) { 
      this.ui.handlePromotion(source,target); // Displays promotion ui for player
    } else {
      move = this.game.move({
        from: source,
        to: target, 
      });

      BoardHelpers.updatePiecesOnSquare(this.gameState,source,target) // Update the piece cache when a piece is moved

      if (!move) return 'snapback';

      this.updatePostMove(move);
    }
    return
  }
  // Send command to bot to make a move
  makeMoveByBot() {
    setTimeout(() => {
      const move = this.myBot.move(this.game);
      const source = move[0]
      const target = move[1]

      // Apply post move highlight showing which piece moved from where to where
      if (this.gameState.lastMoveDomPair) {
        this.ui.undoPostMoveHighlight()
      }

      this.ui.applyPostMoveHighlight(source,target)
      
      console.log('Evaluating...');
      console.log(`Made move: ${source} to ${target}`)

      const madeMove = this.game.move(
        {
          from:source,
          to:target,
          promotion:move[2]
        }
      );

      BoardHelpers.updatePiecesOnSquare(this.gameState,source,target)
      this.updatePostMove(madeMove);
      BoardHelpers.repositionBoard(this.board,this.game);
    }, botMovementDelayTime); 
  }
  // Main promotion handler  ------------------------------------------------------------
  handlePromotionDisplay(event) {

    if (this.gameState.promotionMove) {
      const piecePromoted = event.target.id;
      const color = this.game.turn()
      // Display promotion pieces
      this.ui.displayPromotionPieces(color,'invisible','visible')
      let source = this.gameState.promotionMove.source
      let target = this.gameState.promotionMove.target

      let move = this.game.move({
        from: source,
        to: target,
        promotion: piecePromoted
      });

      BoardHelpers.updatePiecesOnSquare(this.gameState,source,target)

      if (!move) return BoardHelpers.repositionBoard(this.board,this.game); // reset if invalid
      if (this.game.turn() === this.botColor) { // Make move by bot after promotion
        this.makeMoveByBot()
      };

      BoardHelpers.repositionBoard(this.board,this.game);
      this.updatePostMove(move);
      this.gameState.promotionMove = null;
    }
  }
  // Prevent dragging opponent pieces or when game is over
  handleDragStart(source, piece) {
    if (this.game.isGameOver()) {
      return false;
    }
    const turn = this.game.turn();
    const whiteToMove = turn === 'w';
    const isWhitePiece = piece.startsWith('w');
    if ((whiteToMove && !isWhitePiece) || (!whiteToMove && isWhitePiece) || (turn === this.botColor)) {
      return false;
    }

    if (!(this.gameState.selected && this.gameState.selectedSquare === source)) {
      if (this.gameState.selected) {
        this.ui.undoHintOverlay();
      }
      this.ui.applyHintOverlay(source, piece);
    }
    return true

  }
  // Handle piece drop
  handleDrop(source, target,piece) {
    const isSameSquare = source === target;
    // Undo hint overlay and selection logic
    if (!isSameSquare || (this.gameState.hintedSquares.size > 0 && this.gameState.selected)) {
      this.ui.undoHintOverlay();
    };
    if (isSameSquare) {
      if (this.gameState.selected && this.gameState.selectedSquare === source) {
        this.ui.undoHintOverlay();
        this.gameState.selected = false;
        this.gameState.selectedSquare = null;
      } else {
        this.ui.undoHintOverlay();
        this.ui.applyHintOverlay(source,piece);
        this.gameState.selected = true;
        this.gameState.selectedSquare = source;
      };
      return 'snapback';
    };
    optimisedClassRemoval(this.gameState.sourceDomSquare.classList,'selected-highlight') // Remove the highlight for the source piece that was selected before movement
    if (this.gameState.selected) {
      this.ui.undoHintOverlay();
      this.gameState.selected = false;
      this.gameState.selectedSquare = null;
    };
    try {
      const result = this.handleMove(source,target,piece)
      if (result) return result
    } catch (e) {
      return 'snapback'
    }

  }
  // Handle piece snap end
  handleSnapEnd(source,target) {
    this.gameState.sourceDomSquare = null;
    BoardHelpers.repositionBoard(this.board,this.game);

    // Reset before highlighting player move
    if (this.gameState.lastMoveDomPair) {
      this.ui.undoPostMoveHighlight()
    }

    this.ui.applyPostMoveHighlight(source,target)

    if (this.game.turn() === this.botColor && !this.gameState.promotionMove) {
      // Add delay to simulate bot thinking time
      this.makeMoveByBot()
    }

    this.gameState.legalMoves.clear(); // Reset legal moves
    
  }
}

const engine = new Engine()  