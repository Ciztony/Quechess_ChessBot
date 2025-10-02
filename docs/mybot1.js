import { getLegalMoves } from "./engine.js"
import { moveObjToStandardNotation, choice } from "./engine/src/js/util.js"
// A bot that plays random moves
class MyBot {
    move(game,color) {
        let legalMoves = getLegalMoves(game,color)
        //console.log(legalMoves)
        let randomMove = choice(legalMoves)
        //console.log(randomMove)
        let moveObj = moveObjToStandardNotation(randomMove)
        if (randomMove.isPromotion()) {
            moveObj.push(choice(['q','r','n','b']))
        } else {
            moveObj.push(null)
        }
        //console.log(moveObj)
        return moveObj
    }
}
export const dumbBot = new MyBot()

