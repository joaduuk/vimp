import asyncio
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        # Store active connections: {user_id: [socket_ids]}
        self.active_connections: Dict[int, Set[str]] = {}
        self.sid_to_user: Dict[str, int] = {}
    
    async def connect(self, sid: str, user_id: int):
        """Connect a user"""
        self.sid_to_user[sid] = user_id
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(sid)
    
    def disconnect(self, sid: str):
        """Disconnect a user"""
        if sid in self.sid_to_user:
            user_id = self.sid_to_user[sid]
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(sid)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            del self.sid_to_user[sid]
    
    async def send_personal_message(self, user_id: int, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            for sid in self.active_connections[user_id]:
                await sio.emit('notification', message, room=sid)
    
    async def broadcast_to_constituency(self, constituency_id: int, message: dict, db):
        """Send a message to all users in a constituency"""
        from .models import User
        users = db.query(User).filter(
            User.constituency_id == constituency_id
        ).all()
        
        for user in users:
            await self.send_personal_message(user.id, message)

# Global instance
manager = ConnectionManager()