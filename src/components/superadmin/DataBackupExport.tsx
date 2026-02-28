import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Database, Users, GraduationCap, CreditCard, Calendar, FileSpreadsheet, Archive } from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";

interface School {
  id: string;
  name: string;
}

const EXPORT_MODULES = [
  { key: "students", label: "Students", icon: GraduationCap, table: "students" },
  { key: "staff", label: "Staff", icon: Users, table: "staff" },
  { key: "fee_payments", label: "Fee Payments", icon: CreditCard, table: "fee_payments" },
  { key: "attendance", label: "Attendance", icon: Calendar, table: "attendance" },
  { key: "grades", label: "Grades", icon: FileSpreadsheet, table: "grades" },
  { key: "classes", label: "Classes", icon: Database, table: "classes" },
];

export function DataBackupExport() {
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedModules, setSelectedModules] = useState<string[]>(["students", "staff"]);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as School[];
    },
  });

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key)
        ? prev.filter(m => m !== key)
        : [...prev, key]
    );
  };

  const exportData = async () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const totalSteps = selectedModules.length;

      for (let i = 0; i < selectedModules.length; i++) {
        const moduleKey = selectedModules[i];
        const module = EXPORT_MODULES.find(m => m.key === moduleKey);
        if (!module) continue;

        setExportProgress(((i + 0.5) / totalSteps) * 100);

        let data: Record<string, unknown>[] | null = null;
        let error: Error | null = null;

        // Fetch data based on module type with proper typing
        try {
          if (module.table === "students") {
            const result = await supabase.from("students").select("*");
            if (selectedSchool !== "all") {
              const filtered = await supabase.from("students").select("*").eq("school_id", selectedSchool);
              data = filtered.data;
              error = filtered.error;
            } else {
              data = result.data;
              error = result.error;
            }
          } else if (module.table === "staff") {
            const result = selectedSchool !== "all" 
              ? await supabase.from("staff").select("*").eq("school_id", selectedSchool)
              : await supabase.from("staff").select("*");
            data = result.data;
            error = result.error;
          } else if (module.table === "classes") {
            const result = selectedSchool !== "all"
              ? await supabase.from("classes").select("*").eq("school_id", selectedSchool)
              : await supabase.from("classes").select("*");
            data = result.data;
            error = result.error;
          } else if (module.table === "fee_payments") {
            const result = await supabase.from("fee_payments").select("*");
            data = result.data;
            error = result.error;
          } else if (module.table === "attendance") {
            const result = await supabase.from("attendance").select("*");
            data = result.data;
            error = result.error;
          } else if (module.table === "grades") {
            const result = await supabase.from("grades").select("*");
            data = result.data;
            error = result.error;
          }
        } catch (e) {
          console.error(`Error fetching ${module.label}:`, e);
          continue;
        }

        if (error) {
          console.error(`Error exporting ${module.label}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          // Create worksheet
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, module.label);

          // Generate file
          const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
          zip.file(`${module.label}.xlsx`, excelBuffer);
        }

        setExportProgress(((i + 1) / totalSteps) * 100);
      }

      // Generate metadata file
      const metadata = {
        exportedAt: new Date().toISOString(),
        school: selectedSchool === "all" ? "All Schools" : schools?.find(s => s.id === selectedSchool)?.name,
        modules: selectedModules,
        recordCounts: {},
      };
      zip.file("_metadata.json", JSON.stringify(metadata, null, 2));

      // Download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `school-backup-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportSingleModule = async (moduleKey: string) => {
    const module = EXPORT_MODULES.find(m => m.key === moduleKey);
    if (!module) return;

    try {
      let data: Record<string, unknown>[] | null = null;
      let error: Error | null = null;

      if (module.table === "students") {
        const result = selectedSchool !== "all"
          ? await supabase.from("students").select("*").eq("school_id", selectedSchool)
          : await supabase.from("students").select("*");
        data = result.data;
        error = result.error;
      } else if (module.table === "staff") {
        const result = selectedSchool !== "all"
          ? await supabase.from("staff").select("*").eq("school_id", selectedSchool)
          : await supabase.from("staff").select("*");
        data = result.data;
        error = result.error;
      } else if (module.table === "classes") {
        const result = selectedSchool !== "all"
          ? await supabase.from("classes").select("*").eq("school_id", selectedSchool)
          : await supabase.from("classes").select("*");
        data = result.data;
        error = result.error;
      } else if (module.table === "fee_payments") {
        const result = await supabase.from("fee_payments").select("*");
        data = result.data;
        error = result.error;
      } else if (module.table === "attendance") {
        const result = await supabase.from("attendance").select("*");
        data = result.data;
        error = result.error;
      } else if (module.table === "grades") {
        const result = await supabase.from("grades").select("*");
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info("No data to export");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, module.label);

      XLSX.writeFile(workbook, `${module.label}-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${module.label} exported successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export ${module.label}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Backup & Export</h2>
        <p className="text-muted-foreground">Export school data for backup or analysis</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Bulk Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Bulk Export
            </CardTitle>
            <CardDescription>Export multiple modules as a ZIP archive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select School</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Select Modules</Label>
              <div className="grid grid-cols-2 gap-3">
                {EXPORT_MODULES.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.key}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModules.includes(module.key)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleModule(module.key)}
                    >
                      <Checkbox
                        checked={selectedModules.includes(module.key)}
                        onCheckedChange={() => toggleModule(module.key)}
                      />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{module.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Exporting... {Math.round(exportProgress)}%
                </p>
              </div>
            )}

            <Button
              onClick={exportData}
              disabled={isExporting || selectedModules.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Selected Modules"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Quick Export
            </CardTitle>
            <CardDescription>Export individual modules as Excel files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {EXPORT_MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <Button
                    key={module.key}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => exportSingleModule(module.key)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    Export {module.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Your recent data export activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Export history will appear here</p>
            <p className="text-sm">Exports are processed locally and not stored on the server</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
