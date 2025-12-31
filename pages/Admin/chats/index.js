// /pages/admin/chats/[chatRoomId].js (Next.js with Tailwind CSS)
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import { firebase } from "../../../Firebase/config"; // Ensure path is correct
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const CHAT_COLLECTION = 'chats';
const ADMIN_ID = 'support_agent_001'; // IMPORTANT: Unique identifier for the Admin
const ADMIN_NAME = 'Support Agent';

const AdminChatDetail = () => {
    const router = useRouter();
    const { chatRoomId } = router.query;
    
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');

    const CHAT_COLLECTION_PATH = chatRoomId ? `${CHAT_COLLECTION}/${chatRoomId}/messages` : null;

    // 1. Message Listener
    useEffect(() => {
        if (!CHAT_COLLECTION_PATH) return;

        const firestore = firebase.firestore();

        const unsubscribe = firestore
            .collection(CHAT_COLLECTION_PATH)
            .orderBy('createdAt', 'asc') 
            .onSnapshot(querySnapshot => {
                const fetchedMessages = querySnapshot.docs.map(doc => {
                    const firebaseData = doc.data();
                    
                    const timestamp = firebaseData.createdAt 
                        ? firebaseData.createdAt.toDate() 
                        : new Date();

                    return {
                        id: doc.id,
                        text: firebaseData.text,
                        createdAt: timestamp,
                        user: firebaseData.user,
                    };
                });
                setMessages(fetchedMessages);
            }, error => {
                console.error("Error fetching messages:", error);
                toast.error("Failed to load chat messages.");
            });

        return () => unsubscribe();
    }, [CHAT_COLLECTION_PATH]);


    // 2. Send Logic for the Admin (updates chat document status)
    const onSend = useCallback(async (e) => {
        e.preventDefault(); 
        if (!inputMessage.trim() || !CHAT_COLLECTION_PATH) return;
        
        const firestore = firebase.firestore();
        const chatRoomRef = firestore.collection(CHAT_COLLECTION).doc(chatRoomId);

        const messageData = {
            text: inputMessage.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            user: {
                _id: ADMIN_ID,
                name: ADMIN_NAME,
                isUser: false,
            },
        };

        try {
            // Add message to sub-collection
            await chatRoomRef.collection('messages').add(messageData);

            // Update parent document status
            await chatRoomRef.update({
                lastMessage: inputMessage.trim(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'Replied',
            });
                
            setInputMessage('');
        } catch (error) {
            console.error('Error sending admin reply:', error);
            toast.error("Failed to send message.");
        }
    }, [CHAT_COLLECTION_PATH, inputMessage, chatRoomId]);

    if (!chatRoomId) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-lg text-gray-600">Loading...</p>
            </div>
        );
    }

    const userIdDisplay = chatRoomId.replace('support_', '');

    return (
        <div className="flex flex-col h-screen bg-white shadow-lg border border-gray-200">
            <ToastContainer />
            
            <div className="flex items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <button 
                    className="text-orange-500 hover:text-orange-600 font-semibold p-2 rounded transition" 
                    onClick={() => router.back()}
                >
                    &larr; Back to Chat List
                </button>
                <h2 className="text-xl font-bold ml-4">Chat Room: {userIdDisplay}</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-4 flex flex-col-reverse space-y-3">
                {/* Reversing the messages array for display order (since Firestore orders by 'asc' but FlatList uses 'inverted') */}
                {[...messages].reverse().map(item => {
                    const isMyMessage = item.user._id === ADMIN_ID;
                    const timestampString = item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div 
                            key={item.id} 
                            className={`
                                max-w-xl p-3 rounded-xl mb-2 shadow-sm
                                ${isMyMessage 
                                    ? 'bg-green-500 text-white ml-auto rounded-br-sm' 
                                    : 'bg-gray-200 text-gray-800 mr-auto rounded-bl-sm'}
                            `}
                        >
                            <div className={`text-xs font-bold mb-1 ${isMyMessage ? 'text-green-100' : 'text-gray-600'}`}>
                                {isMyMessage ? ADMIN_NAME : item.user.name || 'User'}
                            </div>
                            <p className="text-base m-0">{item.text}</p>
                            
                            <div className={`text-right mt-1 text-xs ${isMyMessage ? 'text-green-200' : 'text-gray-500'}`}>
                                {timestampString}
                            </div>
                        </div>
                    );
                })}
            </div>

            <form className="flex p-4 border-t border-gray-200 bg-white" onSubmit={onSend}>
                <input
                    type="text"
                    className="flex-grow p-3 border border-gray-300 rounded-full mr-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Type Admin Reply..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                />
                <button 
                    type="submit" 
                    className={`
                        px-5 py-2 rounded-full font-bold text-white transition-colors
                        ${!inputMessage.trim() 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-orange-500 hover:bg-orange-600'}
                    `}
                    disabled={!inputMessage.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default AdminChatDetail;