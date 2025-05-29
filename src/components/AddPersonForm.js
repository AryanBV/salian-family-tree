import React, { useState } from 'react';

const AddPersonForm = ({ isOpen, onClose, onAddPerson, selectedParent, familyData }) => {
  const [formData, setFormData] = useState({
    name: '',
    birthYear: '',
    deathYear: '',
    location: '',
    gender: 'female',
    spouse: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    // Generate new ID
    const newId = familyData.length > 0 ? Math.max(...familyData.map(p => p.id)) + 1 : 1;
    
    // Determine if this person is part of main lineage
    const isMainLineage = selectedParent ? 
      (selectedParent.gender === 'female' && formData.gender === 'female') : 
      (formData.gender === 'female');

    const newPerson = {
      id: newId,
      name: formData.name,
      birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
      deathYear: formData.deathYear ? parseInt(formData.deathYear) : null,
      location: formData.location,
      gender: formData.gender,
      parentId: selectedParent ? selectedParent.id : null,
      isMainLineage,
      spouse: formData.spouse || null
    };

    onAddPerson(newPerson);
    
    // Reset form
    setFormData({
      name: '',
      birthYear: '',
      deathYear: '',
      location: '',
      gender: 'female',
      spouse: ''
    });
    
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      birthYear: '',
      deathYear: '',
      location: '',
      gender: 'female',
      spouse: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          Add New Family Member
          {selectedParent && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal', marginTop: '0.25rem' }}>
              Child of: {selectedParent.name}
            </div>
          )}
        </h2>
        
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Birth Year</label>
            <input
              type="number"
              name="birthYear"
              value={formData.birthYear}
              onChange={handleInputChange}
              className="form-input"
              min="1800"
              max="2024"
              placeholder="e.g., 1970"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Death Year</label>
            <input
              type="number"
              name="deathYear"
              value={formData.deathYear}
              onChange={handleInputChange}
              className="form-input"
              min="1800"
              max="2024"
              placeholder="Leave empty if living"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Mumbai, Bangalore"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Spouse (Optional)</label>
            <input
              type="text"
              name="spouse"
              value={formData.spouse}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Spouse name"
            />
          </div>
        </div>

        {selectedParent && selectedParent.gender === 'female' && formData.gender === 'female' && (
          <div style={{ 
            background: '#dbeafe', 
            border: '1px solid #3b82f6', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            <strong>Main Lineage:</strong> This person will be part of the main Salian lineage and can pass the family name to daughters.
          </div>
        )}

        <div className="button-group">
          <button
            onClick={handleSubmit}
            className="button-primary"
          >
            Add Person
          </button>
          <button
            onClick={handleClose}
            className="button-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPersonForm;