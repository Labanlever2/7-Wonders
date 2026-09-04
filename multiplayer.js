class MultiplayerManager {
    constructor() {
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.hostIP = null;
        this.port = 3000;
        this.isHost = false;
        this.pollInterval = null;
        this.players = [];
    }

    async createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter a player name');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName })
            });

            const data = await response.json();
            if (data.success) {
                this.roomCode = data.roomCode;
                this.playerNumber = data.playerNumber;
                this.playerName = playerName;
                this.hostIP = data.hostIP;
                this.isHost = true;
                this.showLobby();
                this.startPolling();
                this.showStatus(`Room created! Share code: ${this.roomCode}`);
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room. Make sure the server is running.');
        }
    }

    async joinRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        const roomCode = document.getElementById('roomCode').value.trim();

        if (!playerName) {
            alert('Please enter a player name');
            return;
        }
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/join-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, playerName })
            });

            const data = await response.json();
            if (data.success) {
                this.roomCode = data.roomCode;
                this.playerNumber = data.playerNumber;
                this.playerName = playerName;
                this.isHost = false;
                this.players = data.players || [];
                this.showLobby();
                this.startPolling();
                this.showStatus(`Joined room ${this.roomCode} as Player ${this.playerNumber}`);
            } else {
                alert(data.error || 'Failed to join room');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Check the room code and ensure the host\'s server is running.');
        }
    }

    async getRoomStatus() {
        if (!this.roomCode) return;

        try {
            const response = await fetch('http://localhost:3000/api/room-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode: this.roomCode })
            });

            const data = await response.json();
            if (data.success) {
                this.players = data.players || [];
                this.updatePlayersList();
            }
        } catch (error) {
            console.error('Error getting room status:', error);
        }
    }

    startPolling() {
        this.pollInterval = setInterval(() => {
            this.getRoomStatus();
        }, 1000); // Poll every second
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    updatePlayersList() {
        const playersList = document.getElementById('playersList');
        const playerCount = document.getElementById('playerCount');
        const startGameBtn = document.getElementById('startGameBtn');

        playersList.innerHTML = '';
        playerCount.textContent = this.players.length;

        this.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            if (player.playerNumber === this.playerNumber) {
                playerDiv.classList.add('self');
            }
            playerDiv.innerHTML = `
                <div class="player-number">${player.playerNumber}</div>
                <div class="player-name">${player.name}</div>
                ${player.playerNumber === this.playerNumber ? '<span class="you-badge">(You)</span>' : ''}
            `;
            playersList.appendChild(playerDiv);
        });

        // Enable start button only if host and at least 2 players
        if (this.isHost && this.players.length >= 2) {
            startGameBtn.disabled = false;
            startGameBtn.textContent = `Start Game (${this.players.length}/7 Players)`;
        } else if (this.isHost) {
            startGameBtn.textContent = `Waiting for players... (${this.players.length}/7)`;
            startGameBtn.disabled = true;
        }
    }

    showLobby() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('lobbyScreen').classList.add('active');

        document.getElementById('playerNumber').textContent = this.playerNumber;
        document.getElementById('roomCodeDisplay').textContent = this.roomCode;

        if (this.isHost) {
            document.getElementById('hostAddress').textContent = `http://localhost:3000`;
            document.getElementById('ipInstruction').textContent = '(Tell other players this address)';
        } else {
            document.getElementById('hostAddress').textContent = 'Joined';
            document.getElementById('ipInstruction').textContent = '';
        }

        this.updatePlayersList();
    }

    showStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        setTimeout(() => {
            statusEl.textContent = '';
        }, 5000);
    }

    async leaveRoom() {
        this.stopPolling();
        try {
            await fetch('http://localhost:3000/api/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode: this.roomCode, playerNumber: this.playerNumber })
            });
        } catch (error) {
            console.error('Error leaving room:', error);
        }

        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
        this.players = [];

        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('lobbyScreen').classList.remove('active');
        document.getElementById('playerName').value = '';
        document.getElementById('roomCode').value = '';
    }

    startGame() {
        alert(`Game started with ${this.players.length} players!`);
        // TODO: Implement game logic
    }
}

// Initialize manager
const manager = new MultiplayerManager();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        manager.createRoom();
    });

    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        document.getElementById('joinFormContainer').classList.toggle('hidden');
    });

    document.getElementById('confirmJoinBtn').addEventListener('click', () => {
        manager.joinRoom();
    });

    document.getElementById('cancelJoinBtn').addEventListener('click', () => {
        document.getElementById('joinFormContainer').classList.add('hidden');
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
        manager.startGame();
    });

    document.getElementById('leaveRoomBtn').addEventListener('click', () => {
        manager.leaveRoom();
    });

    // Allow Enter key to join
    document.getElementById('roomCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            manager.joinRoom();
        }
    });

    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            manager.createRoom();
        }
    });
});
