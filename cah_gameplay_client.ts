type BananaGame = {
    gameState: "Not Started" | "Round: Submitting Cards" | "Round: Tzar Selection" | "Round: Results"
    currentPromptCard: string  
    playerScoreBoard: OtherPlayer[]
    submittedCards: submittedCard[]
    submittedCardCount: number
    chatMessages: ChatMessage[]
}

type BananaPlayer = {
    screenName: string
    mascot: string
    chatHandle: string    
    score: number
    cardTzar: boolean
    cards: string[]
    remainingDiscards: number
}

type OtherPlayer = {
    screenName: string
    mascot: string
    score: number
    cardTzar: boolean
}

type ChatMessage = {
    ID: number
    Type: "GameMessage" | "PlayerMessage"
    SenderScreenName: string
    SenderChatHandle: string
    Text: string
}


type LoginInfo = {
    ScreenName: string
    SentFrom: string
    Password: string
    Mascot: string
}

type submittedCard = {
    SubmitterSocketID: string
    SubmitterScreenName: string
    CardText: string
    WinningCard: boolean
}





class Client {

    private socket: SocketIOClient.Socket
    private socketIDServer: string
    
    private bananaGame: BananaGame    
    private bananaPlayer: BananaPlayer
    private inDiscardMode: boolean
    

    constructor() {
        this.socket = io();

        this.socket.on("connect", function () {
            console.log("connect")
        })

        this.socket.on("disconnect", function (message: any) {
            console.log("disconnect " + message)
            location.reload();
        })

        this.socket.on("serverSocketID", (serverSocketIDString: string) => {
            this.socketIDServer = serverSocketIDString
            this.bananaPlayer = <BananaPlayer> {}
            this.bananaGame = <BananaGame> {}
            this.bananaGame.chatMessages = []
            this.inDiscardMode = false
        })

        this.socket.on("errorMessage", (errorText: string) => {
            window.alert(errorText)
        })
        
        this.socket.on("bananaGameInfo", (game: BananaGame, player: BananaPlayer, otherPlayers: OtherPlayer[], submittedCards: submittedCard[]) => {
            console.log(game.gameState)
            this.bananaGame = game
            this.bananaGame.playerScoreBoard = otherPlayers
            this.bananaGame.submittedCards = submittedCards
            if (submittedCards === null) this.bananaGame.submittedCardCount = 0
            else this.bananaGame.submittedCardCount = submittedCards.length            
            this.bananaPlayer = player
            this.bananaPlayer.cards = player.cards

            console.log(player)

            this.updatePromptCard() //This uses the game state + number of players to set and enable the prompt card
            this.updatePlayerScoreTable() //This can always get updated, regardless of the game state
            this.updatePlayersCards() //This uses the game state and player cards array to enable/disable + set text
            this.updateDiscardButton()

            if (game.gameState === "Not Started") this.applyGameStateNotStarted()
            else if (game.gameState === "Round: Submitting Cards") this.applyGameStateRoundSubmittingCards()
            else if (game.gameState === "Round: Tzar Selection") this.applyGameStateRoundTzarSelection()
            else if (game.gameState === "Round: Results") this.applyGameStateRoundResults()
        })
        


        this.socket.on("showGame", (player: BananaPlayer) => {
            $('#signInPanel').alert().hide()
            $('#gameRow1').alert().show()
            $('#gameRow2').alert().show()

            this.bananaPlayer = player
            $('#playerCardLegend').text(this.bananaPlayer.screenName + "'s Cards")
        }) 

            

        this.socket.on("chatMessages", (chatMessages: ChatMessage[]) => {

            $("#messages div").remove()

            let newMessageHTML: string = "";
            for (let chatMessage of chatMessages) {
                newMessageHTML += this.generateMessageHTML(chatMessage)
            }

            $("#messages").append(newMessageHTML)
            this.scrollChatWindow()

            this.bananaGame.chatMessages = chatMessages
        })





        $(document).ready(() => {
            this.showThisNumberOfSubmittedCards(0, "Hidden Cards")
            //$('#gameRow1').alert().hide()
            //$('#gameRow2').alert().hide()
            $('signInPanel').alert().hide() //TEMPORARY

            this.ShowOrHidePlayerInfoBubble("Hide", "")
            this.ShowOrHideCardTzarBubble("Hide", "")
            this.ShowOrHideSubmittedCardBubbles("Hide")

            $('#messageText').keypress((e) => {
                var key = e.which;
                if (key == 13)  // the enter key code
                {
                    this.sendMessage()
                    return false;
                }
            });
        })
    }


