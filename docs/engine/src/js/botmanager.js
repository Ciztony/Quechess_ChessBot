import { bot1 } from '../../../bots/mybot1.js';
import { bot2 } from '../../../bots/mybot2.js';

export class BotManager {
    constructor() {
        this.bots = [bot2,bot1];
        this.botDom = [];
        this.botOption = document.getElementById('botversion')
    }
    loadBots() {
        for (const [index,bot] of this.bots.entries()) {
            console.log('Loaded bot: ',bot.name)
            const botOption = document.createElement('option')
            botOption.innerText = bot.name
            botOption.value = String(index)
            this.botOption.appendChild(botOption)
        }
    }
}