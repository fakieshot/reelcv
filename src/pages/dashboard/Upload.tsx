import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload as UploadIcon, 
  Video, 
  Mic, 
  Check, 
  X, 
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Upload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 50MB.',
          variant: 'destructive',
        });
        return;
      }

      simulateUpload(file);
    }
  };

  const simulateUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          const newFile = {
            id: Date.now(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
          };
          
          setUploadedFiles([...uploadedFiles, newFile]);
          
          toast({
            title: 'Upload successful',
            description: 'Your video has been uploaded successfully.',
          });
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId: number) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== fileId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Center</h1>
        <p className="text-muted-foreground mt-2">
          Upload your video CV and voice introduction to complete your profile
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video Upload */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-primary" />
              <span>Video CV Upload</span>
            </CardTitle>
            <CardDescription>
              Upload your main video CV (recommended: 1-3 minutes, max 50MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-smooth"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto w-16 h-16 gradient-primary rounded-full flex items-center justify-center mb-4">
                <UploadIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload Video CV</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your video file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: MP4, MOV, AVI • Max size: 50MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Uploaded Files</h4>
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Upload */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-accent" />
              <span>Voice Introduction</span>
            </CardTitle>
            <CardDescription>
              Record or upload a voice introduction (recommended: 30-60 seconds)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recording Controls */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-accent rounded-full flex items-center justify-center">
                <Mic className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-lg font-medium">Record Voice Introduction</h3>
              <p className="text-muted-foreground">
                Click the button below to start recording your voice introduction
              </p>
              
              <div className="flex justify-center space-x-3">
                <Button variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
                <Button variant="ghost">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Or Upload Audio File */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload audio file</span>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <UploadIcon className="mx-auto w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop audio file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported: MP3, WAV, M4A • Max: 10MB
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Upload Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Video className="w-4 h-4 mr-2 text-primary" />
                Video CV Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Record in landscape orientation (16:9 ratio)</li>
                <li>• Ensure good lighting - face the light source</li>
                <li>• Use a clean, professional background</li>
                <li>• Keep it concise: 1-3 minutes is ideal</li>
                <li>• Speak clearly and maintain eye contact</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Mic className="w-4 h-4 mr-2 text-accent" />
                Voice Introduction Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Find a quiet environment for recording</li>
                <li>• Speak at a natural, conversational pace</li>
                <li>• Keep it brief: 30-60 seconds</li>
                <li>• Introduce yourself and your passion</li>
                <li>• End with enthusiasm about opportunities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;