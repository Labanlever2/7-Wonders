# 7 Wonders - LAN Multiplayer

A peer-to-peer multiplayer system for 7 Wonders that works on local networks.

## How to Play

### For the Host:
1. Open `index.html` in your browser
2. Enter your name
3. Click **"Create Room"**
4. You'll get a **Room Code** and a **Peer ID**
5. Share both with other players

### For Other Players:
1. Open `index.html` in your browser (on same network)
2. Enter your name
3. Click **"Join Room"**
4. Enter the **Room Code**
5. Enter the **Host's Peer ID**
6. Click "Connect"

## Features

✅ **Peer-to-Peer** - Direct connection between devices
✅ **Room Codes** - Easy 4-digit codes to identify rooms
✅ **Player Numbers** - Automatic assignment (1-7)
✅ **Real-time Updates** - See players join instantly
✅ **No Server Needed** - Works offline on LAN
✅ **Browser Based** - No downloads required

## Technical Details

- Uses **PeerJS** for peer-to-peer connections
- Public PeerServer for NAT traversal
- Works on any WiFi network
- Supports up to 7 players per room
- Real-time synchronization

## Setup

1. Download all files
2. Open `index.html` in any modern browser
3. That's it!

No installation, no server setup needed.