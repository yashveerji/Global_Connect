import React from 'react'

import Nav from '../components/Nav'
import ChatBox from '../components/chat/ChatWindow'

function ChatPage() {
  return (
    <>
      <Nav />
      <div className="animate-fade-in">
        <ChatBox />
      </div>
    </>
  )
}

export default ChatPage
