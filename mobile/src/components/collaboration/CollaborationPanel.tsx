import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { useCollaborationStore, collaborationService } from '../../services/CollaborationService';

interface Props {
    currentTime: number;
}

export const CollaborationPanel: React.FC<Props> = ({ currentTime }) => {
    const activeUsers = useCollaborationStore((state) => state.activeUsers);
    const comments = useCollaborationStore((state) => state.comments);
    const isConnected = useCollaborationStore((state) => state.isConnected);

    const [newComment, setNewComment] = useState('');

    const handleSendComment = () => {
        if (!newComment.trim()) return;

        collaborationService.sendComment(newComment, currentTime);
        setNewComment('');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isConnected) {
        return (
            <View className="bg-gray-900 p-4 border-l border-gray-800 w-80">
                <Text className="text-gray-500 text-center">Connecting to collaboration server...</Text>
            </View>
        );
    }

    return (
        <View className="bg-gray-900 border-l border-gray-800 w-80 flex-1">
            {/* Active Users */}
            <View className="p-4 border-b border-gray-800">
                <Text className="text-white font-bold mb-3">Active Users ({activeUsers.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {activeUsers.map((user) => (
                        <View key={user.id} className="mr-3 items-center">
                            <View
                                className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mb-1 border-2"
                                style={{ borderColor: user.color || '#3b82f6' }}
                            >
                                {user.avatar ? (
                                    <Image source={{ uri: user.avatar }} className="w-full h-full rounded-full" />
                                ) : (
                                    <Text className="text-white font-bold">{user.name[0]?.toUpperCase()}</Text>
                                )}
                            </View>
                            <Text className="text-gray-400 text-xs" numberOfLines={1}>
                                {user.name}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Comments List */}
            <View className="flex-1">
                <Text className="text-white font-bold p-4 pb-2">Comments</Text>
                <ScrollView className="flex-1 px-4">
                    {comments.length === 0 ? (
                        <Text className="text-gray-500 text-center mt-10">No comments yet</Text>
                    ) : (
                        comments.map((comment) => (
                            <View key={comment.id} className="bg-gray-800 rounded p-3 mb-3">
                                <View className="flex-row justify-between mb-1">
                                    <Text className="text-blue-400 font-bold text-sm">{comment.userName}</Text>
                                    <TouchableOpacity onPress={() => { /* Jump to timestamp logic */ }}>
                                        <Text className="text-gray-500 text-xs">
                                            {formatTime(comment.timestamp)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-white text-sm">{comment.text}</Text>
                                <Text className="text-gray-600 text-xs mt-2 text-right">
                                    {new Date(comment.createdAt).toLocaleTimeString()}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Comment Input */}
            <View className="p-4 border-t border-gray-800 bg-gray-900">
                <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-gray-400 text-xs">At {formatTime(currentTime)}</Text>
                </View>
                <View className="flex-row gap-2">
                    <TextInput
                        className="flex-1 bg-gray-800 text-white rounded p-3 min-h-[40px]"
                        placeholder="Add a comment..."
                        placeholderTextColor="#666"
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                    />
                    <TouchableOpacity
                        className={`justify-center px-4 rounded ${newComment.trim() ? 'bg-blue-600' : 'bg-gray-700'}`}
                        onPress={handleSendComment}
                        disabled={!newComment.trim()}
                    >
                        <Text className="text-white font-bold">Send</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
