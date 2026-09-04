class LANRoomManager {
    constructor() {
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.isHost = false;
        this.players = [];
        this.hostIP = null;
        this.pollInterval = null;
        this.rooms = {}; // Local storage for rooms
        this.loadRoomsFromStorage();
    }

    // Get local IP from window location
    getLocalIP() {
        return window.location.hostname;
    }

    // Generate random 4-digit room code
    generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Load rooms from localStorage
    loadRoomsFromStorage() {
        try {
            const stored = localStorage.getItem('7wonders_rooms');
            this.rooms = stored ? JSON.parse(stored) : {};
        } catch (e) {
            this.rooms = {};
        }
    }

    // Save rooms to localStorage
    saveRoomsToStorage() {
        try {
            localStorage.setItem('7wonders_rooms', JSON.stringify(this.rooms));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    // Create a new room
    createRoom(playerName) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }

        const roomCode = this.generateRoomCode();
        const localIP = this.getLocalIP();

        this.rooms[roomCode] = {
            code: roomCode,
            hostIP: localIP,
            createdAt: Date.now(),
            players: [
                {
                    playerNumber: 1,
                    name: playerName.trim(),
                    joinedAt: Date.now()
                }
            ]
        };

        this.saveRoomsToStorage();

        this.roomCode = roomCode;
        this.playerNumber = 1;
        this.playerName = playerName.trim();
        this.isHost = true;
        this.hostIP = localIP;
        this.players = this.rooms[roomCode].players;

        return {
            success: true,
            roomCode: roomCode,
            playerNumber: 1,
            hostIP: localIP
        };
    }

    // Join an existing room
    joinRoom(hostIP, roomCode, playerName) {
        if (!playerName.trim()) {
            return { success: false, error: 'Player name cannot be empty' };
        }
        if (!roomCode.trim()) {
            return { success: false, error: 'Room code cannot be empty' };
        }

        const room = this.rooms[roomCode];
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.players.length >= 7) {
            return { success: false, error: 'Room is full' };
        }

        const playerNumber = room.players.length + 1;
        room.players.push({
            playerNumber: playerNumber,
            name: playerName.trim(),
            joinedAt: Date.now()
        });

        this.saveRoomsToStorage();

        this.roomCode = roomCode;
        this.playerNumber = playerNumber;
        this.playerName = playerName.trim();
        this.isHost = false;
        this.hostIP = hostIP;
        this.players = room.players;

        return {
            success: true,
            roomCode: roomCode,
            playerNumber: playerNumber,
            players: room.players
        };
    }

    // Get room status (for polling)
    getRoomStatus() {
        if (!this.roomCode || !this.rooms[this.roomCode]) {
            return { success: false, error: 'Room not found' };
        }

        const room = this.rooms[this.roomCode];
        this.players = room.players;

        return {
            success: true,
            roomCode: this.roomCode,
            players: room.players,
            hostIP: room.hostIP
        };
    }

    // Leave room
    leaveRoom() {
        if (!this.roomCode || !this.rooms[this.roomCode]) {
            return;
        }

        const room = this.rooms[this.roomCode];
        room.players = room.players.filter(p => p.playerNumber !== this.playerNumber);

        // Delete room if empty
        if (room.players.length === 0) {
            delete this.rooms[this.roomCode];
        }

        this.saveRoomsToStorage();

        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.players = [];
        this.isHost = false;
    }

    // Get all active rooms
    getActiveRooms() {
        return this.rooms;
    }

    // Cleanup expired rooms (older than 1 hour)
    cleanupExpiredRooms() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        for (const roomCode in this.rooms) {
            if (now - this.rooms[roomCode].createdAt > oneHour) {
                delete this.rooms[roomCode];
            }
        }

        this.saveRoomsToStorage();
    }
}

// Initialize manager
const roomManager = new LANRoomManager();

// UI Handler
class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.setupEventListeners();
        this.cleanupInterval = setInterval(() => {
            this.manager.cleanupExpiredRooms();
        }, 5 * 60 * 1000); // Cleanup every 5 minutes
    }

    setupEventListeners() {
        document.getElementById('createRoomBtn').addEventListener('click', () => this.handleCreateRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.toggleJoinForm());
        document.getElementById('confirmJoinBtn').addEventListener('click', () => this.handleJoinRoom());
        document.getElementById('cancelJoinBtn').addEventListener('click', () => this.toggleJoinForm());
        document.getElementById('startGameBtn').addEventListener('click', () => this.handleStartGame());
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.handleLeaveRoom());

        // Enter key handlers
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
            this.showStatus(`✅ Room created! Code: ${result.roomCode}`);
        } else {
            alert('❌ ' + result.error);
        }
    }

    toggleJoinForm() {
        document.getElementById('joinFormContainer').classList.toggle('hidden');
    }

    handleJoinRoom() {
        const playerName = document.getElementById('playerName').value;
        const hostIP = document.getElementById('hostIP').value;
        const roomCode = document.getElementById('roomCode').value;

        const result = this.manager.joinRoom(hostIP, roomCode, playerName);

        if (result.success) {
            this.showLobby();
            this.startPolling();
            this.showStatus(`✅ Joined room ${roomCode} as Player ${result.playerNumber}`);
        } else {
            alert('❌ ' + result.error);
        }
    }

    handleStartGame() {
        if (this.manager.isHost && this.manager.players.length >= 2) {
            alert(`🎮 Game started with ${this.manager.players.length} players!`);
            // TODO: Implement actual game logic
        }
    }

    handleLeaveRoom() {
        this.manager.leaveRoom();
        this.showLoginScreen();
        this.stopPolling();
        document.getElementById('playerName').value = '';
        document.getElementById('hostIP').value = '';
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
        document.getElementById('playerIP').textContent = this.manager.hostIP;

        if (this.manager.isHost) {
            document.getElementById('ipInstruction').textContent = '(Share this with other players to join)';
        } else {
            document.getElementById('ipInstruction').textContent = '(You joined this room)';
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

        // Update start button
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
            const status = this.manager.getRoomStatus();
            if (status.success) {
                this.updatePlayersList();
            }
        }, 500); // Poll every 500ms for smooth updates
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
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

// Initialize on page load
let uiManager;
document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager(roomManager);
});