    // From the SUBMIT button
    public submitLoginInfo() {
        console.log(this.socket.id)

        let screenName = $("#screenNameTextBox").val();
        let password = $("#passwordTextBox").val();
        let mascot: string = ""
        if (document.querySelector('input[name=radio]:checked') != null)
            mascot = document.querySelector('input[name=radio]:checked').id

        if (screenName === "") window.alert("Please enter your name.")
        else if (password === "") window.alert("Please enter the password.")
        else if (mascot === "") window.alert("Please select a mascot.")
        else
            this.socket.emit("sendLoginInfo", <LoginInfo>{ ScreenName: screenName, 
                SentFrom: this.socketIDServer, Password: password, Mascot: mascot})
    }


    // From the Messages box SEND button
    public sendMessage() {
        let messageText = $("#messageText").val();
        if (messageText.toString().length > 0) {
            this.socket.emit("chatMessage", this.socketIDServer, messageText)
            $("#messageText").val("");
        }
    }


    // From any of the player's cards buttons
    private singleClick: number //If they've clicked on a card once, the card ID will be stored here
    public submitCard(cardID: number) {
        if (this.bananaPlayer.cardTzar) return

        if (this.inDiscardMode)
        {
            this.socket.emit("requestDiscard", this.socketIDServer, cardID-1)
            this.inDiscardMode = false
            this.ShowOrHidePlayerInfoBubble("Hide", "")
            return
        }

        if (cardID === this.singleClick)
            this.socket.emit("submitCard", this.socketIDServer, cardID-1)
        else
        {
            this.singleClick = cardID
            this.ShowOrHidePlayerInfoBubble("Show", "🍌 says: Click again to confirm selection!")
        }
    }


    // From the prompt card button
    public startNewRound()
    {
        if (this.bananaGame.gameState === "Not Started" || this.bananaGame.gameState === "Round: Results" || this.bananaPlayer.screenName === "Anna")
            this.socket.emit("requestNewRound", this.socketIDServer)
        else
            window.alert("Round currently in play, cannot start new round.")
    }


    // From the card tzar's selected submitted card
    public selectWinningCard(cardID) {
        this.socket.emit("submitTzarSelection", this.socketIDServer, cardID-1)
    }


    // From the player's trash can button 
    public trashCanActivated() {
        if (this.inDiscardMode === false) {
            this.enableOrDisablePlayerCards("Enabled")            
            this.inDiscardMode = true
            this.ShowOrHidePlayerInfoBubble("Show", "🍌 says: Click a card to discard, or click the trash can button to cancel.")
        }
        else {
            this.inDiscardMode = false
            this.updatePlayersCards()
            this.ShowOrHidePlayerInfoBubble("Hide", "")
        }
    }






    // ****************GAME STATE FUNCTIONS*************************//

    // NOT STARTED
    private applyGameStateNotStarted() {
        this.showThisNumberOfSubmittedCards(0, "Hidden Cards")
    }

    // ROUND: SUBMITTING CARDS
    private applyGameStateRoundSubmittingCards() {
        $(".promptCard").text(this.bananaGame.currentPromptCard)
        this.enableOrDisableSubmissionCards("Disabled")
        this.showThisNumberOfSubmittedCards(this.bananaGame.submittedCardCount, "Hidden Cards")
        this.ShowOrHideSubmittedCardBubbles("Hide")
        if (this.bananaPlayer.cards.length === 5) this.singleClick = null
        if (this.bananaPlayer.cardTzar) this.ShowOrHidePlayerInfoBubble("Show", "🍌 says: You're the Card Tzar, so just sit tight for now!")
    }

    // ROUND: TZAR SELECTION
    private applyGameStateRoundTzarSelection() {
        this.bananaGame.submittedCardCount = this.bananaGame.submittedCards.length
        this.showThisNumberOfSubmittedCards(this.bananaGame.submittedCardCount, "Shown Cards")
        this.ShowOrHideCardTzarBubble("Show", "🍌 says: Ok Card Tzar, time to pick your winner!")
        if (this.bananaPlayer.cardTzar) 
        {
            this.enableOrDisableSubmissionCards("Enabled")
            this.ShowOrHidePlayerInfoBubble("Hide","")
        }
    }

    // ROUND: RESULTS
    private applyGameStateRoundResults() {
        this.enableOrDisableSubmissionCards("Disabled")
        this.ShowOrHideCardTzarBubble("Hide", "")
        this.ShowOrHideSubmittedCardBubbles("Show")
        //Do something to the submission cards to indicate the winning card
    }

   // ****************GAME STATE FUNCTIONS*************************//




