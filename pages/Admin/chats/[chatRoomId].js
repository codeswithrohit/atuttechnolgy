// /pages/admin/chats/[chatRoomId].js (Next.js with Tailwind CSS & Image Support)
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import Image from 'next/image'; // Use next/image for optimized web images
import { firebase } from "../../../Firebase/config"; // Ensure path is correct
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const CHAT_COLLECTION = 'chats';
const ADMIN_ID = 'support_agent_001';
const ADMIN_NAME = 'Support';

const AdminChatDetail = () => {
    const router = useRouter();
    const { chatRoomId } = router.query;
    
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // State for selected file object
    const [isUploading, setIsUploading] = useState(false);

    const CHAT_COLLECTION_PATH = chatRoomId ? `${CHAT_COLLECTION}/${chatRoomId}/messages` : null;

    // --- Utility: Upload Image to Firebase Storage (Web Version) ---
    const uploadImage = async (file) => {
        const storage = firebase.storage();
        const timestamp = Date.now();
        const filename = `${file.name}_${timestamp}`;
        const storageRef = storage.ref(`chat_images/${chatRoomId}/admin/${filename}`);

        setIsUploading(true);
        try {
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            setIsUploading(false);
            return url;
        } catch (e) {
            console.error("Image upload failed:", e);
            toast.error("Image upload failed. Check file size/rules.");
            setIsUploading(false);
            return null;
        }
    };

    // 1. Message Listener (updated to fetch 'image' field)
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
                        image: firebaseData.image, // Fetch image URL
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

    // --- Core Send Function ---
    const sendChatMessage = useCallback(async (text = null, imageURL = null) => {
        if (!chatRoomId) return;

        const firestore = firebase.firestore();
        const chatRoomRef = firestore.collection(CHAT_COLLECTION).doc(chatRoomId);

        const lastMessageContent = text || (imageURL ? 'Image attached' : '...');

        const messageData = {
            text: text,
            image: imageURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            user: {
                _id: ADMIN_ID,
                name: ADMIN_NAME,
                isUser: false,
            },
        };

        try {
            // 1. Add message to sub-collection
            await chatRoomRef.collection('messages').add(messageData);

            // 2. Update parent document status
            await chatRoomRef.update({
                lastMessage: lastMessageContent,
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'Replied',
            });
                
            setInputMessage('');
            setSelectedImage(null);
        } catch (error) {
            console.error('Error sending admin reply:', error);
            toast.error("Failed to send message.");
        }
    }, [chatRoomId]);


    // 2. Send Logic for the Admin (handles text OR image)
    const handleSend = async (e) => {
        e.preventDefault(); 
        
        const text = inputMessage.trim();

        if (!text && !selectedImage) {
            return;
        }
        
        if (selectedImage) {
            const imageURL = await uploadImage(selectedImage);
            if (imageURL) {
                await sendChatMessage(text || null, imageURL);
            }
        } else if (text) {
            await sendChatMessage(text, null);
        }
    };
    
    // --- Image Preview/Selection Handlers ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    // 3. Render Message (updated to show image)
    const renderMessage = (item) => {
        const isMyMessage = item.user._id === ADMIN_ID;
        const hasText = !!item.text;
        const hasImage = !!item.image;
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
                
                {/* Image Display */}
                {hasImage && (
                    // Using standard <img> tag for web image, as next/image requires static sizing which is complex for chat bubbles
                    <img 
                        src={item.image} 
                        alt="Attached" 
                        className="w-full max-w-xs h-auto rounded-lg mb-2 cursor-pointer" 
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                        // TODO: Implement modal view for full-size image on click
                    />
                )}
                
                {/* Text Display */}
                {hasText && (
                    <p className="text-base m-0">{item.text}</p>
                )}
                
                <div className={`text-right mt-1 text-xs ${isMyMessage ? 'text-green-200' : 'text-gray-500'}`}>
                    {timestampString}
                </div>
            </div>
        );
    };

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
                {/* Reverse array for display order */}
                {[...messages].reverse().map(renderMessage)}
            </div>
            
            {/* Composer Section */}
            <form className="p-4 border-t border-gray-200 bg-gray-50" onSubmit={handleSend}>
                
                {/* Image Preview Area */}
                {selectedImage && (
                    <div className="mb-3 p-2 border-b border-gray-300 flex items-center justify-between bg-white rounded-lg">
                        <span className="text-sm text-gray-700 truncate">{selectedImage.name}</span>
                        <button 
                            type="button" 
                            className="text-red-500 hover:text-red-700 ml-3"
                            onClick={() => setSelectedImage(null)}
                        >
                            Remove
                        </button>
                    </div>
                )}
                
                <div className="flex items-end">
                    {/* File Input Button */}
                    <label htmlFor="image-upload" className="cursor-pointer p-3 text-gray-600 hover:text-orange-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <input 
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </label>

                    {/* Text Input */}
                    <input
                        type="text"
                        className="flex-grow p-3 border border-gray-300 rounded-full mr-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder={isUploading ? "Uploading..." : "Type Admin Reply..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isUploading}
                    />
                    
                    {/* Send Button */}
                    <button 
                        type="submit" 
                        className={`
                            px-5 py-2 rounded-full font-bold text-white transition-colors
                            ${(!inputMessage.trim() && !selectedImage) || isUploading
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-orange-500 hover:bg-orange-600'}
                        `}
                        disabled={(!inputMessage.trim() && !selectedImage) || isUploading}
                    >
                        {isUploading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminChatDetail;