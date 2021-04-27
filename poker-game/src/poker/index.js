import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Board from './board';
import { BIG_BLIND } from './config';

class Poker extends React.Component {
    constructor(props) {
		super(props);

		this.state = {
            started: false,
            betSize: 0,
            handState: null,
            socketId: null
        };
        
        this.handleChangeBetSize = this.handleChangeBetSize.bind(this);
	}
    componentDidMount () {
        const socket = io("wss://poker-server-2.herokuapp.com/", {
            reconnectionDelayMax: 10000,
            transports: ["websocket"]
        });
        socket.on("playerConnected", (data) => {
            console.log(data);
            this.setState({
                socketId: data
            });
        });
        socket.on("receiveHandState", this.receiveHandState);
        socket.on("playerleft", (data) => {
            this.setState({
                started: false
            })
        });
        this.setState({
            ws: socket, 
        });
    }
    componentWillUnmount() {
        this.state.ws.disconnect();
    }

    calculateMinRaiseSize = (opponentCurrentBet, playercurrentBet, lastRaiser) => {
        if (lastRaiser == null) {
            return 2 * BIG_BLIND;
        } else {
            return 2 * opponentCurrentBet - playercurrentBet;
        }
    }

    getOpponentId = ( handState) => {
        const { socketId } = this.state;

        const filterArray = Object.keys(handState.playerStacks).filter((playerId) => {
            return playerId != socketId;
        })
        const opponentId = filterArray[0];
        return opponentId;
    }

    receiveHandState = (handState) => {
        const { socketId } = this.state;
        console.log(JSON.parse(handState));
        const parsedHandState = JSON.parse(handState);
        // get last raise size of opponent, opponentCurrentBet - playerCurrentBet
        // if lastRaiser is null then min raise is twice big blind
        const opponentId = this.getOpponentId(parsedHandState);

        this.setState ({
            handState: parsedHandState,
            betSize: this.calculateMinRaiseSize(parsedHandState.currentTurnBets[opponentId], parsedHandState.currentTurnBets[socketId], parsedHandState.lastRaiser)
        });
    }

    handleChangeBetSize = (event) => {
        const { socketId, handState } = this.state;
        var value = event.target.value;
        if (value > handState.currentTurnBets[socketId] + handState.playerStacks[socketId]) {
            value = handState.currentTurnBets[socketId] + handState.playerStacks[socketId];
        }
        this.setState({
            betSize: value
        });
    }

    fold = () => {
        const { ws } = this.state;
        const action = {
            actionType: "fold"
        };
        ws.emit("playerAction", JSON.stringify(action));
    }

    raise = () => {
        const { ws, betSize } = this.state;
        const action = {
            actionType: "raise",
            betSize: parseInt(betSize)
        };
        ws.emit("playerAction", JSON.stringify(action));
    }

    call = () => {
        const { ws } = this.state;
        const action = {
            actionType: "call"
        };
        ws.emit("playerAction", JSON.stringify(action));
    }

    check = () => {
        const { ws } = this.state;
        const action = {
            actionType: "check"
        };
        ws.emit("playerAction", JSON.stringify(action));
    }

    render () {
        const { betSize, socketId, handState } = this.state;
        // get the opponent id from filter keys
        console.log(this.state);
        // get board by checking boardTurn
        if (handState != null && socketId != null) {
            const filterArray = Object.keys(handState.playerStacks).filter((playerId) => {
                return playerId != socketId;
            })
            const turn = handState.boardTurn;
            const opponentId = filterArray[0];
            const isPlayerTurn = socketId == handState.playerTurn;
            const isCheckAllowed = handState.currentTurnBets[socketId] == handState.currentTurnBets[opponentId];
            const isCallAllowed = handState.currentTurnBets[socketId] < handState.currentTurnBets[opponentId];
            console.log(isCallAllowed);
            const isRaiseAllowed = handState.currentTurnBets[opponentId] < handState.playerStacks[socketId];
            return <div>
            <p>Poker</p>
            <React.Fragment>
                <div>opponent stack + bet {turn == 4 && "+ hand"}</div>
                <div>{handState.playerStacks[opponentId]} - {handState.currentTurnBets[opponentId]} {turn == 4 && "- "+ handState.playerHands[opponentId]}</div>
                <div>
                    <Board boardArray={handState.board} turn={handState.boardTurn}/>
                </div>
                <div>PotSize - {handState.potSize}</div>
                <div>your hand + stack + bet </div>
                <div>{handState.playerHands[socketId]} - {handState.playerStacks[socketId]} - {handState.currentTurnBets[socketId]}</div>
                {isPlayerTurn && (
                    <React.Fragment>
                        <input 
                            type="number" 
                            name="bet size" 
                            value={betSize} 
                            min={this.calculateMinRaiseSize(handState.currentTurnBets[opponentId], handState.currentTurnBets[socketId], handState.lastRaiser)}
                            max={handState.currentTurnBets[socketId] + handState.playerStacks[socketId]}  
                            onChange={this.handleChangeBetSize} />
                        <button onClick={this.fold}>Fold</button>
                        {isCheckAllowed && <button onClick={this.check}>Check</button>}
                        {isCallAllowed && <button onClick={this.call}>Call</button>}
                        {isRaiseAllowed && <button onClick={this.raise}>Raise</button>}
                    </React.Fragment>
                )}
                
            </React.Fragment>
        </div>
        } else {
            return <div>
                <p>Poker - Loading ...</p>
            </div>
        }
    }
}
export default Poker;