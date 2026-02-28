import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { ExportFormat, ExportOptions, exportData } from '@/utils/exportUtils';

interface ExportDialogProps {
  options: Omit<ExportOptions, 'filename'>;
  filename: string;
  trigger?: React.ReactNode;
  onExport?: (format: ExportFormat) => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ 
  options, 
  filename, 
  trigger,
  onExport 
}) => {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportData(format, { ...options, filename });
      onExport?.(format);
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'excel' as ExportFormat,
      label: 'Excel (.xlsx)',
      description: 'Best for data analysis and manipulation',
      icon: FileSpreadsheet,
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      description: 'Universal format, works with most applications',
      icon: File,
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      description: 'Best for printing and sharing',
      icon: FileText,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose the format you want to export your data in.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="space-y-3">
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    format === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFormat(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-start gap-3 flex-1">
                    <option.icon className={`h-5 w-5 mt-0.5 ${
                      format === option.value ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