    // CHAT FUNCTIONS
    private scrollChatWindow() {
        (<HTMLInputElement> document.getElementById("messages")).scrollTop = 99999999 //Set to very high number, maximum value gets chosen
    }


    private generateMessageHTML (chatMessage: ChatMessage) : string {
   
        let messageClass: string;
        if (chatMessage.Type === "GameMessage") messageClass = "gameMessage"
        else if (chatMessage.SenderScreenName === this.bananaPlayer.screenName) messageClass = "myMessage"
        else messageClass = "otherMessage"

        let circleHTML: string = "<div class='circle'>" + chatMessage.SenderChatHandle + "</div>"
        let messageBubbleHTML: string = "<div class='" + messageClass + "'>" + chatMessage.Text + "</div>"

        let messageHTML: string; //Example: <div class="messageHolderFromLeft"><div class="circle">AK</div><div class='myMessage'>Hello world!</div></div>
        if (messageClass === "otherMessage")
            messageHTML = "<div class='messageHolderFromRight'>" + messageBubbleHTML + circleHTML + "</div>"
        else
            messageHTML = "<div class='messageHolderFromLeft'>" + circleHTML + messageBubbleHTML + "</div>"

        return messageHTML
    }

    private getLoadedChatMessageByID (ID: number): ChatMessage {
        for (let chatMessage of this.bananaGame.chatMessages) {
            if (chatMessage.ID === ID)
                return chatMessage
        }
        return null
    }





    private updatePromptCard()
    {
        if (this.bananaGame.playerScoreBoard.length < 3)
        {
            $(".promptCard").text("Waiting for at least 3 players to join the game...");
            (<HTMLInputElement> document.getElementById("promptCard")).disabled = true;
            $('#promptCard').css("animation", "");
        }
        else if (this.bananaGame.gameState === "Not Started")
        {
            $(".promptCard").text("Click this card to begin a new round!");
            (<HTMLInputElement> document.getElementById("promptCard")).disabled = false; 
            $('#promptCard').css("animation", "glowing 1000ms infinite");
                                  
        }
        else
        {
            $(".promptCard").text(this.bananaGame.currentPromptCard)
            if (this.bananaGame.gameState === "Round: Results")
            {
                (<HTMLInputElement> document.getElementById("promptCard")).disabled = false; 
                $('#promptCard').css("animation", "glowing 1000ms infinite");
            }
            else
            {
                (<HTMLInputElement> document.getElementById("promptCard")).disabled = true; 
                $('#promptCard').css("animation", "");
            }    
        }
    }





    private updatePlayerScoreTable() {
        $("#scoreTable tr").remove()
        $("#scoreTable").append("<tr><th>Card Tzar</th><th>Player</th><th>Points</th></tr>")

        for (let onePlayer of this.bananaGame.playerScoreBoard) {
            if (onePlayer.cardTzar === true)
                $("#scoreTable").append("<tr> <td>⭐</td> <td>" + onePlayer.mascot + onePlayer.screenName + "</td><td>" + onePlayer.score + "</td></tr>")
            else
                $("#scoreTable").append("<tr> <td></td> <td>" + onePlayer.mascot + onePlayer.screenName + "</td><td>" + onePlayer.score + "</td></tr>")
          }
    }



    private updatePlayersCards() {

        if (this.bananaPlayer.cards === null) return;

        $(".playerCardText1").text(this.bananaPlayer.cards[0])
        $(".playerCardText2").text(this.bananaPlayer.cards[1])
        $(".playerCardText3").text(this.bananaPlayer.cards[2])
        $(".playerCardText4").text(this.bananaPlayer.cards[3])
        $(".playerCardText5").text(this.bananaPlayer.cards[4])

        if (this.bananaPlayer.cards.length === 5)
        {
            $("#playerCard6").alert().hide()
            $("#hiddenplayerCard6").alert().show()
            this.ShowOrHidePlayerInfoBubble("Hide", "")
        }
        else
        {
            $("#hiddenplayerCard6").alert().hide()
            $("#playerCard6").alert().show()
            $(".playerCardText6").text(this.bananaPlayer.cards[5])
        }

        if (this.bananaGame.gameState === "Round: Submitting Cards" && 
            this.bananaPlayer.cards.length === 6 && this.bananaPlayer.cardTzar === false)
                this.enableOrDisablePlayerCards("Enabled")
        else 
            this.enableOrDisablePlayerCards("Disabled")
    }


