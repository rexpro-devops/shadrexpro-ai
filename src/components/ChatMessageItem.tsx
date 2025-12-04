
import React, { useState, useMemo } from 'react';
import { ChatMessage, Role, Attachment, Project } from '../types';
import { Copy, Check, Download, FileText, GitFork, Trash2, Volume2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkCold, coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProjectFileCard from './ProjectFileCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface ChatMessageItemProps {
    msg: ChatMessage;
    isLastMessage: boolean;
    isLoading: boolean;
    onOpenProjectVersion: (project: Project) => void;
    onOpenFilePreview: (file: Attachment) => void;
}

const LoadingDots: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-text-secondary rounded-full dot-1"></span>
    <span className="w-2 h-2 bg-text-secondary rounded-full dot-2"></span>
    <span className="w-2 h-2 bg-text-secondary rounded-full dot-3"></span>
  </div>
);

const CodeBlock: React.FC<any> = ({ node, inline, className, children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    React.useEffect(() => {
        const matcher = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(matcher.matches);
        const onChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        matcher.addEventListener('change', onChange);
        return () => matcher.removeEventListener('change', onChange);
    }, []);

    const [copied, setCopied] = useState(false);
    const codeString = String(children).replace(/\n$/, '');
    const isSingleLineBlock = !inline && !codeString.includes('\n');
    
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
  
    const handleCodeCopy = () => {
      navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    if (inline || isSingleLineBlock) {
      return (
        <code className="bg-card text-text-primary rounded-md px-1.5 py-0.5 font-mono text-sm">
          {children}
        </code>
      );
    }
  
    return (
      <div className="my-4 rounded-lg border border-border overflow-hidden font-sans bg-card">
        <div className="flex justify-between items-center bg-interactive-hover px-4 py-1.5 border-b border-border">
          <span className="text-xs text-text-secondary font-semibold">
            {language.toUpperCase()}
          </span>
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleCodeCopy}
                        variant="ghost"
                        size="icon"
                        aria-label="Copy code"
                        className="h-6 w-6"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <SyntaxHighlighter
          style={isDarkMode ? coldarkDark : coldarkCold}
          language={language}
          PreTag="div"
          customStyle={{ padding: '1rem', margin: 0, overflowX: 'auto', backgroundColor: 'transparent', fontSize: '0.875rem' }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
};

interface ReasoningCardProps {
  reasoningText: string;
  isExpanded: boolean;
  onToggle: () => void;
  markdownComponents: { [key: string]: React.ElementType };
}

const ReasoningCard: React.FC<ReasoningCardProps> = ({ reasoningText, isExpanded, onToggle, markdownComponents }) => {
    return (
        <div className="mb-4 bg-card rounded-lg overflow-hidden">
            <Button onClick={onToggle} variant="ghost" className="w-full px-4 py-3 justify-between items-center h-auto">
                <div className="flex flex-col text-left">
                  <span className="text-xs text-text-secondary">Thinking</span>
                  <span className="font-semibold text-text-primary mt-1">Show thought process</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
            {isExpanded && (
                <div className="markdown-body px-4 pb-3 text-text-primary leading-relaxed border-t border-border/50 pt-3">
                     <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                        {reasoningText}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};

interface CodeExecutionCardProps {
    title: string;
    code?: string;
    output?: string;
}

const CodeExecutionCard: React.FC<CodeExecutionCardProps> = ({ title, code, output }) => {
    const [copied, setCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const contentToCopy = code || output || '';

    const handleCopy = () => {
        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleDownload = () => {
      const blob = new Blob([contentToCopy], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title.toLowerCase().replace(/\s+/g, '_') + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
        <div className="my-4 rounded-lg border border-border overflow-hidden bg-card">
            <div className="flex justify-between items-center px-4 py-2">
                <div className="flex items-center gap-3 text-sm font-medium text-text-primary">
                    <span className="font-mono text-text-secondary">&lt;/&gt;</span>
                    <span>{title}</span>
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleDownload} variant="ghost" size="icon" className="h-7 w-7"><Download className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button onClick={handleCopy} variant="ghost" size="icon" className="h-7 w-7">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => setIsCollapsed(!isCollapsed)} variant="ghost" size="icon" className="h-7 w-7">
                               {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isCollapsed ? "Expand" : "Collapse"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
            </div>
            {!isCollapsed && (
              <div className="border-t border-border">
                  {code && (
                      <div className="font-sans bg-card">
                          <SyntaxHighlighter
                              style={document.documentElement.classList.contains('dark') ? coldarkDark : coldarkCold}
                              language="python"
                              PreTag="div"
                              customStyle={{ padding: '1rem', margin: 0, overflowX: 'auto', backgroundColor: 'transparent', fontSize: '0.875rem' }}
                          >
                              {code.replace(/\n$/, '')}
                          </SyntaxHighlighter>
                      </div>
                  )}
                  {output && (
                       <pre className="text-sm text-text-secondary bg-interactive-hover p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                          {output}
                      </pre>
                  )}
              </div>
            )}
        </div>
    );
};

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ msg, isLastMessage, isLoading, onOpenProjectVersion, onOpenFilePreview }) => {
    const [copied, setCopied] = useState(false);
    const [expandedReasoning, setExpandedReasoning] = useState(false);

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const toggleReasoning = () => setExpandedReasoning(prev => !prev);
    
    const markdownComponents = useMemo(() => {
        const CitationSpan: React.FC<{ numbers: number[] }> = ({ numbers }) => {
            if (numbers.length === 0) return null;
    
            const citationContents = numbers
                .map(num => {
                    const citation = msg.citations?.[num - 1];
                    return citation ? `Source ${num}: ${citation.sourceName}\n\n${citation.content}` : `Source ${num}: Content not found.`;
                })
                .join('\n\n---\n\n');
    
            return (
                <span className="inline-citation relative">
                    {numbers.join(', ')}
                    <div className="citation-popover hover-scrollbar" role="tooltip">
                        <pre className="whitespace-pre-wrap font-sans text-text-primary leading-relaxed">
                            {citationContents}
                        </pre>
                    </div>
                </span>
            );
        };
    
        const ComponentWithCitations: React.FC<{ As: React.ElementType; children: React.ReactNode;[key: string]: any; }> = ({ As, children, ...props }) => {
            const newChildren = React.Children.toArray(children).flatMap((child) => {
                if (typeof child !== 'string') {
                    return child;
                }
    
                const regex = /\[Reference ([\d,\s]+)\]|<sup>cite:([\d,]+)<\/sup>/g;
                const parts: (string | React.ReactElement)[] = [];
                let lastIndex = 0;
                let match;
    
                while ((match = regex.exec(child)) !== null) {
                    if (match.index > lastIndex) {
                        parts.push(child.substring(lastIndex, match.index));
                    }
                    
                    const numbersStr = (match[1] || match[2]).replace(/\s/g, '');
                    const numbers = numbersStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                    
                    parts.push(<CitationSpan key={match.index} numbers={numbers} />);
                    lastIndex = match.index + match[0].length;
                }
    
                if (lastIndex < child.length) {
                    parts.push(child.substring(lastIndex));
                }
    
                return parts;
            });
    
            return <As {...props}>{newChildren}</As>;
        };

        return {
            p: (props: any) => <ComponentWithCitations As="p" {...props} className="mb-4" />,
            li: (props: any) => <ComponentWithCitations As="li" {...props} className="mb-1" />,
            h1: ({node, level, ...props}: any) => <h1 className="text-2xl font-bold mb-4 mt-5 border-b border-border pb-2" {...props} />,
            h2: ({node, level, ...props}: any) => <h2 className="text-xl font-bold mb-3 mt-4 border-b border-border pb-1.5" {...props} />,
            h3: ({node, level, ...props}: any) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
            ul: ({node, ordered, depth, ...props}: any) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2" {...props} />,
            ol: ({node, ordered, depth, start, ...props}: any) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2" {...props} />,
            code: CodeBlock,
            sup: (props: any) => <sup {...props} />,
            blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-border pl-4 my-4 italic text-text-secondary" {...props} />,
            table: ({node, ...props}: any) => <div className="overflow-x-auto my-4 border border-border rounded-lg"><table className="w-full text-sm" {...props} /></div>,
            thead: ({node, ...props}: any) => <thead className="bg-card" {...props} />,
            tr: ({node, isHeader, ...props}: any) => <tr className="border-b border-border last:border-b-0" {...props} />,
            th: ({node, isHeader, style, ...props}: any) => <th className="px-4 py-2 text-left font-semibold text-text-primary" {...props} />,
            td: ({node, isHeader, style, ...props}: any) => <td className="px-4 py-2 text-text-primary" {...props} />,
            img: ({node, ...props}: any) => <img className="max-w-md rounded-lg my-4" {...props} />,
        }
    }, [msg.citations]);

    const uniqueCitations = useMemo(() => {
        if (!msg.citations) return [];
        return msg.citations.filter((citation, index, self) =>
            index === self.findIndex((c) => c.sourceName === citation.sourceName)
        );
    }, [msg.citations]);

    if (msg.role === Role.TOOL) {
        return (
            <div>
            {msg.toolOutput && (
                <CodeExecutionCard
                    title="Code execution result"
                    output={msg.toolOutput}
                />
            )}
            </div>
        );
    }

    if (msg.role === Role.MODEL) {
        const hasAttachments = msg.attachments && msg.attachments.length > 0;
        const hasImageAttachment = hasAttachments && msg.attachments!.some(att => att.mimeType.startsWith('image/'));
        
        return (
            <div>
                {msg.codeToExecute && (
                    <CodeExecutionCard
                        title="Executable code"
                        code={msg.codeToExecute}
                    />
                )}
                {msg.reasoning && msg.reasoning.trim() && (
                    <ReasoningCard
                        reasoningText={msg.reasoning}
                        isExpanded={expandedReasoning}
                        onToggle={toggleReasoning}
                        markdownComponents={markdownComponents}
                    />
                )}
                {msg.content ? (
                    <div className="markdown-body w-full text-text-primary leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                            {msg.content}
                        </ReactMarkdown>
                        {isLastMessage && isLoading && (
                            <span className="inline-block w-2 h-4 bg-text-primary ml-1 animate-blink-cursor align-bottom" />
                        )}
                    </div>
                ) : (isLastMessage && isLoading) ? (
                    <div className="flex items-center p-3">
                        <LoadingDots />
                    </div>
                ) : null}
                {hasAttachments && (
                    <div className="mt-4 flex flex-wrap gap-4">
                        {msg.attachments!.map((att, attIndex) => (
                            <div key={attIndex} className="relative group max-w-sm">
                                <button onClick={() => onOpenFilePreview(att)} className="block w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg">
                                {att.mimeType.startsWith('image/') && (
                                    <img src={att.dataUrl} alt={att.name} className="max-h-96 rounded-lg object-contain border border-border" />
                                )}
                                {att.mimeType.startsWith('video/') && (
                                    <video src={att.dataUrl} controls autoPlay muted loop className="max-h-96 rounded-lg object-contain border border-border" />
                                )}
                                </button>
                                <Button asChild size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-8 w-8">
                                    <a 
                                        href={att.dataUrl} 
                                        download={att.name}
                                        aria-label={`Download ${att.name}`}
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                {uniqueCitations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4"/>
                            Cited Sources
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {uniqueCitations.map((citation, i) => (
                                <div
                                    key={i}
                                    className="text-xs bg-card text-text-primary px-2.5 py-1.5 rounded-full"
                                    title={citation.sourceName}
                                >
                                    {citation.sourceName}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
                            <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-4 h-4"/>
                            Sources
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {msg.groundingChunks.map((chunk: any, i: number) => (
                                chunk.web?.uri && (
                                    <a
                                        key={i}
                                        href={chunk.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs bg-card text-accent px-2.5 py-1.5 rounded-full hover:bg-interactive-hover transition-colors block max-w-xs truncate"
                                        title={chunk.web.title || chunk.web.uri}
                                    >
                                        {chunk.web.title || new URL(chunk.web.uri).hostname}
                                    </a>
                                )
                            ))}
                        </div>
                    </div>
                )}
                {msg.projectFilesUpdate && msg.project && (
                    <ProjectFileCard project={msg.project} onOpen={() => onOpenProjectVersion(msg.project!)} />
                )}
                {!(isLoading && isLastMessage) && msg.content && !msg.projectFilesUpdate && !hasImageAttachment && (
                    <div className="mt-2 flex items-center gap-1 text-text-secondary">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><GitFork className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Fork</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Volume2 className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Read Aloud</TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => handleCopy(msg.content)} variant="ghost" size="icon" className="h-7 w-7">
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
        );
    }
    
    // User message
    return (
        <div className="flex justify-end">
            <div className="rounded-xl rounded-tr-[0.15rem] px-4 py-3 max-w-[80%] bg-card text-text-primary">
            {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                {msg.attachments.map((file, fileIndex) => (
                    <div key={fileIndex} className="relative">
                    <button onClick={() => onOpenFilePreview(file)} className="block w-full h-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg">
                        {file.mimeType.startsWith('image/') ? (
                        <img src={file.dataUrl} alt={file.name} className="max-w-xs max-h-48 rounded-lg object-contain" />
                        ) : (
                        <div className="p-2 bg-interactive-hover rounded-lg text-xs">
                            {file.name}
                        </div>
                        )}
                    </button>
                    </div>
                ))}
                </div>
            )}
            {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
            </div>
        </div>
    );
};

export default ChatMessageItem;
