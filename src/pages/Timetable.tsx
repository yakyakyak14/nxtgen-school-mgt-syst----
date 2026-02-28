import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DAYS_OF_WEEK } from '@/lib/constants';

const Timetable: React.FC = () => {
  const periods = [
    { time: '8:00 - 8:45', label: 'Period 1' },
    { time: '8:45 - 9:30', label: 'Period 2' },
    { time: '9:30 - 10:15', label: 'Period 3' },
    { time: '10:15 - 10:45', label: 'Break' },
    { time: '10:45 - 11:30', label: 'Period 4' },
    { time: '11:30 - 12:15', label: 'Period 5' },
    { time: '12:15 - 1:00', label: 'Period 6' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable</h1>
          <p className="page-subtitle">View and manage class schedules</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Schedule
            </CardTitle>
            <Select defaultValue="primary_3">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary_3">Primary 3A</SelectItem>
                <SelectItem value="jss_1">JSS 1A</SelectItem>
                <SelectItem value="ss_2">SS 2A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left bg-muted/50 rounded-tl-lg">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Time
                  </th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day.value} className="p-3 text-center bg-muted/50 last:rounded-tr-lg">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3 bg-muted/30">
                      <div className="text-sm font-medium">{period.label}</div>
                      <div className="text-xs text-muted-foreground">{period.time}</div>
                    </td>
                    {DAYS_OF_WEEK.map((day) => (
                      <td key={day.value} className="p-3 text-center border-l border-border">
                        {period.label === 'Break' ? (
                          <span className="text-muted-foreground text-sm">Break</span>
                        ) : (
                          <div className="text-sm">-</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timetable;
