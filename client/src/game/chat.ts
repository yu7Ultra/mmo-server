export function addChatMessage(sender: string, message: string, channel: string) {
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message channel-${channel}`;
        msgEl.innerHTML = `<span class="sender">${sender}:</span> <span class="message">${message}</span>`;
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        while (messagesEl.children.length > 50) { messagesEl.removeChild(messagesEl.firstChild!); }
    }
}
