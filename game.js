// Simple localStorage-based multiplayer system
class GameManager {
    constructor() {
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.isHost = false;
        this.players = [];
        this.pollInterval = null;
        this.lastUpdate = 0;
    }

    generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    createRoom(playerName) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }

        this.roomCode = this.generateRoomCode();
        this.playerNumber = 1;
        this.playerName = playerName.trim();
        this.isHost = true;
        this.players = [
            {
                playerNumber: 1,
                name: playerName.trim(),
                joinedAt: Date.now()
            }
        ];

        // Save to localStorage
        const roomData = {
            code: this.roomCode,
            host: this.playerName,
            players: this.players,
            createdAt: Date.now()
        };
        localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(roomData));

        return {
            success: true,
            roomCode: this.roomCode,
            playerNumber: 1
        };
    }

    joinRoom(roomCode, playerName) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }
        if (!roomCode.trim()) {
            return { success: false, error: 'Room code cannot be empty' };
        }

        // Check if room exists
        const roomKey = `room_${roomCode}`;
        const roomData = localStorage.getItem(roomKey);
        
        if (!roomData) {
            return { success: false, error: 'Room not found. Check the room code.' };
        }

        const room = JSON.parse(roomData);
        
        if (room.players.length >= 7) {
            return { success: false, error: 'Room is full (max 7 players)' };
        }

        // Add player
        this.roomCode = roomCode;
        this.playerName = playerName.trim();
        this.isHost = false;
        this.playerNumber = room.players.length + 1;
        
        room.players.push({
            playerNumber: this.playerNumber,
            name: this.playerName,
            joinedAt: Date.now()
        });

        // Update room in localStorage
        localStorage.setItem(roomKey, JSON.stringify(room));
        this.players = room.players;

        return {
            success: true,
            roomCode: roomCode,
            playerNumber: this.playerNumber
        };
    }

    getRoomStatus() {
        if (!this.roomCode) return null;

        const roomKey = `room_${this.roomCode}`;
        const roomData = localStorage.getItem(roomKey);
        
        if (!roomData) return null;

        const room = JSON.parse(roomData);
        this.players = room.players;
        return room;
    }

    leaveRoom() {
        if (!this.roomCode) return;

        const roomKey = `room_${this.roomCode}`;
        const roomData = localStorage.getItem(roomKey);
        
        if (roomData) {
            const room = JSON.parse(roomData);
            room.players = room.players.filter(p => p.name !== this.playerName);
            
            if (room.players.length === 0) {
                localStorage.removeItem(roomKey);
            } else {
                localStorage.setItem(roomKey, JSON.stringify(room));
            }
        }

        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.players = [];
        this.isHost = false;
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
            this.showStatus(`✅ Room created! Code: ${result.roomCode}`);\n        } else {\n            alert('❌ ' + result.error);\n        }\n    }\n\n    toggleJoinForm() {\n        document.getElementById('joinFormContainer').classList.toggle('hidden');\n    }\n\n    handleJoinRoom() {\n        const playerName = document.getElementById('playerName').value;\n        const roomCode = document.getElementById('roomCode').value;\n        const result = this.manager.joinRoom(roomCode, playerName);\n\n        if (result.success) {\n            this.showLobby();\n            this.startPolling();\n            this.showStatus(`✅ Joined room ${roomCode}!`);\n        } else {\n            alert('❌ ' + result.error);\n        }\n    }\n\n    handleStartGame() {\n        if (this.manager.isHost && this.manager.players.length >= 2) {\n            alert(`🎮 Game started with ${this.manager.players.length} players!`);\n        }\n    }\n\n    handleLeaveRoom() {\n        this.manager.leaveRoom();\n        this.showLoginScreen();\n        this.stopPolling();\n        document.getElementById('playerName').value = '';\n        document.getElementById('roomCode').value = '';\n    }\n\n    showLoginScreen() {\n        document.getElementById('loginScreen').classList.add('active');\n        document.getElementById('lobbyScreen').classList.remove('active');\n    }\n\n    showLobby() {\n        document.getElementById('loginScreen').classList.remove('active');\n        document.getElementById('lobbyScreen').classList.add('active');\n\n        document.getElementById('playerNumber').textContent = this.manager.playerNumber;\n        document.getElementById('roomCodeDisplay').textContent = this.manager.roomCode;\n\n        if (this.manager.isHost) {\n            document.getElementById('roomCodeInstruction').textContent = '(Share this with other players)';\n        } else {\n            document.getElementById('roomCodeInstruction').textContent = '(You joined this room)';\n        }\n\n        this.updatePlayersList();\n    }\n\n    updatePlayersList() {\n        const playersList = document.getElementById('playersList');\n        const playerCount = document.getElementById('playerCount');\n        const startGameBtn = document.getElementById('startGameBtn');\n\n        playersList.innerHTML = '';\n        playerCount.textContent = this.manager.players.length;\n\n        this.manager.players.forEach(player => {\n            const playerDiv = document.createElement('div');\n            playerDiv.className = 'player-item';\n            if (player.playerNumber === this.manager.playerNumber) {\n                playerDiv.classList.add('self');\n            }\n            playerDiv.innerHTML = `\n                <div class=\"player-number\">${player.playerNumber}</div>\n                <div class=\"player-name\">${player.name}</div>\n                ${player.playerNumber === this.manager.playerNumber ? '<span class=\"you-badge\">(You)</span>' : ''}\n            `;\n            playersList.appendChild(playerDiv);\n        });\n\n        if (this.manager.isHost && this.manager.players.length >= 2) {\n            startGameBtn.disabled = false;\n            startGameBtn.textContent = `Start Game (${this.manager.players.length}/7 Players)`;\n        } else if (this.manager.isHost) {\n            startGameBtn.textContent = `Waiting for players... (${this.manager.players.length}/7)`;\n            startGameBtn.disabled = true;\n        } else {\n            startGameBtn.textContent = 'Waiting for host to start...';\n            startGameBtn.disabled = true;\n        }\n    }\n\n    startPolling() {\n        this.pollInterval = setInterval(() => {\n            this.manager.getRoomStatus();\n            this.updatePlayersList();\n        }, 500);\n    }\n\n    stopPolling() {\n        if (this.pollInterval) {\n            clearInterval(this.pollInterval);\n        }\n    }\n\n    showStatus(message) {\n        const statusEl = document.getElementById('statusMessage');\n        statusEl.textContent = message;\n        setTimeout(() => {\n            statusEl.textContent = '';\n        }, 5000);\n    }\n}\n\nlet uiManager;\n\ndocument.addEventListener('DOMContentLoaded', () => {\n    uiManager = new UIManager(gameManager);\n});\n