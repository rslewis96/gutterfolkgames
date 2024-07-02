
export default class Player {

    private socketID: string     
    private screenName: string   
    private mascot: string
    private chatHandle: string //First initial + mascot
    private score: number = 0
    private cards: string[]
    private cardTzar: boolean
    private remainingDiscards: number

    constructor(newSocketID: string, newScreenName: string, newMascot: string, initialCards: string[]) {
        this.socketID = newSocketID
        this.screenName = newScreenName
        this.mascot = newMascot
        this.chatHandle = newScreenName.substr(0,1) + newMascot
        this.cards = initialCards
        this.cardTzar = false
        this.remainingDiscards = 8
    }

    public get SocketID(): string { return this.socketID }

    public get ScreenName(): string { return this.screenName }

    public get Mascot(): string { return this.mascot }

    public get ChatHandle(): string { return this.chatHandle }

    public get Score(): number { return this.score }

    public get PlayerCards(): string[] { return this.cards }

    public get CardTzar(): boolean { return this.cardTzar }

    public get DiscardsRemaining(): number { return this.remainingDiscards }


    public setCardTzarStatus(newCT: boolean) {
        this.cardTzar = newCT
    }

    public addPoint() {
        this.score += 1
    }

    public addNewCard (newCard: string) {
        this.cards.push(newCard)
    }

    public updatePlayerInfo (newSocketID: string, newMascot: string) {
        this.socketID = newSocketID
        this.mascot = newMascot
        this.chatHandle = this.screenName.substr(0,1) + newMascot    
    }

    public removeCardByIndex(cardID: number) {
        let newCardList: string[] = []
        
        for(var i=0; i<this.cards.length; i++){
            if (i != cardID)
                newCardList.push(this.cards[i])
        }

        this.cards = newCardList    
    }

    public DeincrementDiscardAllowance() {
        if (this.remainingDiscards > 0) 
            this.remainingDiscards -= 1
    }
    

}
