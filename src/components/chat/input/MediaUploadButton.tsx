import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { MediaPreview } from "./MediaPreview";
import { MediaSendParams } from "./MessageInputContainer";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadButtonProps {
  conversationId: string;
  onSendMedia: (params: MediaSendParams) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export const MediaUploadButton = ({ onSendMedia, disabled }: MediaUploadButtonProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 16MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleClick}
        disabled={disabled}
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      {selectedFile && (
        <MediaPreview
          file={selectedFile}
          onSend={onSendMedia}
          onClose={handleClose}
        />
      )}
    </>
  );
};
