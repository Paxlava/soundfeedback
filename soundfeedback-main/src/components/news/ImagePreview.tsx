import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ImagePreviewProps {
  previewUrls: string[];
  onRemove: (url: string) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ previewUrls, onRemove }) => {
  const isMobile = useIsMobile();
  
  if (previewUrls.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Предпросмотр изображений:</h3>
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {previewUrls.map((url, index) => (
          <div key={index} className="relative group">
            <img 
              src={url} 
              alt={`Preview ${index + 1}`} 
              className={`w-full rounded-md border border-border ${isMobile ? 'h-auto max-h-48 object-contain' : 'h-32 object-cover'}`} 
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-80 hover:opacity-100"
              onClick={() => onRemove(url)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagePreview;