    private enableOrDisablePlayerCards(action: "Enabled" | "Disabled")
    {
        if (this.inDiscardMode) return //Discard mode supersedes all calls to this function

        if (action === "Disabled")
        {
            (<HTMLInputElement> document.getElementById("playerCard1")).disabled = true;
            (<HTMLInputElement> document.getElementById("playerCard2")).disabled = true;
            (<HTMLInputElement> document.getElementById("playerCard3")).disabled = true;
            (<HTMLInputElement> document.getElementById("playerCard4")).disabled = true;
            (<HTMLInputElement> document.getElementById("playerCard5")).disabled = true;
            (<HTMLInputElement> document.getElementById("playerCard6")).disabled = true;
        }
        else
        {
            (<HTMLInputElement> document.getElementById("playerCard1")).disabled = false;
            (<HTMLInputElement> document.getElementById("playerCard2")).disabled = false;
            (<HTMLInputElement> document.getElementById("playerCard3")).disabled = false;
            (<HTMLInputElement> document.getElementById("playerCard4")).disabled = false;
            (<HTMLInputElement> document.getElementById("playerCard5")).disabled = false;
            (<HTMLInputElement> document.getElementById("playerCard6")).disabled = false;
        }
    }


    private ShowOrHidePlayerInfoBubble(action: "Show" | "Hide", bubbleText: string)
    {
        $('#playerInfoBubble').alert().hide()

        if (action === "Show")
        {
            $('#playerInfoBubble').alert().show()
            $(".PlayerInfoText").text(bubbleText)
        }
    }



   
    private updateDiscardButton()
    {
        $(".trashButtonText").text("🗑️:" + this.bananaPlayer.remainingDiscards)
        if (this.bananaPlayer.remainingDiscards === 0)
            (<HTMLInputElement> document.getElementById("trashButton")).disabled = true;
    }




    private showThisNumberOfSubmittedCards(thisNumber: number, cardsState: "Hidden Cards" | "Shown Cards")
    {
        $("#submittedCard1").alert().hide()
        $("#submittedCard2").alert().hide()
        $("#submittedCard3").alert().hide()
        $("#submittedCard4").alert().hide()
        $("#submittedCard5").alert().hide()
        $("#submittedCard6").alert().hide()

        $("#hiddenSubmittedCard1").alert().show()
        $("#hiddenSubmittedCard2").alert().show()
        $("#hiddenSubmittedCard3").alert().show()
        $("#hiddenSubmittedCard4").alert().show()
        $("#hiddenSubmittedCard5").alert().show()
        $("#hiddenSubmittedCard6").alert().show()

        if (thisNumber >=1) 
        {
            $("#submittedCard1").alert().show()
            $("#hiddenSubmittedCard1").alert().hide()
        }
        if (thisNumber >=2) 
        {
            $("#submittedCard2").alert().show()
            $("#hiddenSubmittedCard2").alert().hide()
        }
        if (thisNumber >=3) 
        {
            $("#submittedCard3").alert().show()
            $("#hiddenSubmittedCard3").alert().hide()
        }
        if (thisNumber >=4) 
        {
            $("#submittedCard4").alert().show()
            $("#hiddenSubmittedCard4").alert().hide()
        }            
        if (thisNumber >=5) 
        {
            $("#submittedCard5").alert().show()
            $("#hiddenSubmittedCard5").alert().hide()
        }
        if (thisNumber >=6) 
        {
            $("#submittedCard6").alert().show()
            $("#hiddenSubmittedCard6").alert().hide()
        }

        if (cardsState === "Hidden Cards")
        {
            $(".submittedCardText1").text("🍌")
            $(".submittedCardText2").text("🍌")
            $(".submittedCardText3").text("🍌")
            $(".submittedCardText4").text("🍌")
            $(".submittedCardText5").text("🍌")
            $(".submittedCardText6").text("🍌")
        }
        else if (cardsState === "Shown Cards")
        {
            if (this.bananaGame.submittedCardCount >=1) $(".submittedCardText1").text(this.bananaGame.submittedCards[0].CardText)
            if (this.bananaGame.submittedCardCount >=2) $(".submittedCardText2").text(this.bananaGame.submittedCards[1].CardText)
            if (this.bananaGame.submittedCardCount >=3) $(".submittedCardText3").text(this.bananaGame.submittedCards[2].CardText)
            if (this.bananaGame.submittedCardCount >=4) $(".submittedCardText4").text(this.bananaGame.submittedCards[3].CardText)
            if (this.bananaGame.submittedCardCount >=5) $(".submittedCardText5").text(this.bananaGame.submittedCards[4].CardText)
            if (this.bananaGame.submittedCardCount >=6) $(".submittedCardText6").text(this.bananaGame.submittedCards[5].CardText)
        }
    }


