import React, { useState } from 'react';
import { Filter, Download, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { mockCampaigns, platformOptions } from '../../data/mockData';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  onRefresh: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange, onExport, onRefresh }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date(),
  ]);

  const handlePlatformToggle = (platform: string) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter(p => p !== platform)
      : [...selectedPlatforms, platform];
    setSelectedPlatforms(newPlatforms);
    onFilterChange({ platforms: newPlatforms });
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    setDateRange(dates);
    onFilterChange({ dateRange: dates });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="medium"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
          <Button
            variant="ghost"
            size="medium"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={onRefresh}
          >
            Atualizar
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="medium" icon={<Download className="w-4 h-4" />} onClick={() => onExport('csv')}>CSV</Button>
          <Button variant="outline" size="medium" icon={<Download className="w-4 h-4" />} onClick={() => onExport('pdf')}>PDF</Button>
        </div>
      </div>
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plataformas</label>
            <div className="space-y-2">
              {platformOptions.map(platform => (
                <label key={platform.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.value)}
                    onChange={() => handlePlatformToggle(platform.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{platform.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <DatePicker
              selectsRange
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              dateFormat="dd/MM/yyyy"
            />
          </div>
        </div>
      )}
    </div>
  );
};
