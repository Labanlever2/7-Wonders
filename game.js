// Initialize Peer with error handling
let peer;
let peerReady = false;

function initPeer() {
    peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        secure: true
    });

    peer.on('open', (id) => {
        console.log('Peer ID:', id);
        peerReady = true;
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        alert('⚠️ Connection error. Refresh and try again.');
    });
}

class GameManager {
    constructor() {
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.isHost = false;
        this.players = [];
        this.dataConnections = {};
        this.peerId = null;
        this.pollInterval = null;
    }

    generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    createRoom(playerName) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }

        if (!peerReady || !peer.id) {
            return { success: false, error: 'Connection not ready. Please wait and try again.' };
        }

        this.roomCode = this.generateRoomCode();
        this.playerNumber = 1;
        this.playerName = playerName.trim();
        this.isHost = true;
        this.peerId = peer.id;
        this.players = [
            {
                playerNumber: 1,
                name: playerName.trim(),
                peerId: this.peerId
            }
        ];

        // Listen for incoming connections
        peer.off('connection'); // Remove previous listeners
        peer.on('connection', (conn) => {
            this.handleNewConnection(conn);
        });

        return {
            success: true,
            roomCode: this.roomCode,
            playerNumber: 1,
            peerId: this.peerId
        };
    }

    joinRoom(roomCode, playerName, hostPeerId) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }
        if (!roomCode.trim()) {
            return { success: false, error: 'Room code cannot be empty' };
        }
        if (!hostPeerId) {
            return { success: false, error: 'Host Peer ID required' };
        }

        if (!peerReady || !peer.id) {
            return { success: false, error: 'Connection not ready. Please wait and try again.' };
        }

        this.roomCode = roomCode;
        this.playerName = playerName.trim();
        this.isHost = false;
        this.peerId = peer.id;

        // Connect to host
        const conn = peer.connect(hostPeerId);
        conn.on('open', () => {
            console.log('Connected to host');
            conn.send({
                type: 'join',
                playerName: this.playerName
            });
        });
        conn.on('data', (data) => this.handleHostData(data));
        conn.on('error', (err) => console.error('Connection error:', err));

        this.dataConnections['host'] = conn;

        return {
            success: true,
            roomCode: roomCode
        };
    }

    handleNewConnection(conn) {
        console.log('New connection from:', conn.peer);
        
        conn.on('data', (data) => {
            if (data.type === 'join') {
                // Assign player number
                const playerNumber = this.players.length + 1;
                this.players.push({
                    playerNumber: playerNumber,
                    name: data.playerName,
                    peerId: conn.peer
                });

                // Send player list to joining player
                conn.send({
                    type: 'player_joined',
                    playerNumber: playerNumber,
                    players: this.players
                });

                // Broadcast to all other players
                for (const key in this.dataConnections) {
                    if (key !== conn.peer && this.dataConnections[key].open) {
                        this.dataConnections[key].send({
                            type: 'player_list_update',
                            players: this.players
                        });
                    }
                }
            }
        });

        this.dataConnections[conn.peer] = conn;
    }

    handleHostData(data) {
        if (data.type === 'player_joined') {
            this.playerNumber = data.playerNumber;
            this.players = data.players;
        } else if (data.type === 'player_list_update') {
            this.players = data.players;
        }
    }

    leaveRoom() {
        // Close all connections
        for (const key in this.dataConnections) {
            this.dataConnections[key].close();
        }
        this.dataConnections = {};
        this.players = [];
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
    }
}

const gameManager = new GameManager();

class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('createRoomBtn').addEventListener('click', () => this.handleCreateRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.toggleJoinForm());
        document.getElementById('confirmJoinBtn').addEventListener('click', () => this.handleJoinRoom());
        document.getElementById('cancelJoinBtn').addEventListener('click', () => this.toggleJoinForm());
        document.getElementById('startGameBtn').addEventListener('click', () => this.handleStartGame());
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.handleLeaveRoom());

        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleCreateRoom();
        });
        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJoinRoom();
        });
    }

    handleCreateRoom() {
        const playerName = document.getElementById('playerName').value;
        const result = this.manager.createRoom(playerName);

        if (result.success) {
            this.showLobby();
            this.startPolling();
            this.showStatus(`✅ Room ${result.roomCode} created!`);
            setTimeout(() => {
                this.showPeerIdForShare(result.roomCode, result.peerId);
            }, 500);
        } else {
            alert('❌ ' + result.error);
        }
    }

    showPeerIdForShare(roomCode, peerId) {
        alert(`🎮 ROOM CREATED!\n\nRoom Code: ${roomCode}\n\nYour Peer ID:\n${peerId}\n\nShare both with your friends!`);
    }

    toggleJoinForm() {
        document.getElementById('joinFormContainer').classList.toggle('hidden');
    }

    handleJoinRoom() {
        const playerName = document.getElementById('playerName').value;
        const roomCode = document.getElementById('roomCode').value;
        const hostPeerId = prompt('Enter host\'s Peer ID:');

        if (hostPeerId) {
            const result = this.manager.joinRoom(roomCode, playerName, hostPeerId);
            if (result.success) {
                this.showLobby();
                this.startPolling();
                this.showStatus(`✅ Connecting to room ${roomCode}...`);
            } else {
                alert('❌ ' + result.error);
            }
        }
    }

    handleStartGame() {
        if (this.manager.isHost && this.manager.players.length >= 2) {
            alert(`🎮 Game started with ${this.manager.players.length} players!`);
        }
    }

    handleLeaveRoom() {
        this.manager.leaveRoom();
        this.showLoginScreen();
        this.stopPolling();
        document.getElementById('playerName').value = '';
        document.getElementById('roomCode').value = '';
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('lobbyScreen').classList.remove('active');
    }

    showLobby() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('lobbyScreen').classList.add('active');

        document.getElementById('playerNumber').textContent = this.manager.playerNumber;
        document.getElementById('roomCodeDisplay').textContent = this.manager.roomCode;

        if (this.manager.isHost) {
            document.getElementById('roomCodeInstruction').textContent = '(Share with other players)';
        } else {
            document.getElementById('roomCodeInstruction').textContent = '(You\'re in this room)';
        }

        this.updatePlayersList();
    }

    updatePlayersList() {
        const playersList = document.getElementById('playersList');
        const playerCount = document.getElementById('playerCount');
        const startGameBtn = document.getElementById('startGameBtn');

        playersList.innerHTML = '';
        playerCount.textContent = this.manager.players.length;

        this.manager.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            if (player.playerNumber === this.manager.playerNumber) {
                playerDiv.classList.add('self');
            }
            playerDiv.innerHTML = `
                <div class="player-number">${player.playerNumber}</div>
                <div class="player-name">${player.name}</div>
                ${player.playerNumber === this.manager.playerNumber ? '<span class="you-badge">(You)</span>' : ''}
            `;
            playersList.appendChild(playerDiv);
        });

        if (this.manager.isHost && this.manager.players.length >= 2) {
            startGameBtn.disabled = false;
            startGameBtn.textContent = `Start Game (${this.manager.players.length}/7 Players)`;
        } else if (this.manager.isHost) {
            startGameBtn.textContent = `Waiting for players... (${this.manager.players.length}/7)`;
            startGameBtn.disabled = true;
        } else {
            startGameBtn.textContent = 'Waiting for host to start...';
            startGameBtn.disabled = true;
        }
    }

    startPolling() {
        this.pollInterval = setInterval(() => {
            this.updatePlayersList();
        }, 500);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    showStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        setTimeout(() => {
            statusEl.textContent = '';
        }, 5000);
    }
}

let uiManager;

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPeer();
    setTimeout(() => {
        uiManager = new UIManager(gameManager);
    }, 1000);
});
