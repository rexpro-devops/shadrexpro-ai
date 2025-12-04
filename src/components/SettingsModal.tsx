import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Monitor, User, Database, Info, Trash2, Download, DollarSign, Eye, EyeOff } from 'lucide-react';
import { Model } from '../types';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Theme = 'light' | 'dark' | 'system';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

const ThemeButton = ({ currentTheme, setTheme, value, label, Icon }: { currentTheme: Theme, setTheme: (t: Theme) => void, value: Theme; label: string; Icon: React.ElementType }) => (
    <Button
        variant={currentTheme === value ? "outline" : "ghost"}
        onClick={() => setTheme(value)}
        className={`flex-1 h-auto py-2 ${currentTheme === value ? "border-accent bg-accent/10" : "border-border"}`}
    >
        <div className="flex flex-col items-center gap-1">
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    </Button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'general' }) => {
  const {
      theme,
      setTheme,
      setIsClearHistoryModalOpen,
      usageStats,
      setIsResetUsageModalOpen,
      exportHistory,
      userApiKey,
      setUserApiKey,
  } = useAppStore();
  
  const [apiKeyInput, setApiKeyInput] = useState(userApiKey || '');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const modelNameMap = useMemo(() => ({
      [Model.GEMINI_3_PRO_PREVIEW]: 'Gemini 3 Pro Preview',
      [Model.GEMINI_3_PRO_IMAGE_PREVIEW]: 'Gemini 3 Pro Image',
      [Model.GEMINI_2_5_PRO]: 'Gemini 2.5 Pro',
      [Model.GEMINI_2_5_FLASH]: 'Gemini 2.5 Flash',
      [Model.GEMINI_2_5_FLASH_LITE]: 'Gemini 2.5 Flash-Lite',
      [Model.GEMINI_2_0_FLASH]: 'Gemini 2.0 Flash',
      [Model.GEMINI_2_0_FLASH_LITE]: 'Gemini 2.0 Flash-Lite',
      [Model.GEMINI_2_5_FLASH_IMAGE]: 'Flash 2.5 Image',
      [Model.GEMINI_2_0_FLASH_IMAGE_PREVIEW]: 'Flash 2.0 Image Preview',
      [Model.IMAGEN_4_0_GENERATE_001]: 'Imagen 4',
      [Model.IMAGEN_4_0_ULTRA_GENERATE_001]: 'Imagen 4 Ultra',
      [Model.IMAGEN_4_0_FAST_GENERATE_001]: 'Imagen 4 Fast',
      [Model.IMAGEN_3_0_GENERATE_002]: 'Imagen 3',
      [Model.VEO_3_0_GENERATE_PREVIEW]: 'Veo 3 Preview',
      [Model.VEO_3_0_FAST_GENERATE_PREVIEW]: 'Veo 3 Fast Preview',
      [Model.VEO_2_0_GENERATE_001]: 'Veo 2',
  }), []);

  useEffect(() => {
    if (isOpen) {
        setApiKeyInput(userApiKey || '');
        setSaveMessage('');
    }
  }, [isOpen, userApiKey]);

  const handleSaveKey = () => {
    setUserApiKey(apiKeyInput.trim() || null);
    setSaveMessage('API Key saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleClearKey = () => {
      setApiKeyInput('');
      setUserApiKey(null);
      setSaveMessage('API Key cleared!');
      setTimeout(() => setSaveMessage(''), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex p-0 gap-0">
        <Tabs defaultValue={initialTab} orientation="vertical" className="flex flex-1">
          <TabsList className="flex flex-col h-full w-1/4 bg-card/50 p-4 border-r border-border rounded-none justify-start items-stretch gap-2">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-left px-1">Settings</DialogTitle>
            </DialogHeader>
            <TabsTrigger value="general" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><Sun className="h-4 w-4 mr-3" />General</TabsTrigger>
            <TabsTrigger value="account" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><User className="h-4 w-4 mr-3" />Account & API</TabsTrigger>
            <TabsTrigger value="data" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><Database className="h-4 w-4 mr-3" />Data & Privacy</TabsTrigger>
            <TabsTrigger value="usage" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><DollarSign className="h-4 w-4 mr-3" />Usage</TabsTrigger>
            <TabsTrigger value="about" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><Info className="h-4 w-4 mr-3" />About</TabsTrigger>
          </TabsList>

          <div className="w-3/4 flex flex-col">
            <div className="p-8 overflow-y-auto flex-1">
              <TabsContent value="general">
                <h3 className="text-xl font-bold text-text-primary mb-6">General</h3>
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Theme</Label>
                    <div className="flex gap-4">
                      <ThemeButton currentTheme={theme} setTheme={setTheme} value="light" label="Light" Icon={Sun} />
                      <ThemeButton currentTheme={theme} setTheme={setTheme} value="dark" label="Dark" Icon={Moon} />
                      <ThemeButton currentTheme={theme} setTheme={setTheme} value="system" label="System" Icon={Monitor} />
                    </div>
                  </div>
                   <div>
                        <Label className="mb-2 block">Voice Model</Label>
                        <div className="w-full p-2.5 border border-input rounded-lg text-sm text-muted-foreground bg-card">
                            Gemini 2.5 Flash (Native Audio)
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                            Using the recommended model for live conversation.
                        </p>
                    </div>
                </div>
              </TabsContent>
              <TabsContent value="account">
                <h3 className="text-xl font-bold text-text-primary mb-6">Account & API</h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-text-primary mb-2 text-base">API Key Management</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                            Provide your own Gemini API Key to use the application. 
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">Get your key here.</a>
                        </p>
                        <div className="relative">
                            <Input
                                type={isKeyVisible ? 'text' : 'password'}
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="Enter your Gemini API Key"
                                className="pr-10 font-mono"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsKeyVisible(!isKeyVisible)}
                                className="absolute inset-y-0 right-0 h-full"
                            >
                                {isKeyVisible ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 px-1">
                            <b>Warning:</b> Your API key is stored locally in your browser. Do not use this on a shared computer.
                        </p>
                        <div className="flex items-center justify-between mt-3">
                            <div>
                                <Button onClick={handleSaveKey}>Save Key</Button>
                                <Button onClick={handleClearKey} variant="secondary" className="ml-2">Clear</Button>
                            </div>
                            <span className="text-sm text-green-600 dark:text-green-400 transition-opacity duration-300">{saveMessage}</span>
                        </div>
                    </div>
                </div>
              </TabsContent>
              <TabsContent value="data">
                <h3 className="text-xl font-bold text-text-primary mb-6">Data & Privacy</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold text-text-primary">Export Chat History</h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Download all your conversations as a JSON file.</p>
                    <Button onClick={exportHistory}>
                        <Download />
                        Export
                    </Button>
                  </div>
                   <div className="p-4 border border-red-300 dark:border-red-700/60 rounded-lg bg-red-50/50 dark:bg-red-900/20">
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Clear Chat History</h4>
                    <p className="text-sm text-red-600 dark:text-red-300/80 mt-1 mb-3">Permanently delete all of your chat history. This action cannot be undone.</p>
                    <Button variant="destructive" onClick={() => setIsClearHistoryModalOpen(true)}>
                        <Trash2 />
                        Clear All Data
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="usage">
                <h3 className="text-xl font-bold text-text-primary mb-2">Usage</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Estimated costs based on your usage. Prices may not be final. Video costs are estimated assuming a 10-second duration.
                </p>
                
                <div className="mb-6 p-4 bg-card rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-3xl font-bold text-text-primary">${usageStats.totalCost.toFixed(6)}</p>
                </div>

                <div className="space-y-4">
                    <h4 className="font-semibold text-text-primary">Cost Breakdown by Model</h4>
                    <div className="border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-card/50">
                                    <tr>
                                        <th className="px-4 py-2 font-medium text-text-secondary">Model</th>
                                        <th className="px-4 py-2 font-medium text-text-secondary text-right">Input Tokens</th>
                                        <th className="px-4 py-2 font-medium text-text-secondary text-right">Output Tokens</th>
                                        <th className="px-4 py-2 font-medium text-text-secondary text-right">Images/Videos</th>
                                        <th className="px-4 py-2 font-medium text-text-secondary text-right">Est. Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {Object.entries(usageStats.breakdown).length > 0 ? Object.entries(usageStats.breakdown).map(([modelId, data]: [string, any]) => (
                                        <tr key={modelId}>
                                            <td className="px-4 py-2 font-medium text-text-primary">{modelNameMap[modelId] || modelId}</td>
                                            <td className="px-4 py-2 text-text-secondary text-right">{data.inputTokens.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-text-secondary text-right">{data.outputTokens.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-text-secondary text-right">{(data.images + data.videos).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-text-secondary text-right">${data.cost.toFixed(6)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-4 text-center text-text-secondary">No usage data recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border">
                         <Button variant="destructive" onClick={() => setIsResetUsageModalOpen(true)}>
                            <Trash2 />
                            Reset Usage Data
                        </Button>
                    </div>
                </div>
              </TabsContent>
              <TabsContent value="about">
               <div>
                <h3 className="text-xl font-bold text-text-primary mb-6">About</h3>
                <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                        <span className="font-medium text-text-secondary">App Version</span>
                        <span className="text-text-primary">1.0.0</span>
                    </div>
                     <div className="p-3 bg-card rounded-lg">
                        <span className="font-medium text-text-secondary block mb-2">Helpful Links</span>
                        <ul className="space-y-1">
                            <li><a href="https://ai.google.dev/docs" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Gemini API Documentation</a></li>
                            <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Privacy Policy</a></li>
                            <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
              </div>
              </TabsContent>
            </div>
            <DialogFooter className="p-4 border-t border-border bg-card/50">
                <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
