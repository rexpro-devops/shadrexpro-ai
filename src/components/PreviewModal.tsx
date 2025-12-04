import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Attachment } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PreviewModalProps {
  isOpen: boolean;
  file: Attachment | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, file, onClose }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (file && file.mimeType === 'application/pdf' && file.dataUrl) {
      try {
        const byteCharacters = atob(file.dataUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
          URL.revokeObjectURL(url);
          setObjectUrl(null);
        };
      } catch (e) {
        console.error("Error creating PDF Object URL:", e);
      }
    }
  }, [file]);


  const decodedTextContent = useMemo(() => {
    if (file && file.mimeType.startsWith('text/')) {
      try {
        const base64Part = file.dataUrl.split(',')[1];
        if (base64Part) {
          // Robustly decode base64 that might contain non-latin characters
          return decodeURIComponent(atob(base64Part).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
        }
      } catch (e) {
        console.error("Failed to decode base64 content:", e);
        return "Error: Could not display file content.";
      }
    }
    return null;
  }, [file]);


  const renderContent = () => {
    if (file.mimeType.startsWith('image/')) {
      return (
        <img
          src={file.dataUrl}
          alt={file.name}
          className="max-w-full max-h-full object-contain"
        />
      );
    }
    if (file.mimeType.startsWith('video/')) {
      return (
        <video
          src={file.dataUrl}
          controls
          autoPlay
          className="max-w-full max-h-full"
        />
      );
    }
    if (file.mimeType === 'application/pdf') {
      return (
        <iframe
          src={objectUrl || ''}
          title={file.name}
          className="w-full h-full border-none"
        />
      );
    }
    if (decodedTextContent) {
      return (
        <pre className="w-full h-full bg-secondary p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
          {decodedTextContent}
        </pre>
      );
    }
    return (
      <div className="text-center text-muted-foreground">
        Preview not available for this file type.
      </div>
    );
  };

  const handlePrint = () => {
    if (file.mimeType === 'application/pdf' && objectUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = objectUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      };
    } else if (file.mimeType.startsWith('image/')) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(
        `<html><head><title>Print</title></head><body style="margin:0;"><img src="${file.dataUrl}" style="max-width:100%;"></body></html>`
      );
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
      printWindow?.close();
    } else {
      alert('Print is only supported for PDF and image files currently.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {file && (
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="border-b p-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrint}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Print</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={file.dataUrl} download={file.name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </DialogHeader>
          <div className="flex-1 flex justify-center items-center bg-secondary/50 overflow-hidden">
            {renderContent()}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};