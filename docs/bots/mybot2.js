import { moveObjToStandardNotation, choice } from "../engine/src/js/util.js"
import { Ui } from "../engine/src/js/ui.js"
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
        this.pieceSquareTables = {
            'p':[
                0,0,0,0,0,0,0,0,
                5,5,5,5,5,5,5,5,
                1,1,2,3,3,2,1,1,
                0.5,0.5,1,2.5,2.5,1,0.5,0.5,
                0,0,0,2,2,0,0,0,
                0.5,-0.5,-1,0,0,-1,-0.5,0.5,
                0.5,1,1,-2,-2,1,1,0.5,
                0,0,0,0,0,0,0,0
            ],
            'n':[
                -5,-4,-3,-3,-3,-3,-4,-5,
                -4,-2,0,0,0,0,-2,-4,
                -3,0,1,1.5,1.5,1,0,-3,
                -3,0.5,1.5,2,2,1.5,0.5,-3,
                -3,0,1.5,2,2,1.5,0,-3,
                -3,0.5,1,1.5,1.5,1,0.5,-3,
                -4,-2,0,0.5,0.5,0,-2,-4,
                -5,-4,-3,-3,-3,-3,-4,-5
            ],
            'b':[
                -2,-1,-1,-1,-1,-1,-1,-2,
                -1,0,0,0,0,0,0,-1,
                -1,0,0.5,1,1,0.5,0,-1,
                -1,0.5,0.5,1,1,0.5,0.5,-1,
                -1,0,1,1,1,1,0,-1,
                -1,1,1,1,1,1,1,-1.0,
                -1,0.5,0,0,0,0,0.5,-1,
                -2,-1,-1,-1,-1,-1,-1,-2
            ],
            'r':[
                0,0,0,0,0,0,0,0,
                0.5,1,1,1,1,1,1,0.5,
                -0.5,0,0,0,0,0,0,-0.5,
                -0.5,0,0,0,0,0,0,-0.5,
                -0.5,0,0,0,0,0,0,-0.5,
                -0.5,0,0,0,0,0,0,-0.5,
                -0.5,0,0,0,0,0,0,-0.5,
                0,0,0,0.5,0.5,0,0,0
            ],
            'q':[
                -2,-1,-1,-0.5,-0.5,-1,-1,-2,
                -1,0,0,0,0,0,0,-1,
                -1,0,0.5,0.5,0.5,0.5,0,-1,
                -0.5,0,0.5,0.5,0.5,0.5,0,-0.5,
                0,0,0.5,0.5,0.5,0.5,0,-0.5,
                -1,0.5,0.5,0.5,0.5,0.5,0,-1,
                -1,0,0.5,0,0,0,0,-1,
                -2,-1,-1,-0.5,-0.5,-1,-1,-2
            ],
            'k':[
                -3,-4,-4,-5,-5,-4,-4,-3,
                -3,-4,-4,-5,-5,-4,-4,-3,
                -3,-4,-4,-5,-5,-4,-4,-3,
                -3,-4,-4,-5,-5,-4,-4,-3,
                -2,-3,-3,-4,-4,-3,-3,-2,
                -1,-2,-2,-2,-2,-2,-2,-1,
                2,2,0,0,0,0,2,2,
                2,3,1,0,0,1,3,2
            ]
        }
        this.positionsEvaluated = 0
        this.movesCalculated = 0
        this.transpositionTable = new Map()
        this.game = null
        this.squareIndexOf = {};
        this.pieceCountCache = {}
        for (let index=0; index<64; index++) {
            const file = String.fromCharCode('a'.charCodeAt(0) + (index % 8));
            const rank = 8 - Math.floor(index / 8);
            const square = file + rank;  // e.g. "e4"
            this.squareIndexOf[square] = { file: (index % 8), rank: rank };  // or file index, rank index
        }

    }
    getNumOfPieces(color,piece) {
        return this.game.findPiece({type:piece,color:color}).length
    }
    countMaterial(color) {
        for (const piece of ['p','n','b','r','q']) {
            this.pieceCountCache[color+piece] = this.getNumOfPieces(color, piece);
        }
        const mw = this.materialWeights;
        const cache = this.pieceCountCache
        return (
            cache[color+'p'] * mw['p'] +
            cache[color+'n'] * mw['n'] +
            cache[color+'b'] * mw['b'] +
            cache[color+'r'] * mw['r'] +
            cache[color+'q'] * mw['q']
        );
    }
    calculateEndgameWeight() {
        const pieceCountCache = this.pieceCountCache
        const totalMaterial = (
            pieceCountCache['wp'] + pieceCountCache['bp']) * 1 +
            (pieceCountCache['wn'] + pieceCountCache['bn']) * 3 +
            (pieceCountCache['wb'] + pieceCountCache['bb']) * 3 +
            (pieceCountCache['wr'] + pieceCountCache['br']) * 5 +
            (pieceCountCache['wq'] + pieceCountCache['bq']) * 9;
        const maxMaterial = 78; // Assume 16 pawns (16), 4 rooks (20), 4 bishops (12), 4 knights (12), 2 queens (18) → total 78

        // Clamp between 0 and 1
        const endgameWeight = 1 - totalMaterial / maxMaterial;
        return Math.max(0, Math.min(1, endgameWeight));
    }
    forceKingToCornerEndgameEval(friendlyKingSquare, opponentKingSquare,endGameWeight) {
        const squareIndexOf = this.squareIndexOf

        const { file: fFile, rank: fRank } = squareIndexOf[friendlyKingSquare];
        const { file: oFile, rank: oRank } = squareIndexOf[opponentKingSquare];

        const opponentKingDistFromCenter = Math.max(3 - oFile, oFile - 4) + Math.max(3 - oRank, oRank - 4);
        const distBetweenKings = Math.abs(fFile - oFile) + Math.abs(fRank - oRank);

        const score = opponentKingDistFromCenter + (14 - distBetweenKings);
        return score * 10 * endGameWeight;
    }
    eval(game,opponentColor) {
        this.pieceCountCache = {}
        this.positionsEvaluated += 1
        const whiteEval = this.countMaterial('w');
        const blackEval = this.countMaterial('b');
        let evaluation = whiteEval - blackEval;
        const endGameWeight = this.calculateEndgameWeight()
        const turn = game.turn()
        if (endGameWeight >= 1) {
            evaluation += this.forceKingToCornerEndgameEval(game.findPiece({type:'k',color:'w'})[0],game.findPiece({type:'k',color:opponentColor})[0],endGameWeight)
        }
        const perspective = turn === 'w' ? 1 : -1;
        return evaluation * perspective;
    }
    orderMoves(game, moves, opponentColor) {
        const materialWeights = this.materialWeights;
        const pieceSquareTables = this.pieceSquareTables;
        const squareIndexOf = this.squareIndexOf
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i]
            let moveScoreGuess = 0;
            const movePieceType = move.piece
            const targetSquare = move.to
            const captureSquare = game.get(targetSquare);
            const isCapture = !!move.capture;
            if (isCapture) {
                const attackerValue = materialWeights[movePieceType];
                const victimValue = materialWeights[captureSquare.type];
                moveScoreGuess = 10 * victimValue - attackerValue;
            }
            if (move.promotion) {
                moveScoreGuess += materialWeights[move.promotion];
            }
            if (isCapture && game.attackers(targetSquare, opponentColor).length > 0) {
                moveScoreGuess -= materialWeights[movePieceType];
            }
            const { file, rank } = squareIndexOf[targetSquare];
            const squareIndex = (8 - rank) * 8 + file;
            moveScoreGuess += pieceSquareTables[movePieceType][squareIndex]*10
            move.score = moveScoreGuess
        }
        moves.sort((a, b) => b.score - a.score); // descending order
    }
    quiescence(alpha,beta) {
        const game = this.game
        const opponentColor = game.turn()==='w'?'b':'w'
        let evaluation = this.eval(game,opponentColor)
        if (evaluation >= beta) return beta
        alpha = Math.max(alpha,evaluation)
        let captureMoves = game.moves({verbose:true}).filter(move=>move.capture)
        this.orderMoves(game,captureMoves,opponentColor)
        for (const captureMove of captureMoves) {
            game.move(captureMove)
            evaluation = -this.quiescence(-beta,-alpha)
            game.undo()
            if (evaluation >= beta) return beta
            alpha = Math.max(alpha,evaluation)
            this.movesCalculated += 1
        }
        return alpha
    }
    search(depth,alpha,beta) {
        const originalAlpha = alpha;
        const game = this.game
        const transpositionTable = this.transpositionTable
        if (depth == 0) return this.quiescence(alpha,beta)
        let moves = game.moves({verbose:true})
        this.orderMoves(game,moves,game.turn())
        if (moves.length === 0) {
            if (game.inCheck()) return -Infinity
            return 0
        }
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i]
            game.move(move)
            let evaluation;
            const hash = game.hash()
            const cached = transpositionTable.get(hash)

            // Get stored transposition evaluation
            if (cached && cached.depth >= depth) {
                const flag = cached.flag;
                if (flag === 0b00) { // exact
                    game.undo();
                    return cached.eval;
                } else if (flag === 0b01) { // lower bound
                    alpha = Math.max(alpha, cached.eval);
                } else if (flag === 0b10) { // upper bound
                    beta = Math.min(beta, cached.eval);
                }
                if (alpha >= beta) {
                    game.undo();
                    return cached.eval;
                }
            } else {
                evaluation = -this.search(depth-1,-beta,-alpha)
                let flag;
                if (evaluation <= originalAlpha) {
                    flag = 0b10; // upper bound
                } else if (evaluation >= beta) {
                    flag = 0b01; // lower bound
                } else {
                    flag = 0b00; // exact
                }
                transpositionTable.set(hash,{depth: depth,eval: evaluation,flag}) // Set flags
            }
            game.undo()
            if (evaluation >= beta) return beta
            alpha = Math.max(alpha,evaluation)
            this.movesCalculated += 1
        }

        return alpha
    }
    move(game) {
        this.game=  game
        const startTime = performance.now();
        let legalMoves = game.moves({verbose:true})
        let bestEval = -Infinity;
        let bestMoves = [];

        for (const move of legalMoves) {
            game.move(move); // apply move
            let evaluation = -this.search(2, -Infinity, Infinity); // depth = 2 for example
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
            moveObj.push(chosenMove.promotion); 
        } else {
            moveObj.push(null);
        }
        const endTime = performance.now();
        Ui.displayText([
            `Move: ${chosenMove.san}`, 
            `Positions evaluated: ${this.positionsEvaluated} positions`,
            `Moves calculated: ${this.movesCalculated} moves`,
            `Completed in ${((endTime-startTime)/1000).toFixed(3)} seconds`,
            `Bot eval: ${(bestEval/100)>0?'+':''}${bestEval/100} points for Black`
        ]);
        this.positionsEvaluated = 0
        this.movesCalculated = 0
        return moveObj;
    }


}
export const bot2 = new MyBot()
