import React, { useState, useEffect, useRef } from 'react';

function SearchableSelect({ options = [], value, onChange, placeholder, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const wrapperRef = useRef(null);

  // Filter options when search term changes
  useEffect(() => {
    if (!options || options.length === 0) {
      setFilteredOptions([]);
      return;
    }
    
    if (searchTerm) {
      setFilteredOptions(
        options.filter(option => 
          option.name && option.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedId) => {
    onChange(selectedId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options?.find(opt => opt.id === value);

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-gray-700 mb-2 font-semibold">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white flex justify-between items-center"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.name : placeholder || 'Select...'}
        </span>
        <span className="text-gray-400">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`px-3 py-2 hover:bg-blue-50 cursor-pointer ${
                    value === option.id ? 'bg-blue-100' : ''
                  }`}
                >
                  {option.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;