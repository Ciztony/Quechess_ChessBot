import { getLegalMoves } from "../engine.js"
import { moveObjToStandardNotation, choice } from "../engine/src/js/util.js"
import { TextDisplay } from "../engine/src/js/textdisplay.js"
// A bot that actually carries out standard eval
class MyBot {
    constructor() {
        this.name = 'Smart Bot'
        this.materialWeights = {
            'p':100,
            'b':350,
            'n':350,
            'r':525,
            'q':1000,
            'k':10000
        }
        this.movesCalculated = 0
    }
    getNumOfPieces(game,color,piece) {
        return game.findPiece({type:piece,color:color}).length
    }
    countMaterial(game,color) {
        let material = 0
        const materialWeights = this.materialWeights
        const getNumOfPieces = this.getNumOfPieces
        material += getNumOfPieces(game,color,'p')*materialWeights['p'];
        material += getNumOfPieces(game,color,'n')*materialWeights['n'];
        material += getNumOfPieces(game,color,'b')*materialWeights['b'];
        material += getNumOfPieces(game,color,'r')*materialWeights['r'];
        material += getNumOfPieces(game,color,'q')*materialWeights['q'];
        return material
    }
    eval(game) {
        const whiteEval = this.countMaterial(game,'w');
        const blackEval = this.countMaterial(game,'b');
        const evaluation = whiteEval - blackEval;
        const perspective = game.turn() === 'w' ? 1 : -1;
        return evaluation * perspective;
    } 
    orderMoves(game, moves, color) {
        const materialWeights = this.materialWeights;
        moves.forEach(move => {
            let moveScoreGuess = 0;
            const movePieceType = game.get(move.from).type;
            const captureSquare = game.get(move.to);
            const isCapture = captureSquare !== undefined;
            if (isCapture) {
                moveScoreGuess = 10 * materialWeights[captureSquare.type];
            }
            if (move.promotion) {
                moveScoreGuess += materialWeights[move.promotion];
            }
            const pawnAttackersOfMove = new Set(
                [...game.attackers(move.to, color)].filter(square => game.get(square).type === 'p')
            );
            if (pawnAttackersOfMove.has(move.to)) {
                moveScoreGuess -= materialWeights[movePieceType];
            }
            move.score = moveScoreGuess; // assign score to move object
        });

        moves.sort((a, b) => b.score - a.score); // descending order
    }
    search(depth,game,alpha,beta) {
        if (depth == 0) {
            return this.eval(game)
        }
        let moves = game.moves({verbose:true})
        this.orderMoves(game,moves,game.turn())
        if (moves.length === 0) {
            if (game.inCheck()) {
                return -Infinity
            }
            return 0
        }


        for (const move of moves) {
            game.move({from:move.from,to:move.to,promotion:move.promotion})
            const evaluation = -this.search(depth-1,game, -beta,-alpha)
            this.movesCalculated += 1
            game.undo()
            if (evaluation >= beta) {
                return beta
            }
            alpha = Math.max(alpha,evaluation)
        }

        return alpha
    }
    move(game) {
        let legalMoves = getLegalMoves(game);
        let bestEval = -Infinity;
        let bestMoves = [];

        for (const move of legalMoves) {
            game.move(move); // apply move
            let evaluation = -this.search(2, game, -Infinity, Infinity); // depth = 2 for example
            game.undo();

            if (evaluation > bestEval) {
                bestEval = evaluation;
                bestMoves = [move];
            } else if (evaluation === bestEval) {
                bestMoves.push(move);
            }
        }

        // Pick randomly among equally good best moves
        let chosenMove = choice(bestMoves);
        let moveObj = moveObjToStandardNotation(chosenMove);

        if (chosenMove.promotion) {
            moveObj.push(chosenMove.promotion); // or choice(['q','r','b','n']) if you want randomness
        } else {
            moveObj.push(null);
        }

        TextDisplay.displayText(`Best Evalulation: ${bestEval}, Positions calculated: ${this.movesCalculated}`);
        this.movesCalculated = 0
        return moveObj;
    }


}
export const bot2 = new MyBot()