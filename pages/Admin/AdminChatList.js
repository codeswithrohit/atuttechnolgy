// /pages/admin/chats/index.js (Next.js with Tailwind CSS)
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { firebase } from "../../Firebase/config";
import 'react-toastify/dist/ReactToastify.css';

const CHAT_COLLECTION = 'chats';

const AdminChatList = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!firebase.apps.length) {
            console.error("Firebase app not initialized.");
            setLoading(false);
            return;
        }
        
        const firestore = firebase.firestore();
        
        const unsubscribe = firestore
            .collection(CHAT_COLLECTION)
            .orderBy('lastActive', 'desc') 
            .onSnapshot(querySnapshot => {
                const fetchedChats = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(), 
                    userId: doc.id.replace('support_', ''),
                }));
                setChats(fetchedChats);
                setLoading(false);
            }, error => {
                console.error("Error fetching chat list: ", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const handleChatClick = (chatRoomId) => {
        // Correcting the path case for Next.js file system
        router.push(`/Admin/chats/${chatRoomId}`); 
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg text-gray-600">Loading chats...</p>
                </div>
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
                <h1 className="text-3xl font-bold border-b pb-4 mb-6 text-gray-800">Support Chats</h1>
                <p className="text-gray-600">No active support chats found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-lg mt-10">
            <h1 className="text-3xl font-bold border-b border-gray-200 pb-4 mb-6 text-gray-800">Support Chats</h1>
            
            <ul className="space-y-3">
                {chats.map(item => (
                    <li 
                        key={item.id} 
                        className="p-4 border border-gray-100 rounded-lg shadow-sm bg-gray-50 hover:bg-orange-50 hover:border-orange-200 transition duration-150 ease-in-out cursor-pointer"
                        onClick={() => handleChatClick(item.id)}
                    >
                        <div className="flex justify-between items-center">
                            <div className="text-lg font-semibold text-gray-800">
                                Chat with: <span className="text-orange-600">{item.userName || item.userId}</span>
                            </div>
                            <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${item.status === 'Awaiting Reply' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {item.status || 'Active'}
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1 truncate">
                            {/* Check if lastMessage indicates an image */}
                            {item.lastMessage === 'Image attached' ? (
                                <span className="flex items-center text-blue-600 font-medium">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    Image attached
                                </span>
                            ) : (
                                item.lastMessage
                            )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {item.lastActive && item.lastActive.toDate().toLocaleString()}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AdminChatList;