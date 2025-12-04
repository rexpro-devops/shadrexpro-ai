
import React, { useMemo, useState } from 'react';

import { Model } from '../types';

import { ChevronDown } from 'lucide-react';

import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

  DialogTrigger,

  DialogClose,

} from '@/components/ui/dialog';

import {

  Select,

  SelectContent,

  SelectGroup,

  SelectItem,

  SelectLabel,

  SelectTrigger,

  SelectValue,

} from '@/components/ui/select';



interface HeaderModelSelectorProps {

  isMobile: boolean;

}



export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({ isMobile }) => {

  const { 

      selectedModel,

      setSelectedModel,

      isDeepResearchToggled,

      isCodeInterpreterActive,

      isImageToolActive,

      isVideoToolActive,

   } = useAppStore();

   const [isMobileModalOpen, setMobileModalOpen] = useState(false);

  

  const chatModelNameMap: Partial<Record<Model, string>> = {

    [Model.GEMINI_3_PRO_PREVIEW]: 'Gemini 3 Pro Preview',

    [Model.GEMINI_2_5_PRO]: 'Gemini 2.5 Pro', 

    [Model.GEMINI_2_5_FLASH]: 'Gemini 2.5 Flash', 

    [Model.GEMINI_2_5_FLASH_LITE]: 'Gemini 2.5 Flash-Lite',

    [Model.GEMINI_2_0_FLASH]: 'Gemini 2.0 Flash', 

    [Model.GEMINI_2_0_FLASH_LITE]: 'Gemini 2.0 Flash-Lite',

  };



  const imageGenerationModelNameMap: Partial<Record<Model, string>> = {

    [Model.IMAGEN_4_0_ULTRA_GENERATE_001]: 'Imagen 4 Ultra',

    [Model.IMAGEN_4_0_GENERATE_001]: 'Imagen 4',

    [Model.IMAGEN_4_0_FAST_GENERATE_001]: 'Imagen 4 Fast',

    [Model.IMAGEN_3_0_GENERATE_002]: 'Imagen 3',

  };



  const imageEditingModelNameMap: Partial<Record<Model, string>> = {

    [Model.GEMINI_3_PRO_IMAGE_PREVIEW]: 'Gemini 3 Pro Image',

    [Model.GEMINI_2_5_FLASH_IMAGE]: 'Gemini 2.5 Flash Image',

    [Model.GEMINI_2_0_FLASH_IMAGE_PREVIEW]: 'Flash 2.0 Preview Image',

  };



  const videoGenerationModelNameMap: Partial<Record<Model, string>> = {

    [Model.VEO_3_0_GENERATE_PREVIEW]: 'Veo 3 Preview',

    [Model.VEO_3_0_FAST_GENERATE_PREVIEW]: 'Veo 3 Fast Preview',

    [Model.VEO_2_0_GENERATE_001]: 'Veo 2',

  };



  const modelOptions = useMemo(() => (Object.keys(chatModelNameMap) as Model[]).map(modelKey => ({ value: modelKey, label: chatModelNameMap[modelKey]! })), [chatModelNameMap]);

  const deepResearchCompatibleModels: (Model | string)[] = [Model.GEMINI_3_PRO_PREVIEW, Model.GEMINI_2_5_PRO, Model.GEMINI_2_5_FLASH];

  const codeInterpreterCompatibleModels: (Model | string)[] = [

    Model.GEMINI_3_PRO_PREVIEW,

    Model.GEMINI_2_5_PRO,

    Model.GEMINI_2_5_FLASH,

    Model.GEMINI_2_5_FLASH_LITE,

    Model.GEMINI_2_0_FLASH,

    Model.GEMINI_2_0_FLASH_LITE,

  ];



  const { chatModels, imageGenModels, imageEditModels, videoModels } = useMemo(() => {

    let filteredChatModels = modelOptions;



    if (isDeepResearchToggled) {

        filteredChatModels = modelOptions.filter(opt => deepResearchCompatibleModels.includes(opt.value as Model));

    } else if (isCodeInterpreterActive) {

        filteredChatModels = modelOptions.filter(opt => codeInterpreterCompatibleModels.includes(opt.value as Model));

    }



    return {

      chatModels: filteredChatModels,

      imageGenModels: (Object.keys(imageGenerationModelNameMap) as Model[]).map(k => ({value: k, label: imageGenerationModelNameMap[k]!})),

      imageEditModels: (Object.keys(imageEditingModelNameMap) as Model[]).map(k => ({value: k, label: imageEditingModelNameMap[k]!})),

      videoModels: (Object.keys(videoGenerationModelNameMap) as Model[]).map(k => ({value: k, label: videoGenerationModelNameMap[k]!})),

    }

  }, [modelOptions, isDeepResearchToggled, isCodeInterpreterActive]);





  const allBaseModelsMap = useMemo(() => ({

    ...chatModelNameMap,

    ...imageGenerationModelNameMap,

    ...imageEditingModelNameMap,

    ...videoGenerationModelNameMap,

  }), []);



  const selectedLabel = useMemo(() => {

      return allBaseModelsMap[selectedModel as Model] || selectedModel;

  }, [selectedModel, allBaseModelsMap]);



  const handleMobileSelect = (model: string) => {

    setSelectedModel(model);

    setMobileModalOpen(false);

  }



  if (isMobile) {

    const renderMobileOptions = () => {

      const optionButton = (opt: { value: string, label: string }) => (

          <Button

            variant={selectedModel === opt.value ? 'secondary' : 'ghost'}

            key={opt.value}

            className="w-full justify-start"

            onClick={() => handleMobileSelect(opt.value)}

          >

            {opt.label}

          </Button>

      );



      if (isVideoToolActive) {

        return videoModels.map(optionButton);

      }

      if (isImageToolActive) {

        return (

          <>

            <h4 className="text-sm font-semibold text-text-secondary px-2 pt-2">Image Generation</h4>

            {imageGenModels.map(optionButton)}

            <h4 className="text-sm font-semibold text-text-secondary px-2 pt-2">Image Editing</h4>

            {imageEditModels.map(optionButton)}

          </>

        )

      }

      return chatModels.map(optionButton);

    }



    return (

      <Dialog open={isMobileModalOpen} onOpenChange={setMobileModalOpen}>

        <DialogTrigger asChild>

          <Button variant="outline" className="w-full md:w-[17.5rem] justify-between">

            <span className="truncate">{selectedLabel}</span>

            <ChevronDown className="h-4 w-4 text-text-secondary" />

          </Button>

        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px] bottom-0 top-auto translate-y-0 rounded-b-none rounded-t-lg p-4">

          <DialogHeader>

            <DialogTitle>Select a Model</DialogTitle>

          </DialogHeader>

          <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">

            {renderMobileOptions()}

          </div>

        </DialogContent>

      </Dialog>

    )

  }



  return (

    <Select value={selectedModel} onValueChange={setSelectedModel}>

      <SelectTrigger className="w-full md:w-[17.5rem]">

        <SelectValue placeholder="Select a model" />

      </SelectTrigger>

      <SelectContent className="max-h-80">

        {isVideoToolActive ? (

          <SelectGroup>

            <SelectLabel>Video Models</SelectLabel>

            {videoModels.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}

          </SelectGroup>

        ) : isImageToolActive ? (

          <>

            <SelectGroup>

              <SelectLabel>Image Generation</SelectLabel>

              {imageGenModels.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}

            </SelectGroup>

            <SelectGroup>

              <SelectLabel>Image Editing</SelectLabel>

              {imageEditModels.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}

                        </SelectGroup>

                      </>

                    ) : (

          <SelectGroup>

            <SelectLabel>Base Models</SelectLabel>

            {chatModels.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}

          </SelectGroup>

        )}

      </SelectContent>

    </Select>

  );

};
