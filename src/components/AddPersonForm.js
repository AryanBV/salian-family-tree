import React, { useState, useEffect } from 'react';

const AddPersonForm = ({ 
  isOpen, 
  onClose, 
  onAddPerson, 
  selectedParent, 
  familyData,
  editingPerson,
  isEditing = false,
  addingParentFor
}) => {
  const [formData, setFormData] = useState({
    name: '',
    birthYear: '',
    deathYear: '',
    location: '',
    gender: 'female',
    spouse: ''
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditing && editingPerson) {
      setFormData({
        name: editingPerson.name || '',
        birthYear: editingPerson.birthYear ? editingPerson.birthYear.toString() : '',
        deathYear: editingPerson.deathYear ? editingPerson.deathYear.toString() : '',
        location: editingPerson.location || '',
        gender: editingPerson.gender || 'female',
        spouse: editingPerson.spouse || ''
      });
    } else {
      // Reset form for adding new person
      setFormData({
        name: '',
        birthYear: '',
        deathYear: '',
        location: '',
        gender: 'female',
        spouse: ''
      });
    }
  }, [isEditing, editingPerson, isOpen]);

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

    if (isEditing) {
      // Update existing person
      const updatedPerson = {
        ...editingPerson,
        name: formData.name,
        birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
        deathYear: formData.deathYear ? parseInt(formData.deathYear) : null,
        location: formData.location,
        gender: formData.gender,
        spouse: formData.spouse || null,
        // Recalculate main lineage status if gender changed
        isMainLineage: (() => {
          if (editingPerson.parentId) {
            const parent = familyData.find(p => p.id === editingPerson.parentId);
            return parent && parent.gender === 'female' && formData.gender === 'female';
          }
          return formData.gender === 'female';
        })()
      };

      onAddPerson(updatedPerson);
    } else {
      // Add new person
      const isMainLineage = selectedParent ? 
        (selectedParent.gender === 'female' && formData.gender === 'female') : 
        (formData.gender === 'female');

      const newPerson = {
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
    }
    
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

  const willBeMainLineage = () => {
    if (isEditing) {
      if (editingPerson.parentId) {
        const parent = familyData.find(p => p.id === editingPerson.parentId);
        return parent && parent.gender === 'female' && formData.gender === 'female';
      }
      return formData.gender === 'female';
    } else if (addingParentFor) {
      // When adding a parent, the parent determines the child's lineage status
      return formData.gender === 'female' && addingParentFor.gender === 'female';
    } else {
      return selectedParent ? 
        (selectedParent.gender === 'female' && formData.gender === 'female') : 
        (formData.gender === 'female');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          {isEditing ? `Edit ${editingPerson?.name}` : 
           addingParentFor ? `Add Parent for ${addingParentFor.name}` : 
           'Add New Family Member'}
          {!isEditing && !addingParentFor && selectedParent && (
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
              max="2025"
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
              max="2025"
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

        {/* Main lineage indicator */}
        {willBeMainLineage() && (
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

        {/* Warning for changing parent's gender */}
        {isEditing && editingPerson && formData.gender !== editingPerson.gender && (
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            <strong>Note:</strong> Changing gender may affect main lineage status and family tree relationships.
          </div>
        )}

        {/* Death year validation */}
        {formData.birthYear && formData.deathYear && parseInt(formData.deathYear) <= parseInt(formData.birthYear) && (
          <div style={{ 
            background: '#fee2e2', 
            border: '1px solid #dc2626', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#dc2626'
          }}>
            <strong>Error:</strong> Death year must be after birth year.
          </div>
        )}

        <div className="button-group">
          <button
            onClick={handleSubmit}
            className="button-primary"
            disabled={formData.birthYear && formData.deathYear && parseInt(formData.deathYear) <= parseInt(formData.birthYear)}
          >
            {isEditing ? 'Update Person' : addingParentFor ? 'Add Parent' : 'Add Person'}
          </button>
          <button
            onClick={handleClose}
            className="button-secondary"
          >
            Cancel
          </button>
        </div>

        {/* Help text */}
        <div style={{ 
          marginTop: '1rem', 
          fontSize: '0.75rem', 
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem'
        }}>
          <strong>Tip:</strong> In the Salian family tradition, the family name passes from mother to daughter. 
          Women who carry the Salian name forward are highlighted as "Main Lineage" members.
          {addingParentFor && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Adding Parent:</strong> This person will become the parent of {addingParentFor.name}. 
              The child's lineage status may be updated accordingly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPersonForm;