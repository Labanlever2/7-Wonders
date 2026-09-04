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
        alert(`🎮 ROOM CREATED!\\n\\nRoom Code: ${roomCode}\\n\\nYour Peer ID:\\n${peerId}\\n\\nShare both with your friends!`);\n    }\n\n    toggleJoinForm() {\n        document.getElementById('joinFormContainer').classList.toggle('hidden');\n    }\n\n    handleJoinRoom() {\n        const playerName = document.getElementById('playerName').value;\n        const roomCode = document.getElementById('roomCode').value;\n        const hostPeerId = prompt('Enter host\\'s Peer ID:');\n\n        if (hostPeerId) {\n            const result = this.manager.joinRoom(roomCode, playerName, hostPeerId);\n            if (result.success) {\n                this.showLobby();\n                this.startPolling();\n                this.showStatus(`✅ Connecting to room ${roomCode}...`);\n            } else {\n                alert('❌ ' + result.error);\n            }\n        }\n    }\n\n    handleStartGame() {\n        if (this.manager.isHost && this.manager.players.length >= 2) {\n            alert(`🎮 Game started with ${this.manager.players.length} players!`);\n        }\n    }\n\n    handleLeaveRoom() {\n        this.manager.leaveRoom();\n        this.showLoginScreen();\n        this.stopPolling();\n        document.getElementById('playerName').value = '';\n        document.getElementById('roomCode').value = '';\n    }\n\n    showLoginScreen() {\n        document.getElementById('loginScreen').classList.add('active');\n        document.getElementById('lobbyScreen').classList.remove('active');\n    }\n\n    showLobby() {\n        document.getElementById('loginScreen').classList.remove('active');\n        document.getElementById('lobbyScreen').classList.add('active');\n\n        document.getElementById('playerNumber').textContent = this.manager.playerNumber;\n        document.getElementById('roomCodeDisplay').textContent = this.manager.roomCode;\n\n        if (this.manager.isHost) {\n            document.getElementById('roomCodeInstruction').textContent = '(Share with other players)';\n        } else {\n            document.getElementById('roomCodeInstruction').textContent = '(You\\'re in this room)';\n        }\n\n        this.updatePlayersList();\n    }\n\n    updatePlayersList() {\n        const playersList = document.getElementById('playersList');\n        const playerCount = document.getElementById('playerCount');\n        const startGameBtn = document.getElementById('startGameBtn');\n\n        playersList.innerHTML = '';\n        playerCount.textContent = this.manager.players.length;\n\n        this.manager.players.forEach(player => {\n            const playerDiv = document.createElement('div');\n            playerDiv.className = 'player-item';\n            if (player.playerNumber === this.manager.playerNumber) {\n                playerDiv.classList.add('self');\n            }\n            playerDiv.innerHTML = `\n                <div class=\"player-number\">${player.playerNumber}</div>\n                <div class=\"player-name\">${player.name}</div>\n                ${player.playerNumber === this.manager.playerNumber ? '<span class=\"you-badge\">(You)</span>' : ''}\n            `;\n            playersList.appendChild(playerDiv);\n        });\n\n        if (this.manager.isHost && this.manager.players.length >= 2) {\n            startGameBtn.disabled = false;\n            startGameBtn.textContent = `Start Game (${this.manager.players.length}/7 Players)`;\n        } else if (this.manager.isHost) {\n            startGameBtn.textContent = `Waiting for players... (${this.manager.players.length}/7)`;\n            startGameBtn.disabled = true;\n        } else {\n            startGameBtn.textContent = 'Waiting for host to start...';\n            startGameBtn.disabled = true;\n        }\n    }\n\n    startPolling() {\n        this.pollInterval = setInterval(() => {\n            this.updatePlayersList();\n        }, 500);\n    }\n\n    stopPolling() {\n        if (this.pollInterval) {\n            clearInterval(this.pollInterval);\n        }\n    }\n\n    showStatus(message) {\n        const statusEl = document.getElementById('statusMessage');\n        statusEl.textContent = message;\n        setTimeout(() => {\n            statusEl.textContent = '';\n        }, 5000);\n    }\n}\n\nlet uiManager;\n\n// Initialize everything when DOM is ready\ndocument.addEventListener('DOMContentLoaded', () => {\n    initPeer();\n    setTimeout(() => {\n        uiManager = new UIManager(gameManager);\n    }, 1000);\n});
