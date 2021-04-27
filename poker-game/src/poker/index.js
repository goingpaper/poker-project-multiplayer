import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Board from './board';

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
        const socket = io("ws://localhost:3000", {
            reconnectionDelayMax: 10000,
            transports: ["websocket"]
        });
        socket.on("playerConnected", (data) => {
            console.log(data);
            this.setState({
                socketId: data
            });
        });
        socket.on("started", (data) => {
            this.setState({
                started: true
            })
        });
        socket.on("receiveHandState", this.receiveHandState);
        socket.on("playerleft", (data) => {
            this.setState({
                started: false
            })
        });
        const action = {
            actionType: "check"
        };
        this.setState({
            ws: socket, 
        });
    }
    componentWillUnmount() {
        this.state.ws.disconnect();
    }

    receiveHandState = (handState) => {
        console.log(JSON.parse(handState));
        this.setState ({
            handState: JSON.parse(handState)
        });
    }

    handleChangeBetSize = (event) => {
        this.setState({
            betSize: event.target.value
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
            betSize: betSize
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
        const { started, betSize, stackSize, socketId, handState } = this.state;
        // get the opponent id from filter keys
        console.log(this.state);
        // get board by checking boardTurn
        if (handState != null && socketId != null) {
            const filterArray = Object.keys(handState.playerStacks).filter((playerId) => {
                return playerId != socketId;
            })
            const opponentId = filterArray[0];
            const isPlayerTurn = socketId == handState.playerTurn;
            const isCheckAllowed = handState.currentTurnBets[socketId] == handState.currentTurnBets[opponentId];
            const isCallAllowed = handState.currentTurnBets[socketId] < handState.currentTurnBets[opponentId];
            return <div>
            <p>Poker</p>
            {started && <React.Fragment>
                <div>opponent stack + bet: </div>
                <div>{handState.playerStacks[opponentId]} - {handState.currentTurnBets[opponentId]}</div>
                <div><Board boardString={handState.board} turn={handState.boardTurn}/></div>
                <div>PotSize - {handState.potSize}</div>
                <div>your hand + stack + bet </div>
                <div>{handState.playerHands[socketId]} - {handState.playerStacks[socketId]} - {handState.currentTurnBets[socketId]}</div>
                {isPlayerTurn && (
                    <React.Fragment>
                        <input type="number" name="bet size" value={betSize}  onChange={this.handleChangeBetSize} />
                        <button onClick={this.fold}>Fold</button>
                        {isCheckAllowed && <button onClick={this.check}>Check</button>}
                        {isCallAllowed && <button onClick={this.call}>Call</button>}
                        <button onClick={this.raise}>Raise</button>
                    </React.Fragment>
                )}
                
            </React.Fragment>
            }
        </div>
        } else {
            return <div>
                <p>Poker</p>
                {started && <React.Fragment>
                    <div>opponent stack: 1000</div>
                    <div>board</div>
                    <div>Tc7c3c</div>
                    <div>PotSize - 0</div>
                    <div>your hand + stack </div>
                    <div>AhJh - {stackSize}</div>
                    <input type="number" name="bet size" value={betSize}  onChange={this.handleChangeBetSize} />
                </React.Fragment>
                }
            </div>
        }
    }
}
export default Poker;