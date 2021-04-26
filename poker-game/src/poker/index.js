import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

class Poker extends React.Component {
    constructor(props) {
		super(props);

		this.state = {
			started: false
		};
	}
    componentDidMount () {
        const socket = io("ws://localhost:3000", {
            reconnectionDelayMax: 10000,
            transports: ["websocket"] 
        });
        socket.on("started", (data) => {
            this.setState({
                started: true
            })
        });
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

    render () {
        const { started} = this.state;
        return <div>
            <p>Poker</p>
            {started && <React.Fragment>
                <div>opponent: cc</div>
                <div>board</div>
                <div>Tc7c3c</div>
                <div>your hand</div>
                <div>AhJh</div>
            </React.Fragment>
            }
        </div>
    }
}
export default Poker;