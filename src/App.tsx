
import React, { useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Model, LiveConversationModel } from './types';
import { Plus, PanelLeftClose, PanelLeftOpen, Settings, Loader2, Key } from 'lucide-react';
import { HeaderModelSelector } from './components/HeaderModelSelector';
import { Modal } from './components/Modal';
import { Type } from '@google/genai';
import { ConfirmationModal } from './components/ConfirmationModal';
import CodeInterpreterPanel from './components/CodeInterpreterPanel';
import { LiveConversation } from './components/LiveConversation';
import { SettingsPanel } from './components/SettingsPanel';
import { useAppStore } from './store';
import { NavigationSidebar } from './components/NavigationSidebar';
import { PreviewModal } from './components/PreviewModal';
import { SearchPanel } from './components/SearchPanel';
import { LoginModal } from './components/LoginModal';


const useMediaQuery = (query: string) => {
    const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
};

const modelMaxTokens: Partial<Record<Model, number>> = {
    [Model.GEMINI_3_PRO_PREVIEW]: 1048576,
    [Model.GEMINI_3_PRO_IMAGE_PREVIEW]: 65536,
    [Model.GEMINI_2_5_PRO]: 1048576,
    [Model.GEMINI_2_5_FLASH]: 1048576,
    [Model.GEMINI_2_5_FLASH_LITE]: 1048576,
    [Model.GEMINI_2_5_FLASH_IMAGE]: 65536,
    [Model.GEMINI_2_0_FLASH_IMAGE_PREVIEW]: 32768,
    [Model.GEMINI_2_0_FLASH]: 1048576,
    [Model.GEMINI_2_0_FLASH_LITE]: 1048576,
    [Model.IMAGEN_4_0_GENERATE_001]: 4096,
    [Model.IMAGEN_4_0_ULTRA_GENERATE_001]: 4096,
    [Model.IMAGEN_4_0_FAST_GENERATE_001]: 4096,
    [Model.IMAGEN_3_0_GENERATE_002]: 4096,
    [Model.VEO_3_0_GENERATE_PREVIEW]: 32768,
    [Model.VEO_3_0_FAST_GENERATE_PREVIEW]: 32768,
    [Model.VEO_2_0_GENERATE_001]: 32768,
};

