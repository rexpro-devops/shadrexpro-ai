import React, { useMemo } from 'react';
import { Model, MediaResolution } from '../types';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface SidebarProps {
  isSidebarOpen: boolean;
  isMobile: boolean;
  modelMaxTokens: number;
}

const SidebarCollapsible: React.FC<{ title: string; children: React.ReactNode, open?: boolean }> = ({ title, children, open = false }) => {
  return (
    <Collapsible defaultOpen={open} className="border-t border-border pt-4 mt-4">
      <CollapsibleTrigger className="w-full flex justify-between items-center mb-4">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
        <ChevronDown className="h-4 w-4 text-text-secondary transition-transform [&[data-state=open]]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const SidebarSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}> = ({ label, value, onChange, min, max, step }) => {
    return (
        <div>
            <Label className="flex justify-between items-center">
              <span>{label}</span>
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Slider
                  value={[value]}
                  onValueChange={(vals) => onChange(vals[0])}
                  min={min}
                  max={max}
                  step={step}
              />
              <Input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                  className="w-20 p-1 h-8 text-center"
              />
            </div>
        </div>
    );
};

const SidebarSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    description?: React.ReactNode;
    disabled?: boolean;
}> = ({ label, enabled, onToggle, description, disabled = false }) => (
    <div className="flex items-center justify-between">
        <div>
            <Label className={`${disabled ? 'text-text-secondary/70' : ''}`}>{label}</Label>
            {description && <div className="text-xs text-text-secondary">{description}</div>}
        </div>
        <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={disabled}
        />
    </div>
);


export const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, isMobile, modelMaxTokens }) => {
  const store = useAppStore();
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
  
  const isThinkingModel = useMemo(() => activeBaseModel ? [
      Model.GEMINI_3_PRO_PREVIEW,
      Model.GEMINI_2_5_PRO, 
      Model.GEMINI_2_5_FLASH, 
      Model.GEMINI_2_5_FLASH_LITE
    ].includes(activeBaseModel) : false, [activeBaseModel]);
    
  const isAlwaysThinkingModel = useMemo(() => 
    activeBaseModel === Model.GEMINI_2_5_PRO || 
    activeBaseModel === Model.GEMINI_3_PRO_PREVIEW, 
  [activeBaseModel]);

  const mediaResolutionOptions = [
    { value: MediaResolution.DEFAULT, label: 'Default' },
    { value: MediaResolution.LOW, label: 'Low' },
    { value: MediaResolution.MEDIUM, label: 'Medium' },
    { value: MediaResolution.HIGH, label: 'High (Zoomed Reframing)' },
  ];
  
  // Max thinking budget varies by model capability
  const maxThinkingBudget = isAlwaysThinkingModel ? 32768 : 24576;
  
  const isAnyImageModel = isImageEditModel || isTextToImageModel;

  const renderContent = () => {
    if (isAnyImageModel) {
      if (isImageEditModel) {
        return (
           <div className="px-1">
            <div className="mb-4">
               <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">Output format</Label>
               <div className="w-full p-3 border border-border rounded-lg bg-card">
                  <span className="text-sm text-text-primary">Image & text</span>
               </div>
            </div>
  
            <div className="border-t border-border pt-4 mt-4 space-y-4">
              <div className="flex justify-between items-center text-sm text-text-primary">
                  <span>Token count</span>
                  <span className="text-text-secondary">N/A</span>
              </div>
  
              <SidebarSlider
                  label="Temperature"
                  value={store.temperature}
                  onChange={store.setTemperature}
                  min={0} max={2} step={0.01}
              />
            </div>
  
            <SidebarCollapsible title="Advanced settings">
                <div className="flex items-center justify-between text-sm">
                    <Label>Safety settings</Label>
                    <Button variant="link" className="p-0 h-auto">Edit</Button>
                </div>
                <div>
                    <Label className="block mb-2">Add stop sequence</Label>
                    <Input
                        type="text"
                        value={store.stopSequence}
                        onChange={e => store.setStopSequence(e.target.value)}
                        placeholder="Add stop..."
                    />
                </div>
                <div>
                    <Label className="block mb-2">Output length</Label>
                    <Input
                        type="number"
                        value={store.maxOutputTokens}
                        onChange={e => store.setMaxOutputTokens(parseInt(e.target.value, 10))}
                    />
                </div>
                <SidebarSlider
                    label="Top P"
                    value={store.topP}
                    onChange={store.setTopP}
                    min={0} max={1} step={0.01}
                />
            </SidebarCollapsible>
          </div>
        )
      }
      return (
        <div className="px-1">
          <div className="border-t border-border pt-4 mt-4 space-y-4">
            <div className="flex justify-between items-center text-sm text-text-primary">
                <span>Token count</span>
                <span className="text-text-secondary">N/A</span>
            </div>
            <SidebarSlider
              label="Number of images"
              value={store.numberOfImages}
              onChange={store.setNumberOfImages}
              min={1} max={4} step={1}
            />
            <div>
              <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">Aspect Ratio</Label>
              <Select value={store.aspectRatio} onValueChange={store.setAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ratio..."/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                  <SelectItem value="4:3">4:3 (Landscape)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">
                Negative Prompt
              </Label>
              <Textarea
                value={store.negativePrompt}
                onChange={(e) => store.setNegativePrompt(e.target.value)}
                placeholder="Describe what you don't want to see"
                rows={2}
                aria-label="Negative Prompt"
              />
            </div>
          </div>

          <SidebarCollapsible title="Advanced settings">
              <div>
                  <Label className="block mb-2">Seed</Label>
                  <Input
                      type="number"
                      value={store.seed ?? ''}
                      onChange={e => store.setSeed(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Random"
                  />
              </div>
              <div>
                <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">Person Generation</Label>
                <Select value={store.personGeneration} onValueChange={store.setPersonGeneration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select setting..."/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow_all">Allow Adults & Children</SelectItem>
                    <SelectItem value="allow_adult">Allow Adults Only</SelectItem>
                    <SelectItem value="dont_allow">Don't Allow People</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-sm">
                  <Label>Safety settings</Label>
                  <Button variant="link" className="p-0 h-auto">Edit</Button>
              </div>
          </SidebarCollapsible>
        </div>
      );
    }
    
    if (isVideoModel) {
      return (
        <div className="px-1">
          <div className="mb-4">
             <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">Output format</Label>
             <div className="w-full p-3 border border-border rounded-lg bg-card">
                <span className="text-sm text-text-primary">Video</span>
             </div>
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between items-center text-sm text-text-primary">
              <span>Token count</span>
              <span className="text-text-secondary">N/A</span>
            </div>
            <p className="text-xs text-text-secondary mt-3">Video generation settings are managed by the model.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-1">
        <div className="mb-4">
          <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">
            System Instruction
          </Label>
          <Textarea
            value={store.systemInstruction}
            onChange={(e) => store.setSystemInstruction(e.target.value)}
            placeholder="You are a helpful assistant."
            rows={1}
            className="resize-y min-h-[46px] align-middle disabled:cursor-not-allowed disabled:bg-card"
            aria-label="System Instruction"
          />
        </div>

        <div className="border-t border-border pt-4 mt-4 space-y-4">
          <div className="flex justify-between items-center text-sm text-text-primary">
              <span>Token count</span>
              <span className="text-text-secondary">{store.tokenCount.toLocaleString()} / {modelMaxTokens.toLocaleString()}</span>
          </div>

          <SidebarSlider
              label="Temperature"
              value={store.temperature}
              onChange={store.setTemperature}
              min={0} max={2} step={0.01}
          />

          <div>
            <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block px-1">Media resolution</Label>
            <Select value={store.mediaResolution} onValueChange={(val) => store.setMediaResolution(val as MediaResolution)}>
              <SelectTrigger>
                <SelectValue placeholder="Select resolution..." />
              </SelectTrigger>
              <SelectContent>
                {mediaResolutionOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isThinkingModel && (
          <div className="border-t border-border pt-4 mt-4 space-y-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">Thinking</h3>
            <SidebarSwitch 
              label="Thinking"
              enabled={isAlwaysThinkingModel || store.useThinking}
              onToggle={store.setUseThinking}
              disabled={isAlwaysThinkingModel}
            />
            {(isAlwaysThinkingModel || store.useThinking) && (
              <>
                <SidebarSwitch 
                  label="Set thinking budget"
                  enabled={store.useThinkingBudget}
                  onToggle={store.setUseThinkingBudget}
                />
                {store.useThinkingBudget && (
                  <SidebarSlider
                    label="Thinking budget"
                    value={store.thinkingBudget}
                    onChange={store.setThinkingBudget}
                    min={0}
                    max={maxThinkingBudget}
                    step={1}
                  />
                )}
              </>
            )}
          </div>
        )}

        <SidebarCollapsible title="Tools" open>
            <SidebarSwitch 
                label="Structured output" 
                enabled={store.useStructuredOutput}
                onToggle={store.setUseStructuredOutput}
                disabled={store.useGoogleSearch || isGuest}
                description={
                    <>
                        <Button 
                            variant="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => isGuest ? showLoginPrompt() : store.openSchemaModal()}
                            disabled={!store.useStructuredOutput || isGuest}
                        >
                            Edit
                        </Button>
                        {store.useGoogleSearch && <span className="text-xs text-text-secondary ml-2">(Unavailable with Google Search)</span>}
                        {isGuest && <span className="text-xs text-text-secondary ml-2">(Sign in to use)</span>}
                    </>
                }
            />
            <SidebarSwitch label="Code execution" enabled={store.useCodeExecution} onToggle={store.setUseCodeExecution} />
            <SidebarSwitch 
                label="Function calling"
                enabled={store.useFunctionCalling}
                onToggle={store.setUseFunctionCalling}
                description={<Button variant="link" className="p-0 h-auto text-xs" disabled={!store.useFunctionCalling}>Edit</Button>}
            />
            <div>
              <SidebarSwitch
                  label="Grounding with Google Search"
                  enabled={store.useGoogleSearch}
                  onToggle={store.setUseGoogleSearch}
                  description={<span className="inline-flex items-center text-xs">Source: <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-3 h-3 mx-1"/> Google Search</span>}
              />
              <div className="mt-4">
                <SidebarSwitch 
                    label="URL context"
                    enabled={store.useUrlContext}
                    onToggle={store.setUseUrlContext}
                    disabled={!store.useGoogleSearch}
                    description={!store.useGoogleSearch && <span className="text-xs text-text-secondary">(Requires Google Search)</span>}
                />
                {store.useUrlContext && store.useGoogleSearch && (
                    <div className="mt-2">
                        <Input
                            type="url"
                            value={store.urlContext}
                            onChange={e => store.setUrlContext(e.target.value)}
                            placeholder="https://example.com"
                            aria-label="URL for context"
                        />
                    </div>
                )}
              </div>
            </div>
        </SidebarCollapsible>

        <SidebarCollapsible title="Advanced settings">
            <div className="flex items-center justify-between text-sm">
                <Label>Safety settings</Label>
                <Button variant="link" className="p-0 h-auto text-sm">Edit</Button>
            </div>
            <div>
                <Label className="block mb-2">Add stop sequence</Label>
                <Input
                    type="text"
                    value={store.stopSequence}
                    onChange={e => store.setStopSequence(e.target.value)}
                    placeholder="Add stop..."
                />
            </div>
            <div>
                <Label className="block mb-2">Output length</Label>
                <Input
                    type="number"
                    value={store.maxOutputTokens}
                    onChange={e => store.setMaxOutputTokens(parseInt(e.target.value, 10))}
                />
            </div>
            <SidebarSlider
                label="Top P"
                value={store.topP}
                onChange={store.setTopP}
                min={0} max={1} step={0.01}
            />
        </SidebarCollapsible>
      </div>
    );
  };


  return (
    <aside className={`
      bg-background flex-shrink-0 overflow-hidden
      ${ isMobile
        ? `fixed top-14 bottom-0 right-0 z-30 w-[320px] border-l border-border transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 shadow-lg' : 'translate-x-full'}`
        : `border-border rounded-lg transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[320px] border ml-4' : 'w-0 border-none'}`
      }
    `}>
      <div className={`
        p-4 w-[320px] transition-opacity duration-150 ease-in-out overflow-y-auto h-full hover-scrollbar [scrollbar-gutter:stable]
        ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
      `}>
        {renderContent()}
      </div>
    </aside>
  );
};
