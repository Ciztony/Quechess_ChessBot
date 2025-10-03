import { getLegalMoves } from "./engine.js"
import { moveObjToStandardNotation, choice } from "./engine/src/js/util.js"
// A bot that actually carries out standard eval
class MyBot {
    constructor() {
        this.materialWeights = {
            'p':100,
            'b':350,
            'n':350,
            'r':525,
            'q':1000,
            'k':10000
        }
        this.mobilityWeights = {
            'p':100,
            'b':350,
            'n':350,
            'r':525,
            'q':1000,
            'k':10000
        }
    }
    getNumOfPieces(game,piece) {
        return game.findPiece(piece).length
    }
    eval(game) {
        // Standard eval from https://www.chessprogramming.org/Evaluation
        let materialWweights = this.materialWeights
        let getNumOfPieces = this.getNumOfPieces
        let materialScore;
        let moves = game.moves()
        for (const [notation,piece] in Object.entries(materialWeights)) {
            let uppercase = piece.toUpperCase()
            materialScore += weights.get(notation) * (getNumOfPieces('w'+uppercase)-getNumOfPieces('b'+uppercase))
        }
        for (const move of moves) {

        }

        


    }
}
export const smartBot = new MyBot()