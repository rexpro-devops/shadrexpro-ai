
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, Attachment, Project, Model } from '../types';
import { ArrowUp, Paperclip, X, Settings2, Microscope, Image, Video, Square, AudioLines, Mic, Loader2, TerminalSquare } from 'lucide-react';
import ChatMessageItem from './ChatMessageItem';
import { transcribeAudio } from '../services/geminiService';
import { useAppStore } from '../store';


interface ChatAreaProps {
  messages: ChatMessage[];
  isMobile: boolean;
}

const WelcomeState: React.FC = () => {
  const title = "How can I help you today?";

  return (
    <div className="h-full flex flex-col justify-center items-center text-center p-6">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold text-text-primary mb-4">{title}</h1>
      </div>
    </div>
  );
};

interface ChatLogProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onOpenProjectVersion: (project: Project) => void;
  onOpenFilePreview: (file: Attachment) => void;
}

const ChatLog: React.FC<ChatLogProps> = ({ messages, isLoading, onOpenProjectVersion, onOpenFilePreview }) => {
  const { scrollToMessageId, clearScrollToMessage } = useAppStore();

    useEffect(() => {
        if (scrollToMessageId) {
            const element = document.getElementById(`message-${scrollToMessageId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('bg-accent/10', 'transition-colors', 'duration-1000', 'p-4', 'rounded-xl', '-m-4');
                setTimeout(() => {
                    element.classList.remove('bg-accent/10', 'transition-colors', 'duration-1000', 'p-4', 'rounded-xl', '-m-4');
                }, 2500);
            }
            clearScrollToMessage();
        }
    }, [scrollToMessageId, clearScrollToMessage]);

  return (
    <div className="py-6 pl-[22px] pr-3">
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.map((msg, index) => (
          <div id={`message-${msg.id}`} key={msg.id || index}>
            <ChatMessageItem 
                msg={msg}
                isLastMessage={index === messages.length - 1}
                isLoading={isLoading}
                onOpenProjectVersion={onOpenProjectVersion}
                onOpenFilePreview={onOpenFilePreview}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isMobile }) => {
  const store = useAppStore();
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isToolsBottomSheetOpen, setIsToolsBottomSheetOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isStreamingText, setIsStreamingText] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for smooth scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);

  const { currentUser, showLoginPrompt } = useAppStore();
  const isGuest = currentUser?.isGuest;

  const activeBaseModel = useMemo<Model>(() => {
    const selected = store.selectedModel;
    if (Object.values(Model).includes(selected as Model)) {
        return selected as Model;
    }
    return Model.GEMINI_2_5_FLASH; // Sensible default
  }, [store.selectedModel]);

  const isTextToImageModel = useMemo(() => activeBaseModel ? [
    Model.IMAGEN_4_0_GENERATE_001, 
    Model.IMAGEN_4_0_ULTRA_GENERATE_001, 
    Model.IMAGEN_4_0_FAST_GENERATE_001, 
    Model.IMAGEN_3_0_GENERATE_002
  ].includes(activeBaseModel as Model) : false, [activeBaseModel]);
  
  const isImageEditModel = useMemo(() => 
    activeBaseModel === Model.GEMINI_3_PRO_IMAGE_PREVIEW ||
    activeBaseModel === Model.GEMINI_2_5_FLASH_IMAGE ||
    activeBaseModel === Model.GEMINI_2_0_FLASH_IMAGE_PREVIEW, [activeBaseModel]);
    
  const isVideoModel = useMemo(() => activeBaseModel ? [Model.VEO_2_0_GENERATE_001, Model.VEO_3_0_GENERATE_PREVIEW, Model.VEO_3_0_FAST_GENERATE_PREVIEW].includes(activeBaseModel as Model) : false, [activeBaseModel]);

  
  const isAttachmentDisabled = isTextToImageModel;

  // Effect to manage scroll behavior
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // A small tolerance is added to ensure it works correctly with various screen sizes/zooms.
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 5;
      shouldStickToBottom.current = isAtBottom;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check in case content is not scrollable yet
    handleScroll();
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to scroll to bottom on new messages
  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (shouldStickToBottom.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [
    messages.length, 
    lastMessage?.content, 
    lastMessage?.reasoning, 
    lastMessage?.attachments?.length, 
    lastMessage?.codeToExecute, 
    store.isLoading
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
            setIsToolsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleToolsButtonClick = () => {
    if (isGuest) {
      showLoginPrompt();
      return;
    }
    if (isMobile) {
      setIsToolsBottomSheetOpen(true);
    } else {
      setIsToolsMenuOpen(p => !p);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        requestAnimationFrame(() => {
            if (textarea) {
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachedFiles.length > 0) {
      if (isGuest && attachedFiles.length > 0) {
        showLoginPrompt();
        return;
      }
      store.sendMessage(input.trim(), attachedFiles);
      setInput('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleAttachClick = () => {
    if (isGuest) {
        showLoginPrompt();
        return;
    }
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const filesArray = Array.from(files);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        if (dataUrl) {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            mimeType: file.type,
            dataUrl: dataUrl
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTextToImageModel || isAttachmentDisabled || isGuest) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
        setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTextToImageModel || isAttachmentDisabled || isGuest) return;
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
    }
  };
  
  const streamTextToInput = (text: string) => {
    if (!text.trim()) return;
    setIsStreamingText(true);

    const words = text.split(/\s+/).filter(Boolean);
    
    let currentText = textareaRef.current?.value || '';
    currentText = currentText.trim() ? currentText.trim() + ' ' : '';

    let i = 0;
    const intervalId = setInterval(() => {
        if (i < words.length) {
            currentText += words[i] + ' ';
            setInput(currentText);
            
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
                textarea.scrollTop = textarea.scrollHeight;
            }
            i++;
        } else {
            clearInterval(intervalId);
            setInput(val => val.trim());
            setIsStreamingText(false);
            const textarea = textareaRef.current;
            if(textarea) {
              textarea.focus();
              setTimeout(() => {
                if (textarea) {
                    textarea.style.height = 'auto';
                    textarea.style.height = `${textarea.scrollHeight}px`;
                }
              }, 0);
            }
        }
    }, 75);
  };
  
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    setIsVoiceRecording(false);
  };

  const handleStartRecording = async () => {
    if (isVoiceRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                if (base64Audio) {
                    try {
                        const transcribedText = await transcribeAudio(base64Audio, 'audio/webm');
                        streamTextToInput(transcribedText);
                    } catch (error) {
                        console.error("Transcription failed:", error);
                        alert("Sorry, I couldn't understand that. Please try again.");
                    }
                }
            };
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsVoiceRecording(true);
    } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Microphone access is required for voice input. Please enable it in your browser settings.");
    }
  };

  const handleMicClick = () => {
      if (isVoiceRecording) {
          handleStopRecording();
      } else {
          handleStartRecording();
      }
  };

  const handleStartLiveConversation = () => {
    if (isGuest) {
        showLoginPrompt();
        return;
    }
    store.setIsLiveConversationOpen(true);
  };
  
  const isSendDisabled = store.isLoading || isStreamingText ||
    (!input.trim() && attachedFiles.length === 0) ||
    (isImageEditModel && attachedFiles.length === 0);

  const placeholder = isVoiceRecording
    ? "Recording... click mic to stop."
    : isTextToImageModel 
    ? "Describe the image you want to generate..." 
    : isImageEditModel 
      ? (attachedFiles.length > 0 ? "Describe the edits you want to make..." : "Attach an image to edit...")
      : isVideoModel 
        ? "Describe the video you want to create..."
        : isAttachmentDisabled
          ? "Type your message here..."
          : isGuest
            ? "Sign in to attach files..."
            : "Type your message here, or attach files...";


  const renderMicOrSendButton = () => {
      if (isStreamingText) {
          return (
              <button
                  type="button"
                  className="w-10 h-10 text-text-secondary rounded-lg flex items-center justify-center"
                  disabled
              >
                  <Loader2 className="h-5 w-5 animate-spin" />
              </button>
          );
      }

      if (isVoiceRecording) {
          return (
              <button
                  type="button"
                  onClick={handleMicClick}
                  className="w-10 h-10 bg-card rounded-lg flex items-center justify-center transition-colors hover:bg-interactive-hover"
                  aria-label="Stop recording"
                  data-tooltip-text="Stop recording"
                  data-tooltip-position="top"
              >
                  <Mic className="h-5 w-5 text-red-600 animate-pulse" />
              </button>
          );
      }
      
      if (isSendDisabled) {
          return (
              <button 
                  type="button"
                  onClick={handleMicClick}
                  className={`w-10 h-10 text-text-secondary hover:text-text-primary rounded-lg flex items-center justify-center transition-colors hover:bg-interactive-hover`}
                  aria-label="Start Voice Input"
                  data-tooltip-text="Voice Input"
                  data-tooltip-position="top"
              >
                  <Mic className="h-5 w-5" />
              </button>
          );
      }

      return (
          <button
              type="submit"
              className="w-10 h-10 bg-text-primary text-background rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
              data-tooltip-text="Send message"
              data-tooltip-position="top"
              disabled={isSendDisabled}
          >
              <ArrowUp className="h-6 w-6" />
          </button>
      );
  };


  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <div className="relative flex-1">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto [scrollbar-gutter:stable] hover-scrollbar">
            {messages.length === 0 && !store.isLoading ? (
            <WelcomeState />
            ) : (
            <ChatLog
                messages={messages}
                isLoading={store.isLoading}
                onOpenProjectVersion={store.handleOpenProjectVersion}
                onOpenFilePreview={store.openPreviewModal}
            />
            )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
      </div>

      {isMobile && isToolsBottomSheetOpen && (
        <>
          <div 
              className="fixed inset-0 bg-black/50 z-40 animate-fade-in" 
              onClick={() => setIsToolsBottomSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 p-4 pb-6 shadow-lg animate-slide-up">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4"></div>
              <div className="mb-4 px-2">
                  <p className="font-semibold text-lg text-text-primary">Tools</p>
              </div>
              <div className="space-y-2">
                  <button
                      onClick={() => { store.toggleCodeInterpreter(); setIsToolsBottomSheetOpen(false); }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 text-base rounded-lg transition-colors ${store.isCodeInterpreterActive ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-interactive-hover'}`}
                  >
                      <TerminalSquare className="h-5 w-5" /> Canvas
                  </button>
                  <button
                      onClick={() => { store.toggleDeepResearch(); setIsToolsBottomSheetOpen(false); }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 text-base rounded-lg transition-colors ${store.isDeepResearchToggled ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-interactive-hover'}`}
                  >
                      <Microscope className="h-5 w-5" /> Deep Research
                  </button>
                  <button
                      onClick={() => { store.toggleImageTool(); setIsToolsBottomSheetOpen(false); }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 text-base rounded-lg transition-colors ${store.isImageToolActive ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-interactive-hover'}`}
                  >
                      <Image className="h-5 w-5" /> Images
                  </button>
                  <button
                      onClick={() => { store.toggleVideoTool(); setIsToolsBottomSheetOpen(false); }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 text-base rounded-lg transition-colors ${store.isVideoToolActive ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-interactive-hover'}`}
                  >
                      <Video className="h-5 w-5" /> Videos
                  </button>
              </div>
          </div>
        </>
      )}


      <div className="px-6 pt-2 pb-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative"
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 bg-accent/20 border-2 border-dashed border-accent rounded-lg flex items-center justify-center pointer-events-none">
                <span className="text-accent font-semibold text-lg">Drop files to attach</span>
              </div>
            )}
            <div className="chat-input-container">
              <div className="chat-input-inner">
                {attachedFiles.length > 0 && (
                  <div className="px-4 pt-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={file.dataUrl} alt={file.name} className="h-16 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="h-16 w-16 bg-card rounded-md flex items-center justify-center p-1" title={file.name}>
                            <span className="text-xs text-text-secondary text-center break-all line-clamp-3">{file.name}</span>
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => handleRemoveFile(index)} 
                          className="absolute -top-1 -right-1 bg-text-secondary text-background rounded-full h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${file.name}`}
                          data-tooltip-text="Remove"
                          data-tooltip-position="top"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder={placeholder}
                    className={`chat-textarea hover-scrollbar [scrollbar-gutter:stable] ${attachedFiles.length > 0 ? 'chat-textarea-with-files' : ''}`}
                    disabled={store.isLoading || isVoiceRecording || isStreamingText}
                />
                <div className="chat-actions">
                    <div className="flex items-center gap-1">
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,text/*,application/pdf,application/json,application/javascript,text/html,text/css,text/markdown"
                      />
                      <button 
                        type="button" 
                        onClick={handleAttachClick} 
                        data-tooltip-text="Attach files" 
                        data-tooltip-position="top" 
                        className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-interactive-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        aria-label="Attach files"
                        disabled={isAttachmentDisabled || isGuest}
                      >
                          <Paperclip className="h-5 w-5" />
                      </button>
                      <div ref={toolsMenuRef} className="relative flex items-center">
                        <button
                          type="button"
                          onClick={handleToolsButtonClick}
                          className={`p-2 rounded-lg transition-colors ${isToolsMenuOpen || isToolsBottomSheetOpen ? 'bg-interactive-hover text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-interactive-hover'}`}
                          aria-label="Tools"
                          aria-haspopup="true"
                          aria-expanded={isToolsMenuOpen}
                          data-tooltip-text="Tools"
                          data-tooltip-position="top"
                        >
                          <Settings2 className="h-5 w-5" />
                        </button>
                        
                        {!isMobile && (
                            <div
                              className={`absolute bottom-1/2 translate-y-1/2 left-full ml-2 flex items-center gap-2 transition-all duration-200 ease-out origin-left ${isToolsMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                              aria-hidden={!isToolsMenuOpen}
                              role="menu"
                            >
                                <button
                                  type="button"
                                  onClick={store.toggleCodeInterpreter}
                                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg border shadow-sm transition-colors text-sm font-medium ${store.isCodeInterpreterActive ? 'bg-accent/10 text-accent border-accent/20' : 'bg-background text-text-primary border-border hover:bg-interactive-hover'}`}
                                  role="menuitem"
                                >
                                    <TerminalSquare className="h-5 w-5 flex-shrink-0" />
                                    <span>Canvas</span>
                                </button>
                                 <button
                                  type="button"
                                  onClick={store.toggleDeepResearch}
                                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg border shadow-sm transition-colors text-sm font-medium ${store.isDeepResearchToggled ? 'bg-accent/10 text-accent border-accent/20' : 'bg-background text-text-primary border-border hover:bg-interactive-hover'}`}
                                  role="menuitem"
                                >
                                    <Microscope className="h-5 w-5 flex-shrink-0" />
                                    <span>Deep Research</span>
                                </button>
                                 <button
                                  type="button"
                                  onClick={store.toggleImageTool}
                                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg border shadow-sm transition-colors text-sm font-medium ${store.isImageToolActive ? 'bg-accent/10 text-accent border-accent/20' : 'bg-background text-text-primary border-border hover:bg-interactive-hover'}`}
                                  role="menuitem"
                                >
                                    <Image className="h-5 w-5 flex-shrink-0" />
                                    <span>Images</span>
                                </button>
                                 <button
                                  type="button"
                                  onClick={store.toggleVideoTool}
                                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg border shadow-sm transition-colors text-sm font-medium ${store.isVideoToolActive ? 'bg-accent/10 text-accent border-accent/20' : 'bg-background text-text-primary border-border hover:bg-interactive-hover'}`}
                                  role="menuitem"
                                >
                                    <Video className="h-5 w-5 flex-shrink-0" />
                                    <span>Videos</span>
                                </button>
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {store.isLoading ? (
                            <button
                                type="button"
                                onClick={store.stopGeneration}
                                className="w-10 h-10 bg-text-primary text-background rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                                aria-label="Stop generation"
                                data-tooltip-text="Stop generation"
                                data-tooltip-position="top"
                            >
                                <Square className="h-4 w-4 fill-current" />
                            </button>
                        ) : (
                            <>
                                {renderMicOrSendButton()}
                                <button 
                                    type="button"
                                    onClick={handleStartLiveConversation}
                                    className={`w-10 h-10 text-text-primary bg-card rounded-lg flex items-center justify-center transition-colors`}
                                    aria-label="Voice Mode"
                                    data-tooltip-text="Voice Mode"
                                    data-tooltip-position="top"
                                >
                                    <AudioLines className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </form>
          <div className="mt-2 h-4">
            <p className={`text-xs text-center text-text-secondary transition-opacity duration-300 ${messages.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
