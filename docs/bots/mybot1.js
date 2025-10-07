import { moveObjToStandardNotation, choice } from "../engine/src/js/util.js"
// A bot that plays random moves
class MyBot {
    constructor() {
        this.name = 'Dumb Bot'
    }
    move(game) {
        let legalMoves = game.moves({verbose:true})
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
export const bot1 = new MyBot()