const App: React.FC = () => {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    // Zustand store selectors
    const store = useAppStore();

    const activeChat = useMemo(() => store.chatHistory.find(c => c.id === store.activeChatId), [store.chatHistory, store.activeChatId]);
    const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
    
    const effectiveTheme = useMemo(() => {
        if (store.theme === 'system') return prefersDarkMode ? 'dark' : 'light';
        return store.theme;
    }, [store.theme, prefersDarkMode]);
    
    const activeBaseModel = useMemo<Model>(() => {
        const selected = store.selectedModel;
        return selected as Model;
    }, [store.selectedModel]);

    // Initialize app session on load
    useEffect(() => {
        store.initializeApp();
    }, [store.initializeApp]);
    
    // UI Logic from store
    useEffect(() => {
        document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    }, [effectiveTheme]);

    useEffect(() => {
        const setAppHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        window.addEventListener('resize', setAppHeight); setAppHeight();
        return () => window.removeEventListener('resize', setAppHeight);
    }, []);

    // Token Count Logic
    useEffect(() => {
        const activeChat = store.chatHistory.find(c => c.id === store.activeChatId);
        if (activeChat) {
            const totalChars = activeChat.messages.reduce((sum, msg) => sum + msg.content.length, 0);
            // Rough estimation: ~4 characters per token.
            const estimatedTokens = Math.ceil(totalChars / 4);
            store.setTokenCount(estimatedTokens);
        } else {
            store.setTokenCount(0);
        }
    }, [store.chatHistory, store.activeChatId, store.setTokenCount]);


    const modelMaxTokensForSidebar = useMemo(() => activeBaseModel && modelMaxTokens[activeBaseModel] ? modelMaxTokens[activeBaseModel]! : 8192, [activeBaseModel]);

    if (store.isAuthLoading || !store.isStoreInitialized) {
        return (
            <div className="full-height-app flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-accent animate-spin mx-auto" />
                    <p className="mt-4 text-lg font-medium text-text-primary">Loading your session...</p>
                    <p className="text-text-secondary">Please wait while we load your data.</p>
                </div>
            </div>
        );
    }

  return (
    <div className="full-height-app font-sans bg-background text-text-primary flex overflow-hidden">
        <LoginModal isOpen={store.isLoginModalOpen} />
        {isMobile && (store.isNavSidebarOpen || store.isRightSidebarOpen) && <div className="fixed inset-0 bg-black/50 z-20" onClick={store.closeAllSidebars} />}
        <NavigationSidebar isSidebarOpen={store.isNavSidebarOpen} isMobile={isMobile} />
        
        <div className="flex-1 flex flex-col min-w-0 md:py-4 md:pr-4 md:pl-0 max-md:pt-14">
            <header className="flex items-center justify-between pb-4 flex-shrink-0 max-md:fixed max-md:top-0 max-md:left-0 max-md:right-0 max-md:z-20 max-md:bg-background max-md:h-14 max-md:p-0 max-md:px-4">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={store.toggleNavSidebar} data-tooltip-text="Toggle Menu" data-tooltip-position="bottom" className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-interactive-hover">
                        {store.isNavSidebarOpen ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
                    </button>
                    <div className="font-semibold text-lg text-text-primary truncate pl-2">
                        {activeChat?.title || 'New Chat'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <HeaderModelSelector isMobile={isMobile} />
                    <button 
                        onClick={() => store.toggleRightPanel(isMobile)} 
                        data-tooltip-text="Model Settings" data-tooltip-position="bottom" data-tooltip-align="right" 
                        className={`text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-interactive-hover ${store.isCodePanelVisible ? 'hidden' : ''}`}
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex min-h-0">
                <main className={`flex flex-col min-w-0 bg-background md:border border-border md:rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${store.isCodePanelVisible && !isMobile ? (store.isWidePreview ? 'hidden' : 'flex-1') : 'w-full'}`}>
                    {store.isSearchVisible ? (
                        <SearchPanel />
                    ) : store.isSettingsPanelVisible ? (
                        <SettingsPanel 
                            onClose={store.closeSettingsPanel}
                            initialTab={store.settingsInitialTab}
                        />
                    ) : (
                        <ChatArea messages={messages} isMobile={isMobile} />
                    )}
                </main>
                
                {store.isCodePanelVisible && !isMobile && (
                     <div className={`flex-shrink-0 overflow-hidden ml-2 transition-all duration-300 ease-in-out ${store.isWidePreview ? 'flex-1' : 'w-[800px]'}`}>
                        <CodeInterpreterPanel
                            isMobile={isMobile}
                            isDarkMode={effectiveTheme === 'dark'}
                            project={activeChat?.project}
                            onProjectChange={store.handleProjectChange}
                            onClose={() => {
                                store.setIsCodePanelVisible(false);
                                store.setIsWidePreview(false);
                            }}
                            activeFilePath={store.activeInterpreterFile}
                            streamingTarget={store.streamingTarget}
                            onStreamComplete={store.onStreamComplete}
                            isWidePreview={store.isWidePreview}
                            onToggleWidePreview={() => store.setIsWidePreview(!store.isWidePreview)}
                        />
                    </div>
                )}
                
                {isMobile && store.isCodePanelVisible && (
                    <div className="fixed top-14 bottom-0 left-0 right-0 z-40 bg-background animate-slide-up">
                        <CodeInterpreterPanel
                            isMobile={isMobile}
                            isDarkMode={effectiveTheme === 'dark'}
                            project={activeChat?.project}
                            onProjectChange={store.handleProjectChange}
                            onClose={() => store.setIsCodePanelVisible(false)}
                            activeFilePath={store.activeInterpreterFile}
                            streamingTarget={store.streamingTarget}
                            onStreamComplete={store.onStreamComplete}
                            isWidePreview={false}
                            onToggleWidePreview={() => {}}
                        />
                    </div>
                )}


                <Sidebar isSidebarOpen={store.isRightSidebarOpen} isMobile={isMobile} modelMaxTokens={modelMaxTokensForSidebar} />
            </div>
        </div>

        <Modal
            isOpen={store.isSchemaModalOpen}
            onClose={store.closeSchemaModal}
            onSave={(newSchema) => store.setResponseSchema(newSchema)}
            title="Edit Response Schema"
            content={store.responseSchema}
            setContent={store.setResponseSchema}
            placeholder="Enter a valid JSON schema..."
            helpText={
                <>
                  Define the JSON structure for the model's response. See the{' '}
                  <a href="https://ai.google.dev/gemini-api/docs/structured-output" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    official documentation
                  </a>
                  {' '}for more details.
                </>
            }
        />
        
        <ConfirmationModal 
            isOpen={!!store.chatToDelete} 
            onClose={() => store.setChatToDelete(null)} 
            onConfirm={store.confirmDeleteChat} 
            title="Delete Chat"
        >
            Are you sure you want to delete this chat? This action cannot be undone.
        </ConfirmationModal>
        
        <LiveConversation 
            isOpen={store.isLiveConversationOpen} 
            onClose={() => store.setIsLiveConversationOpen(false)}
            appTheme={effectiveTheme}
            model={store.liveConversationModel}
        />
        <ConfirmationModal
            isOpen={store.isClearHistoryModalOpen}
            onClose={() => store.setIsClearHistoryModalOpen(false)}
            onConfirm={store.confirmClearHistory}
            title="Clear All Chat History"
        >
            Are you sure you want to delete all chat history? This action is irreversible.
        </ConfirmationModal>
        <ConfirmationModal
            isOpen={store.isResetUsageModalOpen}
            onClose={() => store.setIsResetUsageModalOpen(false)}
            onConfirm={store.confirmResetUsage}
            title="Reset Usage Data"
        >
            Are you sure you want to reset all usage data? This action cannot be undone.
        </ConfirmationModal>
         <PreviewModal 
            isOpen={store.isPreviewModalOpen}
            file={store.previewFile}
            onClose={store.closePreviewModal}
        />
    </div>
  );
};

export default App;
