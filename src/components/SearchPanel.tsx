import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../store';
import { ChatMessage, ChatSession, Role } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const SearchPanel: React.FC = () => {
    const {
        searchQuery,
        setSearchQuery,
        chatHistory,
        selectChatAndScrollToMessage,
        toggleSearchVisibility
    } = useAppStore();

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        const results: { chat: ChatSession, message: ChatMessage }[] = [];
        const matchedChatIds = new Set<string>();

        // First, find all messages that match
        chatHistory.forEach(chat => {
            chat.messages.forEach(message => {
                if (message.content.toLowerCase().includes(lowerCaseQuery)) {
                    results.push({ chat, message });
                    matchedChatIds.add(chat.id);
                }
            });
        });

        // Then, find chats where only the title matches
        chatHistory.forEach(chat => {
            if (!matchedChatIds.has(chat.id) && chat.title.toLowerCase().includes(lowerCaseQuery)) {
                // Add the chat with its first message as context.
                const contextMessage: ChatMessage = chat.messages[0] || {
                    id: `${chat.id}-title-match`,
                    role: Role.MODEL,
                    content: 'No messages yet...',
                    parts: [],
                };
                results.unshift({ chat, message: contextMessage });
            }
        });

        return results;
    }, [searchQuery, chatHistory]);
    
    const handleResultClick = (chatId: string, messageId: string) => {
        const messageToScrollTo = messageId.endsWith('-title-match') ? null : messageId;
        selectChatAndScrollToMessage(chatId, messageToScrollTo);
    };

    return (
        <div className="h-full flex flex-col items-center">
            <div className="max-w-4xl w-full h-full flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-text-primary">Search</h1>
                    <Button 
                        onClick={toggleSearchVisibility}
                        variant="ghost"
                        size="icon"
                        aria-label="Close search"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>


                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-10 py-3 h-auto text-base"
                        autoFocus
                    />
                    {searchQuery && (
                        <Button
                            onClick={() => setSearchQuery('')}
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                
                <p className="text-sm text-text-secondary mb-4 px-2">
                    {searchQuery.trim() ? `${searchResults.length} results for "${searchQuery}"` : 'Search for keywords in your chat history.'}
                </p>

                <div className="flex-1 overflow-y-auto -mx-2 hover-scrollbar">
                    {searchResults.map(result => (
                        <Button
                            key={result.message.id}
                            onClick={() => handleResultClick(result.chat.id, result.message.id)}
                            variant="ghost"
                            className="w-full h-auto text-left px-4 py-3 border-b border-border last:border-b-0 flex flex-col items-start"
                        >
                            <div className="w-full flex justify-between items-start">
                                <p className="text-base font-medium text-text-primary truncate">{result.chat.title}</p>
                                <span className="text-xs text-text-secondary flex-shrink-0 ml-4 mt-1">
                                    {new Date(result.chat.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <p className="text-sm text-text-secondary line-clamp-2 mt-1 font-normal">
                                {result.message.content}
                            </p>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};