    private enableOrDisableSubmissionCards(action: "Enabled" | "Disabled")
    {
        if (action === "Disabled")
        {
            (<HTMLInputElement> document.getElementById("submittedCard1")).disabled = true;
            (<HTMLInputElement> document.getElementById("submittedCard2")).disabled = true;
            (<HTMLInputElement> document.getElementById("submittedCard3")).disabled = true;
            (<HTMLInputElement> document.getElementById("submittedCard4")).disabled = true;
            (<HTMLInputElement> document.getElementById("submittedCard5")).disabled = true;
            (<HTMLInputElement> document.getElementById("submittedCard6")).disabled = true;
        }
        else
        {
            (<HTMLInputElement> document.getElementById("submittedCard1")).disabled = false;
            (<HTMLInputElement> document.getElementById("submittedCard2")).disabled = false;
            (<HTMLInputElement> document.getElementById("submittedCard3")).disabled = false;
            (<HTMLInputElement> document.getElementById("submittedCard4")).disabled = false;
            (<HTMLInputElement> document.getElementById("submittedCard5")).disabled = false;
            (<HTMLInputElement> document.getElementById("submittedCard6")).disabled = false;
        }
    }

    private ShowOrHideCardTzarBubble(action: "Show" | "Hide", bubbleText: string)
    {
        $('#tzarInfoBubble').alert().hide()

        if (action === "Show" && this.bananaPlayer.cardTzar)
        {
            $('#tzarInfoBubble').alert().show()
            $(".TzarInfoText").text(bubbleText)
        }
    }


    private ShowOrHideSubmittedCardBubbles(action: "Show" | "Hide") 
    {
        $("#submittedCardInfoBubble1").alert().hide()
        $("#submittedCardInfoBubble2").alert().hide()
        $("#submittedCardInfoBubble3").alert().hide()
        $("#submittedCardInfoBubble4").alert().hide()
        $("#submittedCardInfoBubble5").alert().hide()
        $("#submittedCardInfoBubble6").alert().hide()

        if (action === "Show")
        {
            if (this.bananaGame.submittedCards.length >=1) 
            {
                $("#submittedCardInfoBubble1").alert().show()
                if (this.bananaGame.submittedCards[0].WinningCard)
                    $(".submittedCardInfoBubbleText1").text("🏆 " + this.bananaGame.submittedCards[0].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText1").text(this.bananaGame.submittedCards[0].SubmitterScreenName)
            }
            if (this.bananaGame.submittedCards.length >=2) 
            {
                $("#submittedCardInfoBubble2").alert().show()
                if (this.bananaGame.submittedCards[1].WinningCard)
                    $(".submittedCardInfoBubbleText2").text("🏆 " + this.bananaGame.submittedCards[1].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText2").text(this.bananaGame.submittedCards[1].SubmitterScreenName)
            }
            if (this.bananaGame.submittedCards.length >=3) 
            {
                $("#submittedCardInfoBubble3").alert().show()
                if (this.bananaGame.submittedCards[2].WinningCard)
                    $(".submittedCardInfoBubbleText3").text("🏆 " + this.bananaGame.submittedCards[2].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText3").text(this.bananaGame.submittedCards[2].SubmitterScreenName)
            }
            if (this.bananaGame.submittedCards.length >=4) 
            {
                $("#submittedCardInfoBubble4").alert().show()
                if (this.bananaGame.submittedCards[3].WinningCard)
                    $(".submittedCardInfoBubbleText4").text("🏆 " + this.bananaGame.submittedCards[3].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText4").text(this.bananaGame.submittedCards[3].SubmitterScreenName)
            }
            if (this.bananaGame.submittedCards.length >=5) 
            {
                $("#submittedCardInfoBubble5").alert().show()
                if (this.bananaGame.submittedCards[4].WinningCard)
                    $(".submittedCardInfoBubbleText5").text("🏆 " + this.bananaGame.submittedCards[4].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText5").text(this.bananaGame.submittedCards[4].SubmitterScreenName)
            }
            if (this.bananaGame.submittedCards.length >=6) 
            {
                $("#submittedCardInfoBubble6").alert().show()
                if (this.bananaGame.submittedCards[5].WinningCard)
                    $(".submittedCardInfoBubbleText6").text("🏆 " + this.bananaGame.submittedCards[5].SubmitterScreenName)
                else
                    $(".submittedCardInfoBubbleText6").text(this.bananaGame.submittedCards[5].SubmitterScreenName)
            }


        }
    }



}

const client = new Client(); 
